// Vice Metropolis - Raw WebGL Renderer and Matrix Helpers

export class Matrix4 {
  static perspective(fov, aspect, near, far) {
    const f = 1.0 / Math.tan(fov / 2);
    const rangeInv = 1 / (near - far);
    return [
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (near + far) * rangeInv, -1,
      0, 0, near * far * rangeInv * 2, 0
    ];
  }

  static lookAt(eye, center, up) {
    const z0 = eye[0] - center[0], z1 = eye[1] - center[1], z2 = eye[2] - center[2];
    let len = Math.hypot(z0, z1, z2);
    const zx = z0 / len, zy = z1 / len, zz = z2 / len;

    const x0 = up[1] * zz - up[2] * zy, x1 = up[2] * zx - up[0] * zz, x2 = up[0] * zy - up[1] * zx;
    len = Math.hypot(x0, x1, x2);
    const xx = x0 / len, xy = x1 / len, xz = x2 / len;

    const y0 = zy * xz - zz * xy, y1 = zz * xx - zx * xz, y2 = zx * xy - zy * xx;

    return [
      xx, y0, zx, 0,
      xy, y1, zy, 0,
      xz, y2, zz, 0,
      -(xx * eye[0] + xy * eye[1] + xz * eye[2]),
      -(y0 * eye[0] + y1 * eye[1] + y2 * eye[2]),
      -(zx * eye[0] + zy * eye[1] + zz * eye[2]),
      1
    ];
  }

  static multiply(a, b) {
    const out = new Array(16);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        out[i * 4 + j] =
          b[i * 4 + 0] * a[0 * 4 + j] +
          b[i * 4 + 1] * a[1 * 4 + j] +
          b[i * 4 + 2] * a[2 * 4 + j] +
          b[i * 4 + 3] * a[3 * 4 + j];
      }
    }
    return out;
  }

  static translation(x, y, z) {
    return [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      x, y, z, 1
    ];
  }

  static rotationY(angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    return [
      c, 0, -s, 0,
      0, 1, 0, 0,
      s, 0, c, 0,
      0, 0, 0, 1
    ];
  }

  static scaling(x, y, z) {
    return [
      x, 0, 0, 0,
      0, y, 0, 0,
      0, 0, z, 0,
      0, 0, 0, 1
    ];
  }
}

export class Renderer {
  constructor(canvas, minimapCanvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl');
    this.minimapCtx = minimapCanvas.getContext('2d');
    
    if (!this.gl) {
      alert('WebGL not supported!');
    }

    this.initShaders();
    this.initBuffers();
  }

  initShaders() {
    const gl = this.gl;
    const vsSource = `
      attribute vec4 aPosition;
      attribute vec3 aNormal;
      attribute vec3 aColor;
      uniform mat4 uProjectionMatrix;
      uniform mat4 uModelViewMatrix;
      varying vec3 vColor;
      varying vec3 vNormal;
      void main() {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aPosition;
        vColor = aColor;
        vNormal = aNormal;
      }
    `;

    const fsSource = `
      precision mediump float;
      varying vec3 vColor;
      varying vec3 vNormal;
      void main() {
        // Directional light and ambient minimum for clear city visibility
        vec3 lightDir = normalize(vec3(0.6, 1.0, 0.5));
        float diff = max(dot(normalize(vNormal), lightDir), 0.45);
        gl_FragColor = vec4(vColor * diff, 1.0);
      }
    `;

    const createShader = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };

    const vs = createShader(gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl.FRAGMENT_SHADER, fsSource);
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    this.program = program;
    this.attribLocations = {
      position: gl.getAttribLocation(program, 'aPosition'),
      normal: gl.getAttribLocation(program, 'aNormal'),
      color: gl.getAttribLocation(program, 'aColor'),
    };
    this.uniformLocations = {
      projectionMatrix: gl.getUniformLocation(program, 'uProjectionMatrix'),
      modelViewMatrix: gl.getUniformLocation(program, 'uModelViewMatrix'),
    };
  }

  initBuffers() {
    const gl = this.gl;
    const positions = [
      // Front
      -0.5, -0.5,  0.5,  0.5, -0.5,  0.5,  0.5,  0.5,  0.5, -0.5,  0.5,  0.5,
      // Back
      -0.5, -0.5, -0.5, -0.5,  0.5, -0.5,  0.5,  0.5, -0.5,  0.5, -0.5, -0.5,
      // Top
      -0.5,  0.5, -0.5, -0.5,  0.5,  0.5,  0.5,  0.5,  0.5,  0.5,  0.5, -0.5,
      // Bottom
      -0.5, -0.5, -0.5,  0.5, -0.5, -0.5,  0.5, -0.5,  0.5, -0.5, -0.5,  0.5,
      // Right
       0.5, -0.5, -0.5,  0.5,  0.5, -0.5,  0.5,  0.5,  0.5,  0.5, -0.5,  0.5,
      // Left
      -0.5, -0.5, -0.5, -0.5, -0.5,  0.5, -0.5,  0.5,  0.5, -0.5,  0.5, -0.5,
    ];

    const normals = [
       0,  0,  1,  0,  0,  1,  0,  0,  1,  0,  0,  1,
       0,  0, -1,  0,  0, -1,  0,  0, -1,  0,  0, -1,
       0,  1,  0,  0,  1,  0,  0,  1,  0,  0,  1,  0,
       0, -1,  0,  0, -1,  0,  0, -1,  0,  0, -1,  0,
       1,  0,  0,  1,  0,  0,  1,  0,  0,  1,  0,  0,
      -1,  0,  0, -1,  0,  0, -1,  0,  0, -1,  0,  0,
    ];

    const indices = [
       0,  1,  2,    0,  2,  3,
       4,  5,  6,    4,  6,  7,
       8,  9, 10,    8, 10, 11,
      12, 13, 14,   12, 14, 15,
      16, 17, 18,   16, 18, 19,
      20, 21, 22,   20, 22, 23,
    ];

    this.cubeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.cubeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    this.normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

    this.indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
  }

  render(world, player, camera) {
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0.12, 0.15, 0.25, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    gl.useProgram(this.program);

    const aspect = this.canvas.width / this.canvas.height;
    const projectionMatrix = Matrix4.perspective(Math.PI / 3, aspect, 0.1, 1000.0);
    const viewMatrix = Matrix4.lookAt(
      [camera.x, camera.y, camera.z],
      [camera.cx, camera.cy, camera.cz],
      [0, 1, 0]
    );

    gl.uniformMatrix4fv(this.uniformLocations.projectionMatrix, false, new Float32Array(projectionMatrix));

    // Draw Ground
    const groundMatrix = Matrix4.multiply(
      Matrix4.translation(0, -0.1, 0),
      Matrix4.scaling(400, 0.2, 400)
    );
    let mvMatrix = Matrix4.multiply(viewMatrix, groundMatrix);
    gl.uniformMatrix4fv(this.uniformLocations.modelViewMatrix, false, new Float32Array(mvMatrix));
    this.drawCube([0.18, 0.18, 0.22]);

    // Draw Buildings
    for (const b of world.buildings) {
      const modelMatrix = Matrix4.multiply(
        Matrix4.translation(b.x, b.height / 2, b.z),
        Matrix4.scaling(b.width, b.height, b.depth)
      );
      mvMatrix = Matrix4.multiply(viewMatrix, modelMatrix);
      gl.uniformMatrix4fv(this.uniformLocations.modelViewMatrix, false, new Float32Array(mvMatrix));
      this.drawCube(b.color);
    }

    // Draw Streetlights
    for (const sl of world.streetlights) {
      const modelMatrix = Matrix4.multiply(
        Matrix4.translation(sl.x, 3.0, sl.z),
        Matrix4.scaling(0.4, 6.0, 0.4)
      );
      mvMatrix = Matrix4.multiply(viewMatrix, modelMatrix);
      gl.uniformMatrix4fv(this.uniformLocations.modelViewMatrix, false, new Float32Array(mvMatrix));
      this.drawCube([0.6, 0.6, 0.6]);
    }

    // Draw Traffic Cars
    for (const car of world.trafficCars) {
      const modelMatrix = Matrix4.multiply(
        Matrix4.multiply(
          Matrix4.translation(car.x, 0.75, car.z),
          Matrix4.rotationY(car.angle)
        ),
        Matrix4.scaling(2.2, 1.4, 4.0)
      );
      mvMatrix = Matrix4.multiply(viewMatrix, modelMatrix);
      gl.uniformMatrix4fv(this.uniformLocations.modelViewMatrix, false, new Float32Array(mvMatrix));
      this.drawCube(car.color);
    }

    // Draw Police Cars
    for (const pcar of world.policeCars) {
      if (!pcar.active) continue;
      const modelMatrix = Matrix4.multiply(
        Matrix4.multiply(
          Matrix4.translation(pcar.x, 0.75, pcar.z),
          Matrix4.rotationY(pcar.angle)
        ),
        Matrix4.scaling(2.4, 1.4, 4.2)
      );
      mvMatrix = Matrix4.multiply(viewMatrix, modelMatrix);
      gl.uniformMatrix4fv(this.uniformLocations.modelViewMatrix, false, new Float32Array(mvMatrix));
      this.drawCube([0.1, 0.3, 0.9]);
    }

    // Draw Player / Player Car
    const pMatrix = Matrix4.multiply(
      Matrix4.multiply(
        Matrix4.translation(player.x, player.inCar ? 0.75 : 1.0, player.z),
        Matrix4.rotationY(player.angle)
      ),
      player.inCar ? Matrix4.scaling(2.2, 1.4, 4.0) : Matrix4.scaling(0.8, 1.8, 0.8)
    );
    mvMatrix = Matrix4.multiply(viewMatrix, pMatrix);
    gl.uniformMatrix4fv(this.uniformLocations.modelViewMatrix, false, new Float32Array(mvMatrix));
    this.drawCube(player.inCar ? [0.9, 0.1, 0.2] : [0.9, 0.8, 0.2]);

    // Render minimap
    this.renderMinimap(world, player);
  }

  drawCube(color) {
    const gl = this.gl;
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.cubeBuffer);
    gl.enableVertexAttribArray(this.attribLocations.position);
    gl.vertexAttribPointer(this.attribLocations.position, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.enableVertexAttribArray(this.attribLocations.normal);
    gl.vertexAttribPointer(this.attribLocations.normal, 3, gl.FLOAT, false, 0, 0);

    const colors = [];
    for (let i = 0; i < 24; i++) colors.push(...color);
    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(this.attribLocations.color);
    gl.vertexAttribPointer(this.attribLocations.color, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
  }

  renderMinimap(world, player) {
    const ctx = this.minimapCtx;
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.save();
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#444';
    for (const b of world.buildings) {
      const mx = w / 2 + (b.x - player.x) * 1.5;
      const mz = h / 2 + (b.z - player.z) * 1.5;
      ctx.fillRect(mx - 4, mz - 4, 8, 8);
    }

    ctx.fillStyle = '#ff0';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
