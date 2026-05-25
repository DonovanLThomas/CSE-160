const VSHADER_SOURCE = `
attribute vec4 a_Position;
attribute vec2 a_UV;
attribute vec3 a_Normal;
uniform mat4 u_ModelMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ProjectionMatrix;
uniform mat3 u_NormalMatrix;
varying vec2 v_UV;
varying vec3 v_Normal;
varying vec3 v_WorldPos;
void main() {
  vec4 worldPos = u_ModelMatrix * a_Position;
  gl_Position = u_ProjectionMatrix * u_ViewMatrix * worldPos;
  v_UV = a_UV;
  v_Normal = normalize(u_NormalMatrix * a_Normal);
  v_WorldPos = worldPos.xyz;
}`;

const FSHADER_SOURCE = `
precision mediump float;
uniform vec4 u_BaseColor;
uniform float u_TexColorWeight;
uniform int u_WhichTexture;
uniform int u_LightingOn;
uniform int u_NormalVizOn;
uniform int u_PointLightOn;
uniform int u_SpotLightOn;
uniform float u_Emissive;
uniform vec3 u_CameraPos;
uniform vec3 u_PointLightPos;
uniform vec3 u_PointLightColor;
uniform vec3 u_SpotLightPos;
uniform vec3 u_SpotLightDir;
uniform vec3 u_SpotLightColor;
uniform sampler2D u_Sampler0;
uniform sampler2D u_Sampler1;
uniform sampler2D u_Sampler2;
uniform sampler2D u_Sampler3;
uniform sampler2D u_Sampler4;
varying vec2 v_UV;
varying vec3 v_Normal;
varying vec3 v_WorldPos;
void main() {
  vec4 texColor;
  if (u_WhichTexture == 0) texColor = texture2D(u_Sampler0, v_UV);
  else if (u_WhichTexture == 1) texColor = texture2D(u_Sampler1, v_UV);
  else if (u_WhichTexture == 2) texColor = texture2D(u_Sampler2, v_UV);
  else if (u_WhichTexture == 3) texColor = texture2D(u_Sampler3, v_UV);
  else texColor = texture2D(u_Sampler4, v_UV);
  vec4 surfaceColor = mix(u_BaseColor, texColor, u_TexColorWeight);

  vec3 normal = normalize(v_Normal);
  if (u_NormalVizOn == 1) {
    gl_FragColor = vec4(normal * 0.5 + 0.5, 1.0);
    return;
  }

  if (u_LightingOn == 0 || u_Emissive > 0.5) {
    gl_FragColor = surfaceColor;
    return;
  }

  vec3 viewDir = normalize(u_CameraPos - v_WorldPos);
  vec3 litColor = surfaceColor.rgb * 0.22;

  if (u_PointLightOn == 1) {
    vec3 lightOffset = u_PointLightPos - v_WorldPos;
    vec3 lightDir = normalize(lightOffset);
    float distance = length(lightOffset);
    float attenuation = 1.0 / (1.0 + 0.035 * distance + 0.0015 * distance * distance);
    float diffuse = max(dot(normal, lightDir), 0.0);
    vec3 reflectDir = reflect(-lightDir, normal);
    float specular = pow(max(dot(viewDir, reflectDir), 0.0), 32.0) * 0.55;
    litColor += (surfaceColor.rgb * diffuse + vec3(specular)) * u_PointLightColor * attenuation;
  }

  if (u_SpotLightOn == 1) {
    vec3 spotToFrag = normalize(v_WorldPos - u_SpotLightPos);
    float cone = dot(spotToFrag, normalize(u_SpotLightDir));
    float coneStrength = smoothstep(0.82, 0.93, cone);
    vec3 lightDir = normalize(u_SpotLightPos - v_WorldPos);
    float diffuse = max(dot(normal, lightDir), 0.0);
    vec3 reflectDir = reflect(-lightDir, normal);
    float specular = pow(max(dot(viewDir, reflectDir), 0.0), 48.0) * 0.75;
    litColor += (surfaceColor.rgb * diffuse + vec3(specular)) * u_SpotLightColor * coneStrength;
  }

  gl_FragColor = vec4(min(litColor, vec3(1.0)), surfaceColor.a);
}`;

const SIZE = 32;
const keys = {};
let canvas;
let gl;
let camera;
let cubeBuffer;
let sphereBuffer;
let sphereVertexCount = 0;
let headModel = null;
let a_Position;
let a_UV;
let a_Normal;
let u_ModelMatrix;
let u_ViewMatrix;
let u_ProjectionMatrix;
let u_NormalMatrix;
let u_BaseColor;
let u_TexColorWeight;
let u_WhichTexture;
let u_LightingOn;
let u_NormalVizOn;
let u_PointLightOn;
let u_SpotLightOn;
let u_Emissive;
let u_CameraPos;
let u_PointLightPos;
let u_PointLightColor;
let u_SpotLightPos;
let u_SpotLightDir;
let u_SpotLightColor;
let worldMap;
let textureMap;
let freeRoam = false;
let lastFrameTime = 0;
let lightingOn = true;
let normalVizOn = false;
let pointLightOn = true;
let spotLightOn = true;
let pointLightAuto = true;
let pointLightSliderX = 16;
let pointLightPos = [16, 5.4, 16];
let pointLightColor = [1, 0.92, 0.72];

function main() {
  canvas = document.getElementById("webgl");
  gl = canvas.getContext("webgl", { antialias: true });
  if (!gl) throw new Error("WebGL is not available in this browser.");

  resizeCanvas();
  initShaders();
  initCubeBuffer();
  initSphereBuffer();
  initTextures();
  camera = new Camera(canvas);
  worldMap = createWorldMap();
  textureMap = createTextureMap(worldMap);
  setupInput();
  setupLightingControls();
  loadObjModel("assets/models/head.obj");

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.43, 0.72, 0.96, 1);
  showMessage("Phong lighting scene ready. Inspect the spheres, cube world, and OBJ model.");
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
  a_Normal = gl.getAttribLocation(program, "a_Normal");
  u_ModelMatrix = gl.getUniformLocation(program, "u_ModelMatrix");
  u_ViewMatrix = gl.getUniformLocation(program, "u_ViewMatrix");
  u_ProjectionMatrix = gl.getUniformLocation(program, "u_ProjectionMatrix");
  u_NormalMatrix = gl.getUniformLocation(program, "u_NormalMatrix");
  u_BaseColor = gl.getUniformLocation(program, "u_BaseColor");
  u_TexColorWeight = gl.getUniformLocation(program, "u_TexColorWeight");
  u_WhichTexture = gl.getUniformLocation(program, "u_WhichTexture");
  u_LightingOn = gl.getUniformLocation(program, "u_LightingOn");
  u_NormalVizOn = gl.getUniformLocation(program, "u_NormalVizOn");
  u_PointLightOn = gl.getUniformLocation(program, "u_PointLightOn");
  u_SpotLightOn = gl.getUniformLocation(program, "u_SpotLightOn");
  u_Emissive = gl.getUniformLocation(program, "u_Emissive");
  u_CameraPos = gl.getUniformLocation(program, "u_CameraPos");
  u_PointLightPos = gl.getUniformLocation(program, "u_PointLightPos");
  u_PointLightColor = gl.getUniformLocation(program, "u_PointLightColor");
  u_SpotLightPos = gl.getUniformLocation(program, "u_SpotLightPos");
  u_SpotLightDir = gl.getUniformLocation(program, "u_SpotLightDir");
  u_SpotLightColor = gl.getUniformLocation(program, "u_SpotLightColor");
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
  const data = [];
  const face = (normal, verts) => {
    verts.forEach(([x, y, z, u, v]) => data.push(x, y, z, u, v, normal[0], normal[1], normal[2]));
  };

  face([0, 0, 1], [
    [0, 0, 1, 0, 0], [1, 0, 1, 1, 0], [1, 1, 1, 1, 1],
    [0, 0, 1, 0, 0], [1, 1, 1, 1, 1], [0, 1, 1, 0, 1],
  ]);
  face([0, 0, -1], [
    [1, 0, 0, 0, 0], [0, 0, 0, 1, 0], [0, 1, 0, 1, 1],
    [1, 0, 0, 0, 0], [0, 1, 0, 1, 1], [1, 1, 0, 0, 1],
  ]);
  face([0, 1, 0], [
    [0, 1, 1, 0, 0], [1, 1, 1, 1, 0], [1, 1, 0, 1, 1],
    [0, 1, 1, 0, 0], [1, 1, 0, 1, 1], [0, 1, 0, 0, 1],
  ]);
  face([0, -1, 0], [
    [0, 0, 0, 0, 0], [1, 0, 0, 1, 0], [1, 0, 1, 1, 1],
    [0, 0, 0, 0, 0], [1, 0, 1, 1, 1], [0, 0, 1, 0, 1],
  ]);
  face([1, 0, 0], [
    [1, 0, 1, 0, 0], [1, 0, 0, 1, 0], [1, 1, 0, 1, 1],
    [1, 0, 1, 0, 0], [1, 1, 0, 1, 1], [1, 1, 1, 0, 1],
  ]);
  face([-1, 0, 0], [
    [0, 0, 0, 0, 0], [0, 0, 1, 1, 0], [0, 1, 1, 1, 1],
    [0, 0, 0, 0, 0], [0, 1, 1, 1, 1], [0, 1, 0, 0, 1],
  ]);

  const v = new Float32Array(data);
  cubeBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, v, gl.STATIC_DRAW);
  bindInterleavedBuffer(cubeBuffer);
}

function initSphereBuffer() {
  const data = [];
  const latBands = 24;
  const lonBands = 32;
  const point = (lat, lon) => {
    const phi = (lat * Math.PI) / latBands;
    const theta = (lon * 2 * Math.PI) / lonBands;
    const sinPhi = Math.sin(phi);
    const nx = Math.cos(theta) * sinPhi;
    const ny = Math.cos(phi);
    const nz = Math.sin(theta) * sinPhi;
    return {
      position: [nx * 0.5, ny * 0.5, nz * 0.5],
      normal: [nx, ny, nz],
      uv: [lon / lonBands, 1 - lat / latBands],
    };
  };
  const pushPoint = (p) => data.push(p.position[0], p.position[1], p.position[2], p.uv[0], p.uv[1], p.normal[0], p.normal[1], p.normal[2]);

  for (let lat = 0; lat < latBands; lat++) {
    for (let lon = 0; lon < lonBands; lon++) {
      const p00 = point(lat, lon);
      const p10 = point(lat + 1, lon);
      const p11 = point(lat + 1, lon + 1);
      const p01 = point(lat, lon + 1);
      pushPoint(p00); pushPoint(p10); pushPoint(p11);
      pushPoint(p00); pushPoint(p11); pushPoint(p01);
    }
  }

  sphereVertexCount = data.length / 8;
  sphereBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
}

function bindInterleavedBuffer(buffer) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 32, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 32, 12);
  gl.enableVertexAttribArray(a_UV);
  gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 32, 20);
  gl.enableVertexAttribArray(a_Normal);
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

function setupLightingControls() {
  const setButton = (id, label, active) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = `${label}: ${active ? "On" : "Off"}`;
    el.classList.toggle("active", active);
  };
  const refresh = () => {
    setButton("toggleLighting", "Lighting", lightingOn);
    setButton("toggleNormals", "Normals", normalVizOn);
    setButton("togglePoint", "Point", pointLightOn);
    setButton("toggleSpot", "Spot", spotLightOn);
  };
  const bindToggle = (id, update) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("click", () => {
      update();
      refresh();
    });
  };

  bindToggle("toggleLighting", () => lightingOn = !lightingOn);
  bindToggle("toggleNormals", () => normalVizOn = !normalVizOn);
  bindToggle("togglePoint", () => pointLightOn = !pointLightOn);
  bindToggle("toggleSpot", () => spotLightOn = !spotLightOn);

  const slider = document.getElementById("lightX");
  if (slider) {
    slider.value = pointLightSliderX;
    slider.addEventListener("input", () => {
      pointLightSliderX = Number(slider.value);
      pointLightAuto = false;
      const auto = document.getElementById("autoLight");
      if (auto) auto.checked = false;
    });
  }

  const auto = document.getElementById("autoLight");
  if (auto) {
    auto.checked = pointLightAuto;
    auto.addEventListener("change", () => pointLightAuto = auto.checked);
  }

  const colorSliders = [
    document.getElementById("lightR"),
    document.getElementById("lightG"),
    document.getElementById("lightB"),
  ];
  colorSliders.forEach((slider, i) => {
    if (!slider) return;
    slider.value = Math.round(pointLightColor[i] * 255);
    slider.addEventListener("input", () => {
      pointLightColor = colorSliders.map((s, j) => s ? Number(s.value) / 255 : pointLightColor[j]);
    });
  });

  refresh();
}

function tick(time) {
  const dt = Math.min(32, time - lastFrameTime);
  lastFrameTime = time;
  updatePointLight(time * 0.001);
  handleMovement(dt / 16.67);
  renderScene(time * 0.001);
  requestAnimationFrame(tick);
}

function updatePointLight(seconds) {
  if (pointLightAuto) {
    pointLightPos[0] = 16 + Math.cos(seconds * 0.8) * 10;
    pointLightPos[2] = 16 + Math.sin(seconds * 0.8) * 10;
    pointLightPos[1] = 5.3 + Math.sin(seconds * 1.6) * 1.2;
    const slider = document.getElementById("lightX");
    if (slider) slider.value = pointLightPos[0];
  } else {
    pointLightPos[0] = pointLightSliderX;
    pointLightPos[1] = 5.4;
    pointLightPos[2] = 16;
  }
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

function restartGame() {
  worldMap = createWorldMap();
  textureMap = createTextureMap(worldMap);
  freeRoam = false;
  camera.eye.set([15.5, 1.7, 29.5]);
  camera.at.set([15.5, 1.7, 28.5]);
  camera.yaw = -90;
  camera.pitch = 0;
  camera.updateMatrices();
  document.getElementById("status").textContent = "Lighting demo reset. Move around and test the light controls.";
  showMessage("Lighting demo reset.");
}

function renderScene(seconds) {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.uniformMatrix4fv(u_ViewMatrix, false, camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, camera.projectionMatrix.elements);
  gl.uniform1i(u_LightingOn, lightingOn ? 1 : 0);
  gl.uniform1i(u_NormalVizOn, normalVizOn ? 1 : 0);
  gl.uniform1i(u_PointLightOn, pointLightOn ? 1 : 0);
  gl.uniform1i(u_SpotLightOn, spotLightOn ? 1 : 0);
  gl.uniform3fv(u_CameraPos, camera.eye.elements);
  gl.uniform3fv(u_PointLightPos, pointLightPos);
  gl.uniform3fv(u_PointLightColor, pointLightColor);
  gl.uniform3fv(u_SpotLightPos, camera.eye.elements);
  gl.uniform3fv(u_SpotLightDir, camera.forwardVector().elements);
  gl.uniform3fv(u_SpotLightColor, [0.75, 0.86, 1]);

  drawCube(-484, -484, -484, 1000, 1000, 1000, [0.45, 0.74, 0.96, 1], 0, 0, true);
  drawTerrain();
  drawWalls();
  drawTrees(seconds);
  drawLightingDemoObjects(seconds);
  drawCube(pointLightPos[0] - 0.12, pointLightPos[1] - 0.12, pointLightPos[2] - 0.12, 0.24, 0.24, 0.24, [pointLightColor[0], pointLightColor[1], pointLightColor[2], 1], 3, 0, true);
}

function drawLightingDemoObjects(seconds) {
  drawSphere(10.5, 0.75, 8.5, 1.35, [0.96, 0.38, 0.28, 1]);
  drawSphere(22.5, 0.95, 23.5, 1.85, [0.22, 0.58, 0.86, 1]);
  drawSphere(16 + Math.sin(seconds) * 1.5, 0.55, 11.5, 0.9, [0.93, 0.78, 0.26, 1]);

  if (headModel) {
    const model = new Matrix4().translate(16, 1.9, 15.5).scale(2.1, 2.1, 2.1);
    drawMesh(headModel.buffer, headModel.vertexCount, model, [0.74, 0.68, 0.62, 1], 2, 0.18, false);
  }
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

function drawCube(x, y, z, sx, sy, sz, color, texture, textureWeight, emissive = false) {
  const model = new Matrix4().translate(x, y, z).scale(sx, sy, sz);
  drawCubeWithModel(model, color, texture, textureWeight, emissive);
}

function drawCubeWithModel(model, color, texture, textureWeight, emissive = false) {
  drawMesh(cubeBuffer, 36, model, color, texture, textureWeight, emissive);
}

function drawSphere(x, y, z, scale, color) {
  const model = new Matrix4().translate(x, y, z).scale(scale, scale, scale);
  drawMesh(sphereBuffer, sphereVertexCount, model, color, 0, 0, false);
}

function drawMesh(buffer, vertexCount, model, color, texture, textureWeight, emissive = false) {
  bindInterleavedBuffer(buffer);
  gl.uniformMatrix4fv(u_ModelMatrix, false, model.elements);
  gl.uniformMatrix3fv(u_NormalMatrix, false, normalMatrixFromModel(model));
  gl.uniform4fv(u_BaseColor, color);
  gl.uniform1i(u_WhichTexture, texture);
  gl.uniform1f(u_TexColorWeight, textureWeight);
  gl.uniform1f(u_Emissive, emissive ? 1 : 0);
  gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
}

function normalMatrixFromModel(model) {
  const m = model.elements;
  const a00 = m[0], a01 = m[1], a02 = m[2];
  const a10 = m[4], a11 = m[5], a12 = m[6];
  const a20 = m[8], a21 = m[9], a22 = m[10];

  const b01 = a22 * a11 - a12 * a21;
  const b11 = -a22 * a10 + a12 * a20;
  const b21 = a21 * a10 - a11 * a20;
  let det = a00 * b01 + a01 * b11 + a02 * b21;

  if (Math.abs(det) < 0.000001) {
    return new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  }
  det = 1 / det;

  const inv = [
    b01 * det,
    (-a22 * a01 + a02 * a21) * det,
    (a12 * a01 - a02 * a11) * det,
    b11 * det,
    (a22 * a00 - a02 * a20) * det,
    (-a12 * a00 + a02 * a10) * det,
    b21 * det,
    (-a21 * a00 + a01 * a20) * det,
    (a11 * a00 - a01 * a10) * det,
  ];

  return new Float32Array([
    inv[0], inv[3], inv[6],
    inv[1], inv[4], inv[7],
    inv[2], inv[5], inv[8],
  ]);
}

async function loadObjModel(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    const mesh = parseObj(text);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);
    headModel = { buffer, vertexCount: mesh.vertices.length / 8 };
    showMessage(`OBJ loaded: ${Math.round(headModel.vertexCount / 3).toLocaleString()} triangles.`);
  } catch (err) {
    console.error(err);
    showMessage("Could not load head.obj. Run this assignment through a local server.");
  }
}

function parseObj(text) {
  const positions = [null];
  const texcoords = [null];
  const normals = [null];
  const rawFaces = [];
  const boundsMin = [Infinity, Infinity, Infinity];
  const boundsMax = [-Infinity, -Infinity, -Infinity];

  text.split(/\r?\n/).forEach((line) => {
    if (!line || line[0] === "#") return;
    const parts = line.trim().split(/\s+/);
    if (parts[0] === "v") {
      const p = [Number(parts[1]), Number(parts[2]), Number(parts[3])];
      positions.push(p);
      for (let i = 0; i < 3; i++) {
        boundsMin[i] = Math.min(boundsMin[i], p[i]);
        boundsMax[i] = Math.max(boundsMax[i], p[i]);
      }
    } else if (parts[0] === "vt") {
      texcoords.push([Number(parts[1]), Number(parts[2])]);
    } else if (parts[0] === "vn") {
      normals.push(normalize3([Number(parts[1]), Number(parts[2]), Number(parts[3])]));
    } else if (parts[0] === "f") {
      rawFaces.push(parts.slice(1));
    }
  });

  const center = [
    (boundsMin[0] + boundsMax[0]) * 0.5,
    (boundsMin[1] + boundsMax[1]) * 0.5,
    (boundsMin[2] + boundsMax[2]) * 0.5,
  ];
  const maxDimension = Math.max(
    boundsMax[0] - boundsMin[0],
    boundsMax[1] - boundsMin[1],
    boundsMax[2] - boundsMin[2]
  );
  const scale = maxDimension > 0 ? 1.8 / maxDimension : 1;
  const vertices = [];

  const readRef = (token) => {
    const [v, vt, vn] = token.split("/");
    const pIndex = resolveObjIndex(Number(v), positions.length);
    const tIndex = vt ? resolveObjIndex(Number(vt), texcoords.length) : 0;
    const nIndex = vn ? resolveObjIndex(Number(vn), normals.length) : 0;
    return { p: positions[pIndex], uv: texcoords[tIndex], n: normals[nIndex] };
  };

  const pushVertex = (ref, faceNormal) => {
    const p = ref.p || [0, 0, 0];
    const uv = ref.uv || [0, 0];
    const n = ref.n || faceNormal;
    vertices.push(
      (p[0] - center[0]) * scale,
      (p[1] - center[1]) * scale,
      (p[2] - center[2]) * scale,
      uv[0],
      uv[1],
      n[0],
      n[1],
      n[2]
    );
  };

  rawFaces.forEach((tokens) => {
    const refs = tokens.map(readRef);
    for (let i = 1; i < refs.length - 1; i++) {
      const tri = [refs[0], refs[i], refs[i + 1]];
      const faceNormal = computeFaceNormal(tri[0].p, tri[1].p, tri[2].p);
      tri.forEach((ref) => pushVertex(ref, faceNormal));
    }
  });

  return { vertices: new Float32Array(vertices) };
}

function resolveObjIndex(index, length) {
  return index < 0 ? length + index : index;
}

function computeFaceNormal(a, b, c) {
  if (!a || !b || !c) return [0, 1, 0];
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  return normalize3([
    uy * vz - uz * vy,
    uz * vx - ux * vz,
    ux * vy - uy * vx,
  ]);
}

function normalize3(v) {
  const len = Math.hypot(v[0], v[1], v[2]);
  return len > 0.000001 ? [v[0] / len, v[1] / len, v[2] / len] : [0, 1, 0];
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

window.addEventListener("load", main);
