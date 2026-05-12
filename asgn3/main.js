const VSHADER_SOURCE = `
attribute vec4 a_Position;
attribute vec2 a_UV;
uniform mat4 u_ModelMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ProjectionMatrix;
varying vec2 v_UV;
void main() {
  gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
  v_UV = a_UV;
}`;

const FSHADER_SOURCE = `
precision mediump float;
uniform vec4 u_BaseColor;
uniform float u_TexColorWeight;
uniform int u_WhichTexture;
uniform sampler2D u_Sampler0;
uniform sampler2D u_Sampler1;
uniform sampler2D u_Sampler2;
uniform sampler2D u_Sampler3;
uniform sampler2D u_Sampler4;
varying vec2 v_UV;
void main() {
  vec4 texColor;
  if (u_WhichTexture == 0) texColor = texture2D(u_Sampler0, v_UV);
  else if (u_WhichTexture == 1) texColor = texture2D(u_Sampler1, v_UV);
  else if (u_WhichTexture == 2) texColor = texture2D(u_Sampler2, v_UV);
  else if (u_WhichTexture == 3) texColor = texture2D(u_Sampler3, v_UV);
  else texColor = texture2D(u_Sampler4, v_UV);
  gl_FragColor = mix(u_BaseColor, texColor, u_TexColorWeight);
}`;

const SIZE = 32;
const keys = {};
let canvas;
let gl;
let camera;
let cubeBuffer;
let a_Position;
let a_UV;
let u_ModelMatrix;
let u_ViewMatrix;
let u_ProjectionMatrix;
let u_BaseColor;
let u_TexColorWeight;
let u_WhichTexture;
let worldMap;
let textureMap;
let collected = 0;
let gameWon = false;
let gateOpen = false;
let freeRoam = false;
let lastFrameTime = 0;

const babyElephants = [
  { x: 4.5, z: 20.5, found: false },
  { x: 22.5, z: 18.5, found: false },
  { x: 25.5, z: 7.5, found: false },
];

const elephant = {
  x: 4.5,
  z: 4.5,
  speed: 0.025,
  angle: 0,
};

function main() {
  canvas = document.getElementById("webgl");
  gl = canvas.getContext("webgl", { antialias: true });
  if (!gl) throw new Error("WebGL is not available in this browser.");

  resizeCanvas();
  initShaders();
  initCubeBuffer();
  initTextures();
  camera = new Camera(canvas);
  worldMap = createWorldMap();
  textureMap = createTextureMap(worldMap);
  setupInput();

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.43, 0.72, 0.96, 1);
  showMessage("A huge elephant is loose. Find the three baby elephants, then escape through the south gate.");
  requestAnimationFrame(tick);
}

function initShaders() {
  const program = gl.createProgram();
  gl.attachShader(program, compileShader(gl.VERTEX_SHADER, VSHADER_SOURCE));
  gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, FSHADER_SOURCE));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
  }
  gl.useProgram(program);

  a_Position = gl.getAttribLocation(program, "a_Position");
  a_UV = gl.getAttribLocation(program, "a_UV");
  u_ModelMatrix = gl.getUniformLocation(program, "u_ModelMatrix");
  u_ViewMatrix = gl.getUniformLocation(program, "u_ViewMatrix");
  u_ProjectionMatrix = gl.getUniformLocation(program, "u_ProjectionMatrix");
  u_BaseColor = gl.getUniformLocation(program, "u_BaseColor");
  u_TexColorWeight = gl.getUniformLocation(program, "u_TexColorWeight");
  u_WhichTexture = gl.getUniformLocation(program, "u_WhichTexture");
  for (let i = 0; i < 5; i++) gl.uniform1i(gl.getUniformLocation(program, `u_Sampler${i}`), i);
}

function compileShader(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader));
  }
  return shader;
}

function initCubeBuffer() {
  const v = new Float32Array([
    0,0,1, 0,0, 1,0,1, 1,0, 1,1,1, 1,1, 0,0,1, 0,0, 1,1,1, 1,1, 0,1,1, 0,1,
    1,0,0, 0,0, 0,0,0, 1,0, 0,1,0, 1,1, 1,0,0, 0,0, 0,1,0, 1,1, 1,1,0, 0,1,
    0,1,1, 0,0, 1,1,1, 1,0, 1,1,0, 1,1, 0,1,1, 0,0, 1,1,0, 1,1, 0,1,0, 0,1,
    0,0,0, 0,0, 1,0,0, 1,0, 1,0,1, 1,1, 0,0,0, 0,0, 1,0,1, 1,1, 0,0,1, 0,1,
    1,0,1, 0,0, 1,0,0, 1,0, 1,1,0, 1,1, 1,0,1, 0,0, 1,1,0, 1,1, 1,1,1, 0,1,
    0,0,0, 0,0, 0,0,1, 1,0, 0,1,1, 1,1, 0,0,0, 0,0, 0,1,1, 1,1, 0,1,0, 0,1,
  ]);
  cubeBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, v, gl.STATIC_DRAW);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 20, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 20, 12);
  gl.enableVertexAttribArray(a_UV);
}

function initTextures() {
  const makers = [wallTexture, grassTexture, stoneTexture, goldTexture, barkTexture];
  const textureSources = [
    "assets/textures/wall.png",
    "assets/textures/grass.png",
    "assets/textures/stone.png",
    "assets/textures/special.png",
    "assets/textures/wood.png",
  ];
  makers.forEach((make, i) => {
    const tex = gl.createTexture();
    const imgCanvas = make();
    gl.activeTexture(gl.TEXTURE0 + i);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgCanvas);

    const image = new Image();
    image.onload = () => {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    };
    image.src = textureSources[i];
  });
}

function makeTexture(draw) {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d");
  draw(ctx, c.width, c.height);
  return c;
}

function wallTexture() {
  return makeTexture((ctx) => {
    ctx.fillStyle = "#7a6b58";
    ctx.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 32) {
      for (let x = y % 64 === 0 ? 0 : -32; x < 128; x += 64) {
        ctx.fillStyle = x % 3 ? "#8b7a64" : "#6c604f";
        ctx.fillRect(x + 2, y + 2, 60, 28);
      }
    }
    ctx.strokeStyle = "#423a31";
    ctx.lineWidth = 3;
    for (let y = 0; y <= 128; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(128, y);
      ctx.stroke();
    }
  });
}

function grassTexture() {
  return makeTexture((ctx) => {
    ctx.fillStyle = "#3f8a45";
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = i % 2 ? "#56a35a" : "#2f6f39";
      ctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 6);
    }
  });
}

function stoneTexture() {
  return makeTexture((ctx) => {
    ctx.fillStyle = "#737b83";
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = i % 2 ? "#89929a" : "#59626d";
      ctx.fillRect(Math.random() * 128, Math.random() * 128, 14, 7);
    }
  });
}

function goldTexture() {
  return makeTexture((ctx) => {
    ctx.fillStyle = "#d39421";
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = "#ffd36b";
    ctx.fillRect(18, 18, 36, 36);
    ctx.fillRect(74, 74, 30, 30);
    ctx.strokeStyle = "#8a5a0b";
    ctx.lineWidth = 5;
    ctx.strokeRect(2, 2, 124, 124);
  });
}

function barkTexture() {
  return makeTexture((ctx) => {
    ctx.fillStyle = "#6f452a";
    ctx.fillRect(0, 0, 128, 128);
    for (let x = 4; x < 128; x += 12) {
      ctx.fillStyle = x % 24 === 0 ? "#4b2d1d" : "#8a5736";
      ctx.fillRect(x, 0, 5, 128);
    }
  });
}

function createWorldMap() {
  const rows = [
    "44444444444444444444444444444444",
    "40000000000000000000000000000004",
    "40000000000000000000000000000004",
    "40000222222200000000222222200004",
    "40000200000200000000200000200004",
    "40000200000000000000200000200004",
    "40000222222200111100222222200004",
    "40000000000000000000000000000004",
    "40033333000000000000000033333004",
    "40000000000000000000000000000004",
    "40000000002000000000020000000004",
    "40000000002000111100020000000004",
    "40000000002000000000020000000004",
    "40000000000000000000000000000004",
    "40002222222220000002222222220004",
    "40002000000020000002000000020004",
    "40002000000000000000000000020004",
    "40002222222220000002222222220004",
    "40000000000000000000000000000004",
    "40000003000000011000000030000004",
    "40000003000000000000000030000004",
    "40000003333333000033333330000004",
    "40000000000000000000000000000004",
    "40022200000000000000000000222004",
    "40000000000000000000000000000004",
    "40000000022222000022222000000004",
    "40000000020000000000002000000004",
    "40000000022222000022222000000004",
    "40000000000000000000000000000004",
    "40000000000000000000000000000004",
    "44444444444444444444444444444444",
    "44444444444444444444444444444444",
  ];
  return rows.map((row) => row.split("").map((n) => Number(n)));
}

function createTextureMap(map) {
  return map.map((row, z) =>
    row.map((height, x) => {
      if (height === 0) return 0;
      return x === 0 || z === 0 || x === SIZE - 1 || z === SIZE - 1 ? 2 : 0;
    })
  );
}

function setupInput() {
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("keydown", (ev) => {
    keys[ev.key.toLowerCase()] = true;
    if ([" ", "shift"].includes(ev.key.toLowerCase())) ev.preventDefault();
    if (ev.key.toLowerCase() === "c" && !ev.repeat) toggleFreeRoam();
    if (ev.key.toLowerCase() === "f") addBlockInFront();
    if (ev.key.toLowerCase() === "r") deleteBlockInFront();
    if (ev.key.toLowerCase() === "t" && !ev.repeat) restartGame();
  });
  window.addEventListener("keyup", (ev) => {
    keys[ev.key.toLowerCase()] = false;
  });
  canvas.addEventListener("click", () => canvas.requestPointerLock());
  window.addEventListener("mousemove", (ev) => {
    if (document.pointerLockElement === canvas) camera.look(ev.movementX * 0.14, -ev.movementY * 0.14);
    else if (ev.buttons === 1) camera.look(ev.movementX * 0.12, -ev.movementY * 0.12);
  });
}

function tick(time) {
  const dt = Math.min(32, time - lastFrameTime);
  lastFrameTime = time;
  handleMovement(dt / 16.67);
  updateChasingElephant(dt / 16.67);
  renderScene(time * 0.001);
  checkStoryProgress();
  requestAnimationFrame(tick);
}

function handleMovement(scale) {
  const oldEye = new Vector3(camera.eye);
  const oldAt = new Vector3(camera.at);
  const speed = camera.speed * scale;
  if (freeRoam) {
    handleFreeRoamMovement(speed);
  } else {
    if (keys.w) camera.moveForward(speed);
    if (keys.s) camera.moveBackwards(speed);
    if (keys.a) camera.moveLeft(speed);
    if (keys.d) camera.moveRight(speed);
  }
  if (keys.q) camera.panLeft(camera.turnSpeed * scale);
  if (keys.e) camera.panRight(camera.turnSpeed * scale);
  if (!freeRoam && isBlocked(camera.eye.elements[0], camera.eye.elements[2])) {
    camera.eye.set(oldEye);
    camera.at.set(oldAt);
    camera.updateMatrices();
  }
}

function handleFreeRoamMovement(speed) {
  if (keys.w) moveCameraBy(camera.forwardVector().mul(speed));
  if (keys.s) moveCameraBy(camera.forwardVector().mul(-speed));
  if (keys.a) moveCameraBy(Vector3.cross(camera.up, camera.forwardVector()).normalize().mul(speed));
  if (keys.d) moveCameraBy(Vector3.cross(camera.forwardVector(), camera.up).normalize().mul(speed));
  if (keys[" "]) camera.moveUp(speed);
  if (keys.shift) camera.moveDown(speed);
}

function moveCameraBy(offset) {
  camera.eye.add(offset);
  camera.syncAtFromAngles();
}

function toggleFreeRoam() {
  freeRoam = !freeRoam;
  camera.eye.elements[1] = 1.7;
  camera.syncAtFromAngles();
  const mode = freeRoam ? "Free roam on: Space rises, Shift descends, W/S follow your aim." : "Free roam off: grounded movement restored.";
  document.getElementById("status").textContent = mode;
  showMessage(mode);
}

function isBlocked(x, z) {
  const mx = Math.floor(x);
  const mz = Math.floor(z);
  return mx < 0 || mz < 0 || mx >= SIZE || mz >= SIZE || worldMap[mz][mx] > 0;
}

function updateChasingElephant(scale) {
  if (gameWon) return;
  const e = camera.eye.elements;
  const dx = e[0] - elephant.x;
  const dz = e[2] - elephant.z;
  const distance = Math.hypot(dx, dz);
  if (distance < 0.001) return;

  const step = elephant.speed * scale * (collected === 3 ? 1.55 : 1);
  const nx = elephant.x + (dx / distance) * step;
  const nz = elephant.z + (dz / distance) * step;

  const oldX = elephant.x;
  const oldZ = elephant.z;

  if (!isBlocked(nx, nz)) {
    elephant.x = nx;
    elephant.z = nz;
  } else if (!isBlocked(nx, elephant.z)) {
    elephant.x = nx;
  } else if (!isBlocked(elephant.x, nz)) {
    elephant.z = nz;
  }

  const movedX = elephant.x - oldX;
  const movedZ = elephant.z - oldZ;
  if (Math.hypot(movedX, movedZ) > 0.0001) {
    elephant.angle = (Math.atan2(movedZ, -movedX) * 180) / Math.PI;
  }

  if (Math.hypot(e[0] - elephant.x, e[2] - elephant.z) < 1.25) {
    resetAfterCaught();
  }
}

function resetAfterCaught() {
  camera.eye.set([15.5, 1.7, 29.5]);
  camera.at.set([15.5, 1.7, 28.5]);
  camera.yaw = -90;
  camera.pitch = 0;
  camera.updateMatrices();
  elephant.x = 4.5;
  elephant.z = 4.5;
  elephant.angle = 0;
  showMessage("The big elephant caught you. Back to the gate.");
}

function restartGame() {
  worldMap = createWorldMap();
  textureMap = createTextureMap(worldMap);
  collected = 0;
  gameWon = false;
  gateOpen = false;
  freeRoam = false;
  babyElephants.forEach((baby) => {
    baby.found = false;
  });
  camera.eye.set([15.5, 1.7, 29.5]);
  camera.at.set([15.5, 1.7, 28.5]);
  camera.yaw = -90;
  camera.pitch = 0;
  camera.updateMatrices();
  elephant.x = 4.5;
  elephant.z = 4.5;
  elephant.angle = 0;
  document.getElementById("status").textContent = "Find 3 baby elephants, avoid the big elephant, then escape by car.";
  document.getElementById("winScreen").classList.remove("show");
  showMessage("Game restarted.");
}

function renderScene(seconds) {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.uniformMatrix4fv(u_ViewMatrix, false, camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, camera.projectionMatrix.elements);

  drawCube(-484, -484, -484, 1000, 1000, 1000, [0.45, 0.74, 0.96, 1], 0, 0);
  drawTerrain();
  drawWalls();
  drawTrees(seconds);
  babyElephants.forEach((baby, i) => drawBabyElephant(baby, i, seconds));
  drawElephant(elephant.x, elephant.z, 1.85, seconds, [0.42, 0.42, 0.43, 1], true, 0, elephant.angle);
  if (gateOpen) drawEscapeCar(seconds);
}

function drawTerrain() {
  drawCube(0, -0.26, 0, SIZE, 0.26, SIZE, [0.22, 0.48, 0.24, 1], 1, 0.85);
  for (let z = 0; z < SIZE; z++) {
    for (let x = 0; x < SIZE; x++) {
      const h = 0.02 + 0.04 * Math.sin(x * 0.55) * Math.cos(z * 0.5);
      drawCube(x, -0.02 + h, z, 1, 0.04, 1, [0.25, 0.55, 0.26, 1], 1, 0.85);
    }
  }
}

function drawWalls() {
  for (let z = 0; z < SIZE; z++) {
    for (let x = 0; x < SIZE; x++) {
      const height = worldMap[z][x];
      for (let y = 0; y < height; y++) {
        const tex = textureMap[z][x];
        drawCube(x, y, z, 1, 1, 1, [0.62, 0.58, 0.52, 1], tex, 0.9);
      }
    }
  }
}

function drawTrees(seconds) {
  const trees = [[6, 7], [12, 25], [20, 3], [27, 22], [9, 17], [24, 13]];
  trees.forEach(([x, z], i) => {
    drawCube(x + 0.35, 0, z + 0.35, 0.3, 1.25, 0.3, [0.45, 0.28, 0.17, 1], 4, 0.95);
    const sway = Math.sin(seconds + i) * 0.03;
    drawCube(x + 0.08 + sway, 1.05, z + 0.08, 0.85, 0.85, 0.85, [0.16, 0.48, 0.27, 1], 1, 0.4);
  });
}

function drawBabyElephant(baby, i, seconds) {
  if (baby.found) return;
  const bob = Math.sin(seconds * 3 + i) * 0.04;
  drawElephant(baby.x, baby.z, 0.62, seconds + i, [0.72, 0.72, 0.74, 1], false, bob, i * 70);
}

function drawElephant(x, z, scale, seconds, color, angry, extraBob = 0, angle = 0) {
  const walk = Math.sin(seconds * 5);
  const bob = extraBob + Math.abs(walk) * 0.025 * scale;
  const dark = [color[0] * 0.8, color[1] * 0.8, color[2] * 0.8, 1];
  const darker = [color[0] * 0.55, color[1] * 0.55, color[2] * 0.55, 1];

  const cube = (lx, ly, lz, sx, sy, sz, c, tex = 0, tw = 0) => {
    drawCubeRotated(x, z, angle, lx * scale, ly * scale + bob, lz * scale, sx * scale, sy * scale, sz * scale, c, tex, tw);
  };

  cube(-0.55, 0.35, -0.34, 1.25, 0.58, 0.72, color);
  cube(-0.92, 0.58, -0.24, 0.42, 0.42, 0.48, color);
  cube(-0.98, 0.6, -0.44, 0.16, 0.36, 0.14, dark);
  cube(-0.98, 0.6, 0.24, 0.16, 0.36, 0.14, dark);

  cube(-1.25, 0.45, -0.08, 0.22, 0.18, 0.16, dark);
  cube(-1.42, 0.32, -0.07, 0.18, 0.17, 0.14, dark);
  cube(-1.55, 0.18, -0.06, 0.15, 0.16, 0.12, dark);
  cube(-1.63, 0.04, -0.05, 0.12, 0.14, 0.1, dark);

  cube(-0.22, 0.02, -0.26, 0.18, 0.42 + walk * 0.03, 0.18, darker, 4, 0.25);
  cube(-0.22, 0.02, 0.1, 0.18, 0.42 - walk * 0.03, 0.18, darker, 4, 0.25);
  cube(0.42, 0.02, -0.26, 0.18, 0.42 - walk * 0.03, 0.18, darker, 4, 0.25);
  cube(0.42, 0.02, 0.1, 0.18, 0.42 + walk * 0.03, 0.18, darker, 4, 0.25);

  cube(-1.02, 0.68, -0.29, 0.07, 0.07, 0.07, angry ? [0.95, 0.12, 0.08, 1] : [0.05, 0.05, 0.05, 1]);
  cube(-1.02, 0.68, 0.17, 0.07, 0.07, 0.07, angry ? [0.95, 0.12, 0.08, 1] : [0.05, 0.05, 0.05, 1]);
  cube(0.68, 0.56, -0.05, 0.35, 0.06, 0.08, dark);
}

function drawEscapeCar(seconds) {
  const glow = 0.75 + Math.sin(seconds * 3) * 0.08;
  drawCube(13.65, 0.05, 29.55, 3.6, 0.62, 1.35, [0.85, 0.08, 0.07, 1], 0, 0);
  drawCube(14.35, 0.62, 29.75, 1.85, 0.58, 0.9, [0.95, 0.16, 0.12, 1], 0, 0);
  drawCube(14.62, 0.82, 29.62, 0.55, 0.28, 0.1, [0.65, 0.9, 1, 1], 0, 0);
  drawCube(15.42, 0.82, 29.62, 0.55, 0.28, 0.1, [0.65, 0.9, 1, 1], 0, 0);
  drawCube(13.95, -0.02, 29.35, 0.55, 0.55, 0.28, [0.04, 0.04, 0.04, 1], 2, 0.4);
  drawCube(16.7, -0.02, 29.35, 0.55, 0.55, 0.28, [0.04, 0.04, 0.04, 1], 2, 0.4);
  drawCube(13.25, 0, 30, 5.5, 0.08, 1.2, [1, glow, 0.25, 1], 3, 0.55);
}

function drawCube(x, y, z, sx, sy, sz, color, texture, textureWeight) {
  const model = new Matrix4().translate(x, y, z).scale(sx, sy, sz);
  drawCubeWithModel(model, color, texture, textureWeight);
}

function drawCubeRotated(baseX, baseZ, angle, x, y, z, sx, sy, sz, color, texture, textureWeight) {
  const rotation = new Matrix4().setRotate(angle, 0, 1, 0);
  const model = new Matrix4().translate(baseX, 0, baseZ).multiply(rotation).translate(x, y, z).scale(sx, sy, sz);
  drawCubeWithModel(model, color, texture, textureWeight);
}

function drawCubeWithModel(model, color, texture, textureWeight) {
  gl.uniformMatrix4fv(u_ModelMatrix, false, model.elements);
  gl.uniform4fv(u_BaseColor, color);
  gl.uniform1i(u_WhichTexture, texture);
  gl.uniform1f(u_TexColorWeight, textureWeight);
  gl.drawArrays(gl.TRIANGLES, 0, 36);
}

function addBlockInFront() {
  const target = getTargetCell(2.2);
  if (!target) return;
  const h = worldMap[target.z][target.x];
  if (h < 4) {
    worldMap[target.z][target.x] = h + 1;
    if (h === 0) textureMap[target.z][target.x] = 0;
    showMessage("Block added.");
  }
}

function deleteBlockInFront() {
  const target = getTargetCell(2.2);
  if (!target) return;
  const h = worldMap[target.z][target.x];
  if (h > 0) {
    worldMap[target.z][target.x] = h - 1;
    if (h - 1 === 0) textureMap[target.z][target.x] = 0;
    showMessage("Block removed.");
  }
}

function getTargetCell(distance) {
  const f = camera.forwardVector();
  const e = camera.eye.elements;
  const x = Math.floor(e[0] + f.elements[0] * distance);
  const z = Math.floor(e[2] + f.elements[2] * distance);
  if (x < 1 || z < 1 || x >= SIZE - 1 || z >= SIZE - 1) return null;
  return { x, z };
}

function checkStoryProgress() {
  const e = camera.eye.elements;
  babyElephants.forEach((baby) => {
    if (!baby.found && Math.hypot(e[0] - baby.x, e[2] - baby.z) < 1.35) {
      baby.found = true;
      collected++;
      document.getElementById("status").textContent = `${collected}/3 baby elephants found. Keep away from the big elephant.`;
      showMessage(`Baby elephant found: ${collected}/3`);
    }
  });

  if (!gateOpen && collected === 3) {
    openEscapeGate();
    document.getElementById("status").textContent = "The south wall opened. Get to the red car.";
    showMessage("The escape gate opened. Run to the car.");
  }

  if (!gameWon && gateOpen && Math.hypot(e[0] - 15.5, e[2] - 30.25) < 1.25) {
    gameWon = true;
    document.getElementById("status").textContent = "You escaped with the baby elephants.";
    showMessage("You reached the car and escaped.");
    showWinScreen();
  }
}

function openEscapeGate() {
  gateOpen = true;
  for (let x = 14; x <= 17; x++) {
    worldMap[30][x] = 0;
    textureMap[30][x] = 0;
  }
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gl && gl.viewport(0, 0, canvas.width, canvas.height);
  if (camera) camera.updateMatrices();
}

function showMessage(text) {
  const el = document.getElementById("message");
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(showMessage.timer);
  showMessage.timer = setTimeout(() => el.classList.remove("show"), 2200);
}

function showWinScreen() {
  document.getElementById("winScreen").classList.add("show");
}

window.addEventListener("load", main);
