(() => {
  // ====== Init & WebGL Context ======
  const canvas = document.getElementById('glcanvas');
  const gl = canvas.getContext('webgl', { antialias: true });
  if (!gl) { alert('WebGL tidak didukung di browser ini'); return; }

  // Resize handling: match device pixel ratio for sharper rendering
  function resizeCanvasToDisplaySize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const displayWidth = Math.floor(canvas.clientWidth * dpr);
    const displayHeight = Math.floor(canvas.clientHeight * dpr);
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
      // update projection on resize
      mat4.perspective(proj, Math.PI/3, canvas.width / canvas.height, 0.1, 100.0);
      gl.uniformMatrix4fv(loc.u_proj, false, proj);
    }
  }
  window.addEventListener('resize', resizeCanvasToDisplaySize);

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.06, 0.06, 0.08, 1.0);

  // ====== Shader Compile/Link ======
  function compileShader(src, type) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(sh));
      throw new Error('Shader compile error');
    }
    return sh;
  }
  function createProgram(vsSrc, fsSrc) {
    const vs = compileShader(vsSrc, gl.VERTEX_SHADER);
    const fs = compileShader(fsSrc, gl.FRAGMENT_SHADER);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog));
      throw new Error('Program link error');
    }
    return prog;
  }

  const vsSrc = document.getElementById('vs').textContent;
  const fsSrc = document.getElementById('fs').textContent;
  const prog = createProgram(vsSrc, fsSrc);
  gl.useProgram(prog);

  // ====== Locations ======
  const loc = {
    a_position: gl.getAttribLocation(prog, 'a_position'),
    a_normal: gl.getAttribLocation(prog, 'a_normal'),
    a_texcoord: gl.getAttribLocation(prog, 'a_texcoord'),
    u_world: gl.getUniformLocation(prog, 'u_world'),
    u_view: gl.getUniformLocation(prog, 'u_view'),
    u_proj: gl.getUniformLocation(prog, 'u_proj'),
    u_normalMatrix: gl.getUniformLocation(prog, 'u_normalMatrix'),
    u_color: gl.getUniformLocation(prog, 'u_color'),
    u_lightPos: gl.getUniformLocation(prog, 'u_lightPos'),
    u_viewPos: gl.getUniformLocation(prog, 'u_viewPos'),
    u_ambient: gl.getUniformLocation(prog, 'u_ambient'),
    u_diffuseColor: gl.getUniformLocation(prog, 'u_diffuseColor'),
    u_specularColor: gl.getUniformLocation(prog, 'u_specularColor'),
    u_shininess: gl.getUniformLocation(prog, 'u_shininess'),
    u_useTexture: gl.getUniformLocation(prog, 'u_useTexture'),
    u_sampler0: gl.getUniformLocation(prog, 'u_sampler0'),
  };

  // ====== Camera & Projection ======
  const { mat4, mat3, vec3, glMatrix } = window.glMatrix;

  const view = mat4.create();
  const proj = mat4.create();
  const world = mat4.create();
  const normalMat = mat3.create();

  const eye = vec3.fromValues(0, 2.5, 8);
  const center = vec3.fromValues(0, 1.0, 0);
  const up = vec3.fromValues(0, 1, 0);
  mat4.lookAt(view, eye, center, up);
  mat4.perspective(proj, Math.PI/3, canvas.width / canvas.height, 0.1, 100.0);

  gl.uniformMatrix4fv(loc.u_view, false, view);
  gl.uniformMatrix4fv(loc.u_proj, false, proj);
  gl.uniform3fv(loc.u_viewPos, eye);

  // Lighting params
  gl.uniform3f(loc.u_lightPos, 5.0, 5.0, 5.0);
  gl.uniform3f(loc.u_ambient, 0.08, 0.08, 0.10);
  gl.uniform3f(loc.u_diffuseColor, 1.0, 1.0, 1.0);
  gl.uniform3f(loc.u_specularColor, 0.6, 0.6, 0.6);
  gl.uniform1f(loc.u_shininess, 32.0);

  // ====== Geometry ======
  function createCube() {
    // 24 unique vertices (6 faces * 4) with per-face normals
    const p = [
      // +X
      1,-1,-1,  1,-1, 1,   1, 1, 1,   1, 1,-1,
      // -X
     -1,-1, 1, -1,-1,-1,  -1, 1,-1,  -1, 1, 1,
      // +Y
     -1, 1,-1,  1, 1,-1,   1, 1, 1,  -1, 1, 1,
      // -Y
     -1,-1, 1,  1,-1, 1,   1,-1,-1,  -1,-1,-1,
      // +Z
     -1,-1, 1, -1, 1, 1,   1, 1, 1,   1,-1, 1,
      // -Z
      1,-1,-1,  1, 1,-1,  -1, 1,-1,  -1,-1,-1,
    ];
    const n = [
      1,0,0, 1,0,0, 1,0,0, 1,0,0,
     -1,0,0,-1,0,0,-1,0,0,-1,0,0,
      0,1,0, 0,1,0, 0,1,0, 0,1,0,
      0,-1,0,0,-1,0,0,-1,0,0,-1,0,
      0,0,1, 0,0,1, 0,0,1, 0,0,1,
      0,0,-1,0,0,-1,0,0,-1,0,0,-1,
    ];
    const t = [
      0,0, 1,0, 1,1, 0,1,
      0,0, 1,0, 1,1, 0,1,
      0,0, 1,0, 1,1, 0,1,
      0,0, 1,0, 1,1, 0,1,
      0,0, 1,0, 1,1, 0,1,
      0,0, 1,0, 1,1, 0,1,
    ];
    const idx = [];
    for (let f=0; f<6; f++){
      const o = f*4;
      idx.push(o, o+1, o+2,  o, o+2, o+3);
    }
    return {
      positions: new Float32Array(p),
      normals: new Float32Array(n),
      uvs: new Float32Array(t),
      indices: new Uint16Array(idx)
    };
  }

  function createSphere(latBands=24, lonBands=32, radius=1) {
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    for (let lat=0; lat<=latBands; lat++){
      const v = lat/latBands;
      const theta = v*Math.PI;
      for (let lon=0; lon<=lonBands; lon++){
        const u = lon/lonBands;
        const phi = u*2*Math.PI;
        const x = Math.sin(theta)*Math.cos(phi);
        const y = Math.cos(theta);
        const z = Math.sin(theta)*Math.sin(phi);
        positions.push(radius*x, radius*y, radius*z);
        normals.push(x, y, z);
        uvs.push(u, 1-v);
      }
    }
    for (let lat=0; lat<latBands; lat++){
      for (let lon=0; lon<lonBands; lon++){
        const a = lat*(lonBands+1) + lon;
        const b = a + lonBands + 1;
        indices.push(a, b, a+1,  b, b+1, a+1);
      }
    }
    return {
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      uvs: new Float32Array(uvs),
      indices: new Uint16Array(indices)
    };
  }

  function createMesh(data) {
    const vao = {};
    // interleave pos+normal+uv
    const interleaved = new Float32Array((data.positions.length/3) * 8);
    for (let i=0, j=0; i<data.positions.length/3; i++, j+=8) {
      interleaved[j]   = data.positions[i*3];
      interleaved[j+1] = data.positions[i*3+1];
      interleaved[j+2] = data.positions[i*3+2];
      interleaved[j+3] = data.normals[i*3];
      interleaved[j+4] = data.normals[i*3+1];
      interleaved[j+5] = data.normals[i*3+2];
      interleaved[j+6] = data.uvs[i*2];
      interleaved[j+7] = data.uvs[i*2+1];
    }
    vao.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vao.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, interleaved, gl.STATIC_DRAW);
    vao.indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vao.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data.indices, gl.STATIC_DRAW);
    vao.count = data.indices.length;
    vao.stride = 8 * 4;
    vao.posOff = 0;
    vao.normOff = 3 * 4;
    vao.uvOff = 6 * 4;
    return vao;
  }

  const cubeMesh = createMesh(createCube());
  const sphereMesh = createMesh(createSphere(24, 32, 1));

  function bindAndDraw(mesh) {
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexBuffer);
    gl.vertexAttribPointer(loc.a_position, 3, gl.FLOAT, false, mesh.stride, mesh.posOff);
    gl.enableVertexAttribArray(loc.a_position);
    gl.vertexAttribPointer(loc.a_normal, 3, gl.FLOAT, false, mesh.stride, mesh.normOff);
    gl.enableVertexAttribArray(loc.a_normal);
    gl.vertexAttribPointer(loc.a_texcoord, 2, gl.FLOAT, false, mesh.stride, mesh.uvOff);
    gl.enableVertexAttribArray(loc.a_texcoord);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
    gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
  }

  // ====== Texture (opsional) ======
  const texImg = document.getElementById('texImage');
  const texture = gl.createTexture();
  let textureReady = false;
  function uploadTexture() {
    if (!texImg || !texImg.complete) return;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texImg);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      textureReady = true;
    } catch (e) {
      console.warn('Texture tidak bisa dimuat (CORS atau file tidak ada).', e);
      textureReady = false;
    }
  }
  if (texImg) {
    if (texImg.complete) uploadTexture();
    else texImg.onload = uploadTexture;
  }

  // ====== Matrix Stack ======
  let model = mat4.create();
  const stack = [];
  function push() { stack.push(mat4.clone(model)); }
  function pop() { model = stack.pop(); }

  function setWorldAndColor(color, useTex) {
    gl.uniformMatrix4fv(loc.u_world, false, model);
    mat3.normalFromMat4(normalMat, model);
    gl.uniformMatrix3fv(loc.u_normalMatrix, false, normalMat);
    gl.uniform3fv(loc.u_color, color);
    gl.uniform1i(loc.u_useTexture, useTex && textureReady ? 1 : 0);
    if (useTex && textureReady) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(loc.u_sampler0, 0);
    }
  }

  // ====== Animation Controls ======
  let running = true;
  let cagePitch = 0.0;         // radians
  let texEnabled = true;
  let lightingEnabled = true;

  const yawMax = glMatrix.toRadian(30); // ±30°
  const yawSpeed = 0.8;        // Hz
  const bladeRPM = 180;        // rotations per minute
  let bladeAngle = 0;

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') running = !running;
    if (e.key === '[') cagePitch -= glMatrix.toRadian(3);
    if (e.key === ']') cagePitch += glMatrix.toRadian(3);
    if (e.key.toLowerCase() === 't') texEnabled = !texEnabled;
    if (e.key.toLowerCase() === 'l') {
      lightingEnabled = !lightingEnabled;
      if (lightingEnabled) {
        gl.uniform3f(loc.u_ambient, 0.08, 0.08, 0.10);
        gl.uniform3f(loc.u_diffuseColor, 1.0, 1.0, 1.0);
        gl.uniform3f(loc.u_specularColor, 0.6, 0.6, 0.6);
      } else {
        gl.uniform3f(loc.u_ambient, 1.0, 1.0, 1.0);
        gl.uniform3f(loc.u_diffuseColor, 0.0, 0.0, 0.0);
        gl.uniform3f(loc.u_specularColor, 0.0, 0.0, 0.0);
      }
    }
  });

  // ====== Draw Fan (Hierarchical) ======
  function drawFan(timeSec, dt) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    mat4.identity(model);

    // ---- Arm1: osilasi yaw ----
    const armLen = 2.5, armThick = 0.12;
    const yaw = Math.sin(timeSec * 2.0 * Math.PI * yawSpeed) * yawMax;

    push();
      // base/pole (opsional)
      push();
        mat4.translate(model, model, [0, -0.6, 0]);
        mat4.scale(model, model, [0.15, 0.6, 0.15]);
        setWorldAndColor([0.25,0.25,0.28], false);
        bindAndDraw(cubeMesh);
      pop();

      // pivot arm di (0,1,0)
      mat4.translate(model, model, [0, 1.0, 0]);
      mat4.rotateY(model, model, yaw);

      // arm sebagai box sepanjang +Z
      push();
        mat4.translate(model, model, [0, 0, armLen/2]);
        mat4.scale(model, model, [armThick, armThick, armLen]);
        setWorldAndColor([0.7,0.7,0.75], false);
        bindAndDraw(cubeMesh);
      pop();

      // ---- Cage/Housing: pitch ----
      mat4.translate(model, model, [0, 0, armLen]);
      mat4.rotateX(model, model, cagePitch);

      // Cage (sphere) – bisa diganti grid kawat nanti
      const cageRadius = 0.8;
      push();
        mat4.scale(model, model, [cageRadius, cageRadius, cageRadius]);
        setWorldAndColor([0.45,0.48,0.52], texEnabled);
        bindAndDraw(sphereMesh);
      pop();

      // ---- Hub + Blades: roll spin ----
      // hub kecil
      push();
        const hubScale = [0.18, 0.18, 0.18];
        mat4.scale(model, model, hubScale);
        setWorldAndColor([0.2,0.2,0.22], false);
        bindAndDraw(cubeMesh);
      pop();

      // blades spin
      if (running) {
        bladeAngle += dt * (bladeRPM/60) * 2*Math.PI;
      }
      push();
        mat4.rotateZ(model, model, bladeAngle);

        const bladeCount = 3;
        const bladeLen = 1.1;
        const bladeWid = 0.25;
        for (let i=0;i<bladeCount;i++){
          push();
            const theta = i * (2*Math.PI/bladeCount);
            mat4.rotateZ(model, model, theta);
            mat4.translate(model, model, [bladeLen*0.6, 0, 0]); // sepanjang X
            mat4.scale(model, model, [bladeLen, bladeWid, 0.06]);
            setWorldAndColor([0.75,0.75,0.78], texEnabled);
            bindAndDraw(cubeMesh);
          pop();
        }
      pop();

    pop();
  }

  // ====== Main Loop ======
  let last = 0;
  function loop(ts) {
    resizeCanvasToDisplaySize();
    const t = ts * 0.001;
    const dt = last ? Math.min(t - last, 0.033) : 0.016;
    last = t;
    drawFan(t, dt);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

})();
