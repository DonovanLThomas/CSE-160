import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const canvas = document.querySelector('#scene');
const scoreEl = document.querySelector('#score');
const statusEl = document.querySelector('#status');
const staminaEl = document.querySelector('#stamina');
const messageEl = document.querySelector('#message');
const resetButton = document.querySelector('#reset');
const startOverlay = document.querySelector('#startOverlay');
const startButton = document.querySelector('#startButton');
const endOverlay = document.querySelector('#endOverlay');
const endRestartButton = document.querySelector('#endRestart');
const gameOverOverlay = document.querySelector('#gameOverOverlay');
const gameOverRestartButton = document.querySelector('#gameOverRestart');
const gameOverScoreEl = document.querySelector('#gameOverScore');
const freeCamButton = document.querySelector('#freeCamButton');
const cctvOverlay = document.querySelector('#cctvOverlay');

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x030305, 0.034);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 700);
camera.position.set(0, 1.65, 13);
scene.add(camera);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const controls = new PointerLockControls(camera, document.body);
controls.pointerSpeed = 0.88;
controls.minPolarAngle = 0.08;
controls.maxPolarAngle = Math.PI - 0.08;
const gltfLoader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();
const clock = new THREE.Clock();
const tempVec = new THREE.Vector3();
const tempForward = new THREE.Vector3();
const tempRight = new THREE.Vector3();
const generatorPosition = new THREE.Vector3(-15.2, 1.1, 5.8);
const exitPosition = new THREE.Vector3(0, 1.65, 15.5);
const freeCamPosition = new THREE.Vector3(-15.8, 6.7, 12.2);
const freeCamTarget = new THREE.Vector3(0, 0.7, -5.8);

const mixers = [];
const collectibles = [];
const poweredObjects = [];
const flickerMaterials = [];
const flickerLights = [];
const colliders = [];

const keys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  sprint: false
};

const playerStart = new THREE.Vector3(0, 1.65, 13);
const warehouseBounds = { minX: -20, maxX: 20, minZ: -18, maxZ: 17 };
const totalSparkPlugs = 7;
const wakeThreshold = 2;
const wakeDelay = 24;
const pickupRadius = 2.05;
const generatorRadius = 2.8;
const exitRadius = 3.2;
const playerRadius = 0.48;
const clownFacingOffset = Math.PI;

let collected = 0;
let stamina = 100;
let gameState = 'intro';
let roundStartTime = 0;
let generatorSequenceTime = 0;
let clownRoot = null;
let clownBasePosition = new THREE.Vector3(11, 0, -12.5);
let clownVelocity = new THREE.Vector3();
let clownMixer = null;
let clownActions = {};
let activeClownAction = null;
let staggerTimer = 0;
let clownLight = null;
let midwayLight = null;
let exitLight = null;
let flashlight = null;
let generatorGroup = null;
let generatorCoreMaterial = null;
let fuseBoxMarker = null;
let fuseBoxMarkerMaterial = null;
let gateLeft = null;
let gateRight = null;
let sparkPlugTemplate = null;
let surgeTimer = 0;
let isFreeCam = false;
let savedCameraPosition = new THREE.Vector3();
let savedCameraQuaternion = new THREE.Quaternion();
let ambientLight = null;
let hemisphereLight = null;
let moonLight = null;
let entrySpot = null;

const shared = makeSharedResources();
const materials = makeMaterials();

createLights();
createSkybox();
createGround();
createWarehouseShell();
createCrashTestWarehouse();
createCollectibles();
createGenerator();
createFlashlight();
loadModels();
resetGame({ showIntro: true });

canvas.addEventListener('pointerdown', onCanvasPointerDown);
resetButton.addEventListener('click', () => resetGame({ showIntro: false }));
startButton.addEventListener('click', startGame);
endRestartButton.addEventListener('click', () => resetGame({ showIntro: false }));
gameOverRestartButton.addEventListener('click', () => resetGame({ showIntro: false }));
freeCamButton.addEventListener('click', toggleFreeCam);
document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);
window.addEventListener('resize', onResize);

controls.addEventListener('lock', () => {
  if (gameState === 'ready') {
    gameState = 'searching';
    startOverlay.classList.add('is-hidden');
    roundStartTime = clock.elapsedTime;
    messageEl.textContent = 'Find the spark plugs, install them at the generator, then escape through the gate.';
    updateHud();
  }
});

controls.addEventListener('unlock', () => {
  if (gameState !== 'won' && gameState !== 'caught') {
    messageEl.textContent = 'Click the scene to resume the escape.';
  }
});

renderer.setAnimationLoop(animate);

function makeSharedResources() {
  return {
    box: new THREE.BoxGeometry(1, 1, 1),
    ticket: new THREE.BoxGeometry(0.72, 0.12, 0.42),
    smallSphere: new THREE.SphereGeometry(0.16, 12, 8),
    plugCeramic: new THREE.CylinderGeometry(0.16, 0.2, 0.62, 18),
    plugMetal: new THREE.CylinderGeometry(0.2, 0.2, 0.28, 18),
    plugTip: new THREE.CylinderGeometry(0.055, 0.075, 0.38, 12),
    glowRing: new THREE.TorusGeometry(0.42, 0.025, 8, 32),
    cone: new THREE.ConeGeometry(0.35, 0.9, 16),
    barrel: new THREE.CylinderGeometry(0.42, 0.42, 1.1, 18),
    pole: new THREE.CylinderGeometry(0.1, 0.1, 1, 16),
    tire: new THREE.TorusGeometry(0.55, 0.14, 10, 28)
  };
}

function makeMaterials() {
  const groundTexture = makeCanvasTexture(512, 512, (ctx, size) => {
    ctx.fillStyle = '#171316';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 1200; i += 1) {
      const shade = 22 + Math.random() * 30;
      ctx.fillStyle = `rgb(${shade}, ${shade - 5}, ${shade - 2})`;
      ctx.fillRect(Math.random() * size, Math.random() * size, 2 + Math.random() * 5, 1 + Math.random() * 5);
    }
    ctx.strokeStyle = 'rgba(180, 160, 125, 0.18)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 18; i += 1) {
      ctx.beginPath();
      const y = Math.random() * size;
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(size * 0.3, y + Math.random() * 80 - 40, size * 0.65, y + Math.random() * 80 - 40, size, y + Math.random() * 30 - 15);
      ctx.stroke();
    }
  });
  groundTexture.wrapS = THREE.RepeatWrapping;
  groundTexture.wrapT = THREE.RepeatWrapping;
  groundTexture.repeat.set(12, 12);

  const woodTexture = makeCanvasTexture(512, 512, (ctx, size) => {
    ctx.fillStyle = '#533321';
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 42) {
      ctx.fillStyle = y % 84 === 0 ? '#6a4028' : '#442719';
      ctx.fillRect(0, y, size, 34);
      ctx.strokeStyle = 'rgba(20, 10, 8, 0.45)';
      ctx.strokeRect(0, y, size, 34);
    }
    for (let i = 0; i < 180; i += 1) {
      ctx.fillStyle = 'rgba(255, 210, 150, 0.08)';
      ctx.fillRect(Math.random() * size, Math.random() * size, 80 + Math.random() * 110, 1);
    }
  });
  woodTexture.wrapS = THREE.RepeatWrapping;
  woodTexture.wrapT = THREE.RepeatWrapping;
  woodTexture.repeat.set(2, 2);

  const stripedTexture = makeCanvasTexture(512, 512, (ctx, size) => {
    ctx.fillStyle = '#6f1219';
    ctx.fillRect(0, 0, size, size);
    for (let x = -80; x < size + 80; x += 96) {
      ctx.fillStyle = '#d9c185';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 48, 0);
      ctx.lineTo(x + 140, size);
      ctx.lineTo(x + 92, size);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.fillRect(0, 0, size, size);
  });
  stripedTexture.wrapS = THREE.RepeatWrapping;
  stripedTexture.wrapT = THREE.RepeatWrapping;

  const concreteTexture = makeCanvasTexture(512, 512, (ctx, size) => {
    ctx.fillStyle = '#37343a';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 900; i += 1) {
      const shade = 38 + Math.random() * 34;
      ctx.fillStyle = `rgba(${shade}, ${shade}, ${shade + 4}, ${0.25 + Math.random() * 0.35})`;
      ctx.fillRect(Math.random() * size, Math.random() * size, 4 + Math.random() * 14, 1 + Math.random() * 9);
    }
    ctx.strokeStyle = 'rgba(18, 17, 20, 0.35)';
    for (let i = 0; i < 20; i += 1) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * size, Math.random() * size);
      ctx.lineTo(Math.random() * size, Math.random() * size);
      ctx.stroke();
    }
  });
  concreteTexture.wrapS = THREE.RepeatWrapping;
  concreteTexture.wrapT = THREE.RepeatWrapping;
  concreteTexture.repeat.set(5, 4);

  const grimeTexture = makeCanvasTexture(512, 512, (ctx, size) => {
    ctx.clearRect(0, 0, size, size);
    for (let i = 0; i < 240; i += 1) {
      const radius = 8 + Math.random() * 48;
      const x = Math.random() * size;
      const y = Math.random() * size;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0.26)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  grimeTexture.wrapS = THREE.RepeatWrapping;
  grimeTexture.wrapT = THREE.RepeatWrapping;
  grimeTexture.repeat.set(7, 7);

  const rustTexture = makeCanvasTexture(512, 512, (ctx, size) => {
    ctx.fillStyle = '#6e3d31';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 1300; i += 1) {
      const r = 65 + Math.random() * 95;
      const g = 28 + Math.random() * 48;
      const b = 18 + Math.random() * 30;
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.18 + Math.random() * 0.55})`;
      ctx.fillRect(Math.random() * size, Math.random() * size, 2 + Math.random() * 16, 2 + Math.random() * 12);
    }
  });
  rustTexture.wrapS = THREE.RepeatWrapping;
  rustTexture.wrapT = THREE.RepeatWrapping;
  rustTexture.repeat.set(3, 3);

  const fusePanelTexture = makeCanvasTexture(512, 512, (ctx, size) => {
    ctx.fillStyle = '#1f2522';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#9fd9bf';
    ctx.lineWidth = 8;
    ctx.strokeRect(38, 38, size - 76, size - 76);
    ctx.fillStyle = '#f3d56b';
    ctx.font = 'bold 52px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('FUSE BOX', size / 2, 112);
    for (let i = 0; i < 5; i += 1) {
      ctx.fillStyle = i % 2 ? '#d24638' : '#58c184';
      ctx.fillRect(105 + i * 62, 210, 38, 92);
      ctx.fillStyle = '#111';
      ctx.fillRect(112 + i * 62, 310, 24, 84);
    }
  });
  fusePanelTexture.colorSpace = THREE.SRGBColorSpace;

  const mats = {
    ground: new THREE.MeshStandardMaterial({ map: groundTexture, roughness: 0.95, metalness: 0.02 }),
    wood: new THREE.MeshStandardMaterial({ map: woodTexture, roughness: 0.88 }),
    striped: new THREE.MeshStandardMaterial({ map: stripedTexture, roughness: 0.82 }),
    rust: new THREE.MeshStandardMaterial({ map: rustTexture, color: 0x7e4637, roughness: 0.86, metalness: 0.16 }),
    fadedRed: new THREE.MeshStandardMaterial({ color: 0x79212b, roughness: 0.8 }),
    fadedTeal: new THREE.MeshStandardMaterial({ color: 0x244e55, roughness: 0.78 }),
    fadedGold: new THREE.MeshStandardMaterial({ color: 0xc09445, roughness: 0.7 }),
    safetyYellow: new THREE.MeshStandardMaterial({ color: 0xd6a12d, roughness: 0.62 }),
    hazardBlack: new THREE.MeshStandardMaterial({ color: 0x15110b, roughness: 0.8 }),
    lanePaint: new THREE.MeshBasicMaterial({ color: 0xd8d0aa }),
    redWarning: new THREE.MeshStandardMaterial({ color: 0x9e2222, emissive: 0x4d0606, emissiveIntensity: 0.35, roughness: 0.55 }),
    black: new THREE.MeshStandardMaterial({ color: 0x151015, roughness: 0.9 }),
    bone: new THREE.MeshStandardMaterial({ color: 0xc9b892, roughness: 0.88 }),
    dimBulb: new THREE.MeshStandardMaterial({ color: 0x6d4525, emissive: 0x2a1406, emissiveIntensity: 0.28, roughness: 0.45 }),
    brightBulb: new THREE.MeshStandardMaterial({ color: 0xffd36b, emissive: 0xff9f2e, emissiveIntensity: 1.7, roughness: 0.25 }),
    sparkCeramic: new THREE.MeshStandardMaterial({ color: 0xe7dec9, emissive: 0x3d2813, emissiveIntensity: 0.18, roughness: 0.38 }),
    sparkMetal: new THREE.MeshStandardMaterial({ color: 0x9ca0a3, emissive: 0xffa33a, emissiveIntensity: 0.45, roughness: 0.26, metalness: 0.75 }),
    sparkGlow: new THREE.MeshBasicMaterial({ color: 0xffb23f, transparent: true, opacity: 0.34, depthWrite: false }),
    markerRed: new THREE.MeshStandardMaterial({ color: 0xff2a2a, emissive: 0xff0505, emissiveIntensity: 1.8, roughness: 0.34 }),
    markerGlow: new THREE.MeshBasicMaterial({ color: 0xff3333, transparent: true, opacity: 0.48, depthWrite: false }),
    concrete: new THREE.MeshStandardMaterial({ map: concreteTexture, color: 0x343239, roughness: 0.92 }),
    grime: new THREE.MeshBasicMaterial({ map: grimeTexture, transparent: true, opacity: 0.48, depthWrite: false }),
    generator: new THREE.MeshStandardMaterial({ map: rustTexture, color: 0x2c5e58, roughness: 0.78, metalness: 0.18 }),
    generatorCore: new THREE.MeshStandardMaterial({ color: 0x231811, emissive: 0xff8c25, emissiveIntensity: 0.18, roughness: 0.45 }),
    fusePanel: new THREE.MeshStandardMaterial({ map: fusePanelTexture, emissive: 0x3a1906, emissiveIntensity: 0.24, roughness: 0.48 })
  };

  applyOptionalTextureAny(mats.concrete, [
    './assets/textures/warehouse_concrete.jpg',
    './assets/textures/warehouse-concrete.jpg'
  ], 5, 4);
  applyOptionalTexture(mats.grime, './assets/textures/warehouse-grime.jpg', 7, 7);
  applyOptionalTexture(mats.rust, './assets/textures/rusty-metal.jpg', 3, 3);
  applyOptionalTexture(mats.generator, './assets/textures/rusty-metal.jpg', 2, 2);
  applyOptionalTexture(mats.fusePanel, './assets/textures/fuse-box-panel.jpg', 1, 1);

  return mats;
}

function makeCanvasTexture(width, height, draw) {
  const drawingCanvas = document.createElement('canvas');
  drawingCanvas.width = width;
  drawingCanvas.height = height;
  const ctx = drawingCanvas.getContext('2d');
  draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(drawingCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function applyOptionalTexture(material, path, repeatX = 1, repeatY = 1) {
  fetch(path, { method: 'HEAD' })
    .then((response) => {
      if (!response.ok) return;
      textureLoader.load(path, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(repeatX, repeatY);
        material.map = texture;
        material.needsUpdate = true;
      });
    })
    .catch(() => {
      // Missing user-provided texture files keep the procedural fallback material.
    });
}

function applyOptionalTextureAny(material, paths, repeatX = 1, repeatY = 1) {
  const [path, ...fallbackPaths] = paths;
  if (!path) return;

  fetch(path, { method: 'HEAD' })
    .then((response) => {
      if (!response.ok) {
        applyOptionalTextureAny(material, fallbackPaths, repeatX, repeatY);
        return;
      }
      textureLoader.load(path, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(repeatX, repeatY);
        material.map = texture;
        material.needsUpdate = true;
      });
    })
    .catch(() => applyOptionalTextureAny(material, fallbackPaths, repeatX, repeatY));
}

function createLights() {
  ambientLight = new THREE.AmbientLight(0x18151f, 0.18);
  scene.add(ambientLight);

  hemisphereLight = new THREE.HemisphereLight(0x34384f, 0x080506, 0.26);
  scene.add(hemisphereLight);

  moonLight = new THREE.DirectionalLight(0x7e8ec0, 0.32);
  moonLight.position.set(-14, 22, 10);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.set(1024, 1024);
  moonLight.shadow.camera.left = -30;
  moonLight.shadow.camera.right = 30;
  moonLight.shadow.camera.top = 30;
  moonLight.shadow.camera.bottom = -30;
  scene.add(moonLight);

  entrySpot = new THREE.SpotLight(0xa5b8ff, 0.55, 26, Math.PI / 8, 0.7, 1.3);
  entrySpot.position.set(5, 10, 11);
  entrySpot.target.position.set(0, 1.2, -3);
  entrySpot.castShadow = true;
  entrySpot.shadow.mapSize.set(512, 512);
  scene.add(entrySpot, entrySpot.target);

  midwayLight = new THREE.PointLight(0x8ba5ff, 0.05, 18, 1.5);
  midwayLight.position.set(0, 4, 2);
  midwayLight.userData.baseIntensity = 0.05;
  scene.add(midwayLight);
  flickerLights.push(midwayLight);

  exitLight = new THREE.PointLight(0x67ffad, 0.02, 22, 1.2);
  exitLight.position.set(0, 4.4, 15.2);
  scene.add(exitLight);

  clownLight = new THREE.PointLight(0xb82632, 0.65, 11, 1.7);
  clownLight.position.set(clownBasePosition.x, 3.1, clownBasePosition.z);
  scene.add(clownLight);
}

function createFlashlight() {
  flashlight = new THREE.SpotLight(0xfff0c1, 13.5, 34, Math.PI / 6.8, 0.42, 1.08);
  flashlight.position.set(0, -0.08, 0.04);
  flashlight.target.position.set(0, -0.08, -1.2);
  camera.add(flashlight);
  camera.add(flashlight.target);
}

function createSkybox() {
  const faces = [
    ['#111224', '#020208'],
    ['#12142a', '#030208'],
    ['#161024', '#030208'],
    ['#0e1725', '#030208'],
    ['#1b172c', '#07050a'],
    ['#08070e', '#020204']
  ];
  const skyMaterials = faces.map(([top, bottom], index) => {
    const texture = makeCanvasTexture(384, 384, (ctx, width, height) => {
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, top);
      gradient.addColorStop(1, bottom);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(255, 241, 190, 0.82)';
      const starCount = index === 5 ? 25 : 80;
      for (let i = 0; i < starCount; i += 1) {
        const size = Math.random() > 0.92 ? 2 : 1;
        ctx.globalAlpha = 0.25 + Math.random() * 0.7;
        ctx.fillRect(Math.random() * width, Math.random() * height * 0.72, size, size);
      }
      ctx.globalAlpha = 1;
      if (index === 0) {
        ctx.fillStyle = 'rgba(236, 221, 174, 0.78)';
        ctx.beginPath();
        ctx.arc(292, 88, 28, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    return new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide, fog: false });
  });
  const skybox = new THREE.Mesh(new THREE.BoxGeometry(520, 520, 520), skyMaterials);
  skybox.name = 'textured skybox';
  scene.add(skybox);
}

function createGround() {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), materials.ground);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const impactMark = new THREE.Mesh(
    new THREE.RingGeometry(2.6, 7.6, 80),
    new THREE.MeshStandardMaterial({ color: 0x2a2a24, roughness: 0.92, metalness: 0.02 })
  );
  impactMark.rotation.x = -Math.PI / 2;
  impactMark.position.set(0, 0.018, -11.8);
  impactMark.receiveShadow = true;
  scene.add(impactMark);
}

function createWarehouseShell() {
  const warehouse = new THREE.Group();
  warehouse.name = 'abandoned crash testing warehouse';

  addBox(warehouse, [42, 7.2, 0.5], [0, 3.6, -19.3], materials.concrete);
  addBox(warehouse, [42, 7.2, 0.5], [0, 3.6, 18.2], materials.concrete);
  addBox(warehouse, [0.5, 7.2, 38], [-21.2, 3.6, -0.5], materials.concrete);
  addBox(warehouse, [0.5, 7.2, 38], [21.2, 3.6, -0.5], materials.concrete);
  addGrimePlane(warehouse, [38, 22], [0, 0.04, -0.5], -Math.PI / 2, 0);
  addGrimePlane(warehouse, [32, 5.8], [0, 3.4, -19.02], 0, 0);
  addGrimePlane(warehouse, [32, 5.8], [0, 3.4, 17.92], 0, Math.PI);

  for (let i = -4; i <= 4; i += 1) {
    addBox(warehouse, [1.1, 0.32, 38], [i * 5, 7.25, -0.5], materials.rust);
  }

  for (let i = -3; i <= 3; i += 1) {
    const windowMaterial = materials.dimBulb.clone();
    windowMaterial.userData.power = 0.12;
    windowMaterial.emissive.setHex(0xffd18a);
    const window = addBox(warehouse, [2.2, 0.08, 1.0], [i * 5.3, 5.5, 17.92], windowMaterial);
    window.castShadow = false;
    poweredObjects.push({ material: windowMaterial, target: 1.05 });
    flickerMaterials.push(windowMaterial);
  }

  scene.add(warehouse);
  addBoxCollider(0, -19.3, 21.5, 0.45);
  addBoxCollider(0, 18.2, 21.5, 0.45);
  addBoxCollider(-21.2, -0.5, 0.45, 19.2);
  addBoxCollider(21.2, -0.5, 0.45, 19.2);
}

function createCrashTestWarehouse() {
  createCrashLane();
  createCrashBarriers();
  createOverheadTestLights();
  createCrashProps();
  createExitGate();
}

function createCrashLane() {
  addBox(scene, [5.2, 0.035, 30], [0, 0.04, -1.5], materials.concrete).receiveShadow = true;
  for (let i = -6; i <= 5; i += 1) {
    addBox(scene, [0.18, 0.02, 1.25], [-1.4, 0.075, i * 2.35], materials.lanePaint);
    addBox(scene, [0.18, 0.02, 1.25], [1.4, 0.075, i * 2.35], materials.lanePaint);
  }
  addSignFace('CRASH BAY', scene, [0, 4.7, -17.75], 4.4, 0.68, 0);
  addSignFace('TEST FLOOR', scene, [-16.6, 3.4, -3.2], 3.5, 0.58, Math.PI / 2);
}

function createCrashBarriers() {
  const barrierPositions = [
    [-4.1, -12.8], [4.1, -12.8], [-4.1, -8.8], [4.1, -8.8],
    [-4.1, -4.8], [4.1, -4.8], [-4.1, -0.8], [4.1, -0.8],
    [-4.1, 3.2], [4.1, 3.2]
  ];
  barrierPositions.forEach(([x, z], index) => {
    const barrier = new THREE.Group();
    barrier.position.set(x, 0, z);
    barrier.rotation.y = index % 2 ? 0.08 : -0.08;
    addBox(barrier, [1.25, 0.78, 0.55], [0, 0.39, 0], index % 2 ? materials.safetyYellow : materials.hazardBlack);
    addBox(barrier, [1.25, 0.12, 0.58], [0, 0.88, 0], materials.rust);
    scene.add(barrier);
    addBoxCollider(x, z, 0.92, 0.55);
  });

  for (let i = 0; i < 10; i += 1) {
    const cone = new THREE.Mesh(shared.cone, materials.safetyYellow);
    cone.position.set(-2.35 + (i % 2) * 4.7, 0.45, -13 + i * 2.4);
    cone.rotation.y = i * 0.4;
    enableShadows(cone, false);
    scene.add(cone);
  }
}

function createOverheadTestLights() {
  for (let i = -3; i <= 3; i += 1) {
    addBox(scene, [4.4, 0.18, 0.18], [0, 6.4, i * 4.1], materials.rust);
    const lampMaterial = materials.dimBulb.clone();
    lampMaterial.userData.power = 0.05;
    lampMaterial.emissive.setHex(0xbfd2ff);
    const lamp = addBox(scene, [2.2, 0.05, 0.32], [0, 6.12, i * 4.1], lampMaterial);
    lamp.castShadow = false;
    poweredObjects.push({ material: lampMaterial, target: 2.1 });
    flickerMaterials.push(lampMaterial);
  }
}

function createCrashProps() {
  const cratePositions = [[-12, 0.35, 2], [-10.9, 0.35, 2.9], [9.2, 0.35, -7.7], [8.4, 1.0, -7.7]];
  cratePositions.forEach((position, index) => {
    const crate = addBox(scene, [1, 0.7, 1], position, index % 2 ? materials.rust : materials.hazardBlack);
    crate.rotation.y = index * 0.33;
    addBoxCollider(position[0], position[2], 0.75, 0.75);
  });

  for (let i = 0; i < 6; i += 1) {
    const tire = new THREE.Mesh(shared.tire, materials.black);
    tire.position.set(12.6, 0.65 + i * 0.05, -9 + i * 1.05);
    tire.rotation.set(Math.PI / 2, i * 0.24, 0);
    enableShadows(tire, false);
    scene.add(tire);
    addCircleCollider(12.6, -9 + i * 1.05, 0.72);
  }

  addBox(scene, [3.2, 0.16, 2.2], [0, 0.09, -14.8], materials.redWarning);
  addBoxCollider(0, -14.8, 1.75, 1.2);
}

function addGrimePlane(parent, size, position, rotationX = 0, rotationY = 0) {
  const grime = new THREE.Mesh(new THREE.PlaneGeometry(size[0], size[1]), materials.grime);
  grime.position.set(position[0], position[1], position[2]);
  grime.rotation.x = rotationX;
  grime.rotation.y = rotationY;
  grime.castShadow = false;
  grime.receiveShadow = false;
  parent.add(grime);
  return grime;
}

function createExitGate() {
  const gate = new THREE.Group();
  gate.name = 'powered exit gate';
  gate.position.set(0, 0, 15.5);
  addCylinder(gate, 0.18, 4.6, [-2.5, 2.3, 0], materials.wood);
  addCylinder(gate, 0.18, 4.6, [2.5, 2.3, 0], materials.wood);
  addCircleCollider(-2.5, 15.5, 0.58);
  addCircleCollider(2.5, 15.5, 0.58);
  addBox(gate, [5.7, 0.42, 0.55], [0, 4.4, 0], materials.fadedGold);
  gateLeft = addBox(gate, [2.05, 2.65, 0.16], [-1.1, 1.45, -0.15], materials.rust);
  gateRight = addBox(gate, [2.05, 2.65, 0.16], [1.1, 1.45, -0.15], materials.rust);
  const exitSign = addSignFace('EXIT', gate, [0, 4.42, -0.31], 4.4, 0.68, Math.PI);
  poweredObjects.push({ material: exitSign.material, target: 2.25 });
  scene.add(gate);
}

function createGenerator() {
  generatorGroup = new THREE.Group();
  generatorGroup.name = 'spark plug generator objective';
  generatorGroup.position.set(generatorPosition.x, 0, generatorPosition.z);
  generatorGroup.rotation.y = Math.PI * 0.12;

  addBox(generatorGroup, [2.7, 1.55, 1.45], [0, 0.8, 0], materials.generator);
  addBox(generatorGroup, [2.95, 0.16, 1.65], [0, 1.62, 0], materials.rust);
  addCylinder(generatorGroup, 0.16, 1.75, [-1.05, 0.95, 0.84], materials.rust, Math.PI / 2);
  addCylinder(generatorGroup, 0.16, 1.75, [1.05, 0.95, 0.84], materials.rust, Math.PI / 2);
  generatorCoreMaterial = materials.generatorCore.clone();
  generatorCoreMaterial.userData.power = 0.18;
  const core = addBox(generatorGroup, [1.15, 0.72, 0.08], [0, 1.05, 0.76], generatorCoreMaterial);
  core.castShadow = false;
  const fusePanel = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.74), materials.fusePanel);
  fusePanel.position.set(0, 1.05, 0.805);
  fusePanel.castShadow = false;
  fusePanel.receiveShadow = true;
  generatorGroup.add(fusePanel);
  addSignFace('FUSE BOX', generatorGroup, [0, 1.86, 0.84], 2.1, 0.42);

  scene.add(generatorGroup);
  poweredObjects.push({ material: generatorCoreMaterial, target: 2.4 });
  flickerMaterials.push(generatorCoreMaterial);
  addBoxCollider(generatorPosition.x, generatorPosition.z, 1.65, 1.15);
  createFuseBoxMarker();
}

function createFuseBoxMarker() {
  fuseBoxMarker = new THREE.Group();
  fuseBoxMarker.name = 'red fuse box direction marker';
  fuseBoxMarker.position.set(generatorPosition.x, 4.1, generatorPosition.z + 0.35);

  fuseBoxMarkerMaterial = materials.markerRed.clone();
  const arrowHead = new THREE.Mesh(shared.cone, fuseBoxMarkerMaterial);
  arrowHead.name = 'downward red fuse box arrow';
  arrowHead.scale.set(1.25, 1.45, 1.25);
  arrowHead.rotation.z = Math.PI;
  arrowHead.castShadow = false;
  arrowHead.receiveShadow = false;
  fuseBoxMarker.add(arrowHead);

  const arrowStem = new THREE.Mesh(shared.pole, fuseBoxMarkerMaterial);
  arrowStem.position.y = 0.88;
  arrowStem.scale.set(1.2, 1.1, 1.2);
  arrowStem.castShadow = false;
  arrowStem.receiveShadow = false;
  fuseBoxMarker.add(arrowStem);

  const glowRing = new THREE.Mesh(shared.glowRing, materials.markerGlow.clone());
  glowRing.position.y = -0.58;
  glowRing.rotation.x = Math.PI / 2;
  glowRing.scale.set(1.35, 1.35, 1.35);
  glowRing.castShadow = false;
  glowRing.receiveShadow = false;
  fuseBoxMarker.add(glowRing);

  scene.add(fuseBoxMarker);
}

function createCollectibles() {
  const positions = [
    [-5.5, 1.0, 2.6],
    [6.2, 1.15, -1.4],
    [0.2, 1.0, -8.5],
    [-12.7, 1.2, -6.3],
    [10.2, 1.1, 3.7],
    [-2.2, 1.0, 10.2],
    [13.3, 1.25, -8.8]
  ];

  positions.forEach((position, index) => {
    const collectible = new THREE.Group();
    collectible.position.set(...position);
    collectible.userData = { collectibleId: index, baseY: position[1], collected: false };

    createSparkPlugModel(collectible);

    collectibles.push(collectible);
    scene.add(collectible);
  });
}

function createSparkPlugModel(parent) {
  const visual = new THREE.Group();
  visual.name = 'spark plug visual';
  parent.add(visual);

  if (sparkPlugTemplate) {
    addSparkPlugTemplateClone(visual);
  } else {
    addProceduralSparkPlug(visual);
  }

  const ring = new THREE.Mesh(shared.glowRing, materials.sparkGlow.clone());
  ring.position.y = -parent.userData.baseY + 0.075;
  ring.rotation.x = Math.PI / 2;
  ring.scale.set(0.82, 0.82, 0.82);
  ring.name = 'spark plug pickup glow ring';
  parent.add(ring);
}

function addProceduralSparkPlug(parent) {
  const ceramic = new THREE.Mesh(shared.plugCeramic, materials.sparkCeramic);
  ceramic.rotation.x = Math.PI / 2;
  ceramic.castShadow = false;
  ceramic.receiveShadow = true;
  parent.add(ceramic);

  const metalBody = new THREE.Mesh(shared.plugMetal, materials.sparkMetal);
  metalBody.rotation.x = Math.PI / 2;
  metalBody.position.z = -0.42;
  metalBody.castShadow = false;
  metalBody.receiveShadow = true;
  parent.add(metalBody);

  const topTip = new THREE.Mesh(shared.plugTip, materials.sparkMetal);
  topTip.rotation.x = Math.PI / 2;
  topTip.position.z = 0.52;
  topTip.castShadow = false;
  parent.add(topTip);

  const electrode = new THREE.Mesh(shared.plugTip, materials.sparkMetal);
  electrode.scale.set(0.7, 0.7, 0.7);
  electrode.rotation.z = Math.PI / 2;
  electrode.position.set(0.2, 0, -0.66);
  electrode.castShadow = false;
  parent.add(electrode);
}

function addSparkPlugTemplateClone(parent) {
  const plug = sparkPlugTemplate.clone(true);
  plug.position.y = -0.45;
  plug.rotation.y = Math.PI * 0.18;
  plug.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(plug);
  const center = box.getCenter(new THREE.Vector3());
  plug.position.x -= center.x;
  plug.position.z -= center.z;
  parent.add(plug);
}

function applySparkPlugTemplateToCollectibles() {
  collectibles.forEach((collectible) => {
    const visual = collectible.children.find((child) => child.name === 'spark plug visual');
    if (!visual) return;
    visual.clear();
    addSparkPlugTemplateClone(visual);
  });
}

function loadModels() {
  loadGltf('./Spark%20plug.glb', (model) => {
    fitModelToHeight(model, 0.9);
    sparkPlugTemplate = model;
    applySparkPlugTemplateToCollectibles();
  }, () => {
    console.warn('Spark plug GLB failed to load. Procedural spark plug pickups remain visible.');
  });

  loadGltf('./Broken%20Car.glb', (model) => {
    const car = new THREE.Group();
    car.name = 'loaded broken crash test car glb';
    fitModelToHeight(model, 1.45);
    car.add(model);
    car.position.set(0, 0, -12.2);
    car.rotation.y = -Math.PI * 0.08;
    scene.add(car);
    addBoxCollider(0, -12.2, 2.25, 1.35);
  }, () => {
    console.warn('Broken car GLB failed to load.');
  });

  const containerPlacements = [
    { position: [-14.6, 0, -9.2], rotation: Math.PI / 2 },
    { position: [14.8, 0, 6.2], rotation: -Math.PI / 2 }
  ];
  containerPlacements.forEach((placement) => {
    loadGltf('./Container%20Green.glb', (model) => {
      const container = new THREE.Group();
      container.name = 'loaded green cargo container glb';
      fitModelToHeight(model, 2.4);
      container.add(model);
      container.position.set(placement.position[0], placement.position[1], placement.position[2]);
      container.rotation.y = placement.rotation;
      scene.add(container);
      addBoxCollider(placement.position[0], placement.position[2], 1.8, 3.4);
    }, () => {
      console.warn('Container Green GLB failed to load.');
    });
  });

  const barrelPlacements = [
    [-8.2, 0, -5.2], [-7.4, 0, -4.4], [7.2, 0, -2.7], [9.1, 0, 2.8], [-13.5, 0, 5.3]
  ];
  barrelPlacements.forEach((position, index) => {
    loadGltf('./Barrel.glb', (model) => {
      const barrel = new THREE.Group();
      barrel.name = 'loaded barrel glb';
      fitModelToHeight(model, 1.05);
      barrel.add(model);
      barrel.position.set(position[0], position[1], position[2]);
      barrel.rotation.y = index * 0.42;
      scene.add(barrel);
      addCircleCollider(position[0], position[2], 0.68);
    }, () => {
      console.warn('Barrel GLB failed to load.');
    });
  });

  loadGltf('./Animated%20Base%20Character.glb', (model, gltf) => {
    clownRoot = new THREE.Group();
    clownRoot.name = 'loaded animated clown character glb';
    fitModelToHeight(model, 3.0);
    clownRoot.add(model);
    clownRoot.position.copy(clownBasePosition);
    clownRoot.rotation.y = -Math.PI * 0.72;
    scene.add(clownRoot);
    setupClownAnimations(gltf);
    playClownAction('idle', 0);
  }, () => {
    console.warn('Animated character GLB failed to load. Procedural chaser fallback is being used.');
    clownRoot = createFallbackClown();
    scene.add(clownRoot);
  });
}

function loadGltf(path, onLoad, onError) {
  gltfLoader.load(
    path,
    (gltf) => {
      gltf.scene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          const meshMaterials = Array.isArray(child.material) ? child.material : [child.material];
          meshMaterials.filter(Boolean).forEach((material) => {
            if ('roughness' in material) {
              material.roughness = Math.max(material.roughness ?? 0.6, 0.55);
            }
          });
        }
      });
      onLoad(gltf.scene, gltf);
    },
    undefined,
    (error) => {
      console.error(`Could not load ${path}`, error);
      onError?.();
    }
  );
}

function setupClownAnimations(gltf) {
  if (!gltf.animations || gltf.animations.length === 0) return;
  clownMixer = new THREE.AnimationMixer(gltf.scene);
  mixers.push(clownMixer);

  const findClip = (name) => gltf.animations.find((clip) => clip.name === name || clip.name.endsWith(name));
  const idleClip = findClip('Idle_Loop');
  const jogClip = findClip('Jog_Fwd_Loop') || findClip('Sprint_Loop');
  const staggerClip = findClip('Hit_Chest') || findClip('Hit_Head');

  clownActions = {
    idle: idleClip ? clownMixer.clipAction(idleClip) : null,
    chase: jogClip ? clownMixer.clipAction(jogClip) : null,
    run: findClip('Sprint_Loop') ? clownMixer.clipAction(findClip('Sprint_Loop')) : null,
    stagger: staggerClip ? clownMixer.clipAction(staggerClip) : null
  };

  Object.values(clownActions).filter(Boolean).forEach((action) => {
    action.enabled = true;
    action.clampWhenFinished = false;
  });
  if (clownActions.stagger) {
    clownActions.stagger.setLoop(THREE.LoopOnce);
    clownActions.stagger.clampWhenFinished = true;
  }
}

function playClownAction(name, fadeTime = 0.18) {
  const nextAction = clownActions[name] || (name === 'run' ? clownActions.chase : null);
  if (!nextAction || nextAction === activeClownAction) return;

  nextAction.reset();
  nextAction.play();
  if (activeClownAction) {
    activeClownAction.crossFadeTo(nextAction, fadeTime, false);
  }
  activeClownAction = nextAction;
}

function fitModelToHeight(root, targetHeight) {
  let box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  if (size.y > 0) {
    const scale = targetHeight / size.y;
    root.scale.multiplyScalar(scale);
  }
  root.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= box.min.y;
}

function createFallbackClown() {
  const clown = new THREE.Group();
  clown.name = 'fallback clown made from primary shapes';
  clown.position.copy(clownBasePosition);
  addCylinder(clown, 0.45, 1.7, [0, 0.85, 0], materials.fadedRed);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.48, 20, 14), materials.bone);
  head.position.y = 1.95;
  clown.add(head);
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.85, 20), materials.fadedGold);
  hat.position.y = 2.65;
  clown.add(hat);
  [-0.42, 0.42].forEach((x) => addCylinder(clown, 0.1, 1.1, [x, 0.7, 0], materials.bone, 0.2 * Math.sign(x)));
  clown.traverse((child) => enableShadows(child));
  return clown;
}

function makeSignTexture(text) {
  return makeCanvasTexture(512, 180, (ctx, width, height) => {
    ctx.fillStyle = '#2a1513';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(255, 219, 148, 0.08)';
    for (let x = 0; x < width; x += 34) {
      ctx.fillRect(x, 0, 2, height);
    }
    ctx.strokeStyle = 'rgba(255, 215, 150, 0.72)';
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, width - 20, height - 20);
    ctx.fillStyle = '#efd28c';
    ctx.font = 'bold 72px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height / 2 + 4);
  });
}

function addSignFace(text, parent, position, width, height, rotationY = 0) {
  const material = new THREE.MeshStandardMaterial({
    map: makeSignTexture(text),
    emissive: 0x4b2b10,
    emissiveIntensity: 0.2,
    roughness: 0.55
  });
  material.userData.power = 0.2;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  sign.position.set(...position);
  sign.rotation.y = rotationY;
  sign.castShadow = false;
  sign.receiveShadow = true;
  parent.add(sign);
  return sign;
}

function addBox(parent, size, position, material) {
  const mesh = new THREE.Mesh(shared.box, material);
  mesh.scale.set(size[0], size[1], size[2]);
  mesh.position.set(position[0], position[1], position[2]);
  enableShadows(mesh);
  parent.add(mesh);
  return mesh;
}

function addCylinder(parent, radius, height, position, material, zRotation = 0) {
  const mesh = new THREE.Mesh(shared.pole, material);
  mesh.scale.set(radius / 0.1, height, radius / 0.1);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.rotation.z = zRotation;
  enableShadows(mesh);
  parent.add(mesh);
  return mesh;
}

function enableShadows(mesh, cast = true) {
  if (!mesh || !mesh.isMesh) return;
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
}

function addBoxCollider(x, z, halfX, halfZ) {
  colliders.push({ type: 'box', x, z, halfX, halfZ });
}

function addCircleCollider(x, z, radius) {
  colliders.push({ type: 'circle', x, z, radius });
}

function resolvePlayerCollision(currentPosition, proposedPosition) {
  const resolved = proposedPosition.clone();
  resolved.y = playerStart.y;

  colliders.forEach((collider) => {
    if (collider.type === 'box') {
      const closestX = THREE.MathUtils.clamp(resolved.x, collider.x - collider.halfX, collider.x + collider.halfX);
      const closestZ = THREE.MathUtils.clamp(resolved.z, collider.z - collider.halfZ, collider.z + collider.halfZ);
      const dx = resolved.x - closestX;
      const dz = resolved.z - closestZ;
      const distanceSq = dx * dx + dz * dz;
      if (distanceSq < playerRadius * playerRadius) {
        if (distanceSq === 0) {
          const pushLeft = Math.abs(resolved.x - (collider.x - collider.halfX));
          const pushRight = Math.abs((collider.x + collider.halfX) - resolved.x);
          const pushBack = Math.abs(resolved.z - (collider.z - collider.halfZ));
          const pushForward = Math.abs((collider.z + collider.halfZ) - resolved.z);
          const minPush = Math.min(pushLeft, pushRight, pushBack, pushForward);
          if (minPush === pushLeft) resolved.x = collider.x - collider.halfX - playerRadius;
          else if (minPush === pushRight) resolved.x = collider.x + collider.halfX + playerRadius;
          else if (minPush === pushBack) resolved.z = collider.z - collider.halfZ - playerRadius;
          else resolved.z = collider.z + collider.halfZ + playerRadius;
          return;
        }
        const distance = Math.sqrt(distanceSq) || 0.0001;
        const push = playerRadius - distance;
        resolved.x += (dx / distance) * push;
        resolved.z += (dz / distance) * push;
      }
    } else {
      const dx = resolved.x - collider.x;
      const dz = resolved.z - collider.z;
      const minDistance = playerRadius + collider.radius;
      const distanceSq = dx * dx + dz * dz;
      if (distanceSq < minDistance * minDistance) {
        if (distanceSq === 0) {
          resolved.x = collider.x + minDistance;
          return;
        }
        const distance = Math.sqrt(distanceSq) || 0.0001;
        const push = minDistance - distance;
        resolved.x += (dx / distance) * push;
        resolved.z += (dz / distance) * push;
      }
    }
  });

  if (Number.isNaN(resolved.x) || Number.isNaN(resolved.z)) {
    return currentPosition.clone();
  }

  return resolved;
}

function onCanvasPointerDown() {
  if (gameState === 'intro') return;
  if (!controls.isLocked && gameState !== 'won' && gameState !== 'caught') {
    controls.lock();
    return;
  }
  attemptPickup();
}

function startGame() {
  resetGame({ showIntro: false });
  controls.lock();
}

function toggleFreeCam() {
  if (gameState === 'intro' || gameState === 'won' || gameState === 'caught') return;

  if (!isFreeCam) {
    isFreeCam = true;
    savedCameraPosition.copy(camera.position);
    savedCameraQuaternion.copy(camera.quaternion);
    if (controls.isLocked) controls.unlock();
    camera.position.copy(freeCamPosition);
    camera.lookAt(freeCamTarget);
    cctvOverlay.classList.remove('is-hidden');
    freeCamButton.textContent = 'Resume';
    messageEl.textContent = 'CCTV Camera View: gameplay is paused for an indoor security camera inspection.';
  } else {
    isFreeCam = false;
    camera.position.copy(savedCameraPosition);
    camera.quaternion.copy(savedCameraQuaternion);
    cctvOverlay.classList.add('is-hidden');
    freeCamButton.textContent = 'CCTV View';
    messageEl.textContent = 'CCTV view closed. Click the scene to resume movement.';
  }

  updateHud();
}

function onKeyDown(event) {
  switch (event.code) {
    case 'KeyW':
    case 'ArrowUp':
      keys.forward = true;
      break;
    case 'KeyS':
    case 'ArrowDown':
      keys.backward = true;
      break;
    case 'KeyA':
    case 'ArrowLeft':
      keys.left = true;
      break;
    case 'KeyD':
    case 'ArrowRight':
      keys.right = true;
      break;
    case 'ShiftLeft':
    case 'ShiftRight':
      keys.sprint = true;
      break;
    case 'KeyE':
      attemptPickup();
      break;
    case 'KeyF':
      toggleFreeCam();
      break;
    default:
      break;
  }
}

function onKeyUp(event) {
  switch (event.code) {
    case 'KeyW':
    case 'ArrowUp':
      keys.forward = false;
      break;
    case 'KeyS':
    case 'ArrowDown':
      keys.backward = false;
      break;
    case 'KeyA':
    case 'ArrowLeft':
      keys.left = false;
      break;
    case 'KeyD':
    case 'ArrowRight':
      keys.right = false;
      break;
    case 'ShiftLeft':
    case 'ShiftRight':
      keys.sprint = false;
      break;
    default:
      break;
  }
}

function attemptPickup() {
  if (isFreeCam || gameState === 'won' || gameState === 'caught') return;

  if (gameState === 'generatorReady') {
    if (camera.position.distanceTo(generatorPosition) <= generatorRadius) {
      activateGenerator();
    } else {
      messageEl.textContent = 'All spark plugs collected. Get to the generator and press E.';
    }
    return;
  }

  const player = camera.position;
  let nearest = null;
  let nearestDistance = Infinity;

  collectibles.forEach((collectible, index) => {
    if (collectible.userData.collected) return;
    const distance = collectible.position.distanceTo(player);
    if (distance < nearestDistance) {
      nearest = index;
      nearestDistance = distance;
    }
  });

  if (nearest !== null && nearestDistance <= pickupRadius) {
    collectSparkPlug(nearest);
    return;
  }

  messageEl.textContent = 'Move closer to a spark plug before collecting it.';
}

function collectSparkPlug(id) {
  const collectible = collectibles[id];
  if (!collectible || collectible.userData.collected) return;

  collectible.userData.collected = true;
  collectible.visible = false;
  collected += 1;
  if (generatorCoreMaterial) {
    generatorCoreMaterial.userData.power = 0.18 + collected * 0.18;
    generatorCoreMaterial.emissiveIntensity = generatorCoreMaterial.userData.power;
  }

  if (collected >= totalSparkPlugs) {
    gameState = 'generatorReady';
    messageEl.textContent = 'All spark plugs found. Install them at the generator to restore the lights.';
    playClownAction('chase', 0.12);
  } else if (collected >= wakeThreshold && gameState === 'searching') {
    wakeClown('The chaser is awake. Use the flashlight to slow it and keep moving.');
  } else {
    messageEl.textContent = 'Spark plug found. The generator is one step closer.';
  }

  updateHud();
}

function activateGenerator() {
  gameState = 'gateOpen';
  generatorSequenceTime = 3.4;
  surgeTimer = 3.4;
  scene.fog.density = 0.026;
  restorePowerZone(totalSparkPlugs);
  exitLight.intensity = 3.8;
  ambientLight.intensity = 0.8;
  hemisphereLight.intensity = 1.1;
  moonLight.intensity = 1.2;
  entrySpot.intensity = 2.5;
  midwayLight.userData.baseIntensity = 2.25;
  midwayLight.intensity = 2.25;
  if (generatorCoreMaterial) {
    generatorCoreMaterial.userData.power = 3.2;
    generatorCoreMaterial.emissiveIntensity = 3.2;
  }
  poweredObjects.forEach((powered, index) => {
    powered.material.userData.surgeDelay = index * 0.075;
  });
  wakeClown('The generator roars on. The chaser is furious. Run to the open EXIT gate.');
  gameState = 'gateOpen';
  playClownAction('run', 0.1);
  messageEl.textContent = 'Lights restored. The EXIT gate is opening. Run.';
  updateHud();
}

function wakeClown(message) {
  if (gameState === 'searching') {
    gameState = 'chasing';
    messageEl.textContent = message;
    scene.fog.density = 0.022;
    playClownAction('chase', 0.2);
  }
}

function restorePowerZone(powerLevel) {
  const zoneCount = Math.ceil((powerLevel / totalSparkPlugs) * poweredObjects.length);
  poweredObjects.forEach((powered, index) => {
    const target = index < zoneCount ? powered.target : 0.2;
    powered.material.userData.power = target;
    powered.material.emissiveIntensity = target;
  });
  midwayLight.userData.baseIntensity = THREE.MathUtils.lerp(0.32, 1.55, powerLevel / totalSparkPlugs);
  midwayLight.intensity = midwayLight.userData.baseIntensity;
}

function updateHud() {
  scoreEl.textContent = `${collected} / ${totalSparkPlugs}`;
  staminaEl.textContent = `${Math.round(stamina)}%`;
  const statuses = {
    ready: 'Ready',
    intro: 'Start',
    searching: 'Searching',
    chasing: 'Awake',
    generatorReady: 'Generator',
    gateOpen: 'Furious',
    won: 'Escaped',
    caught: 'Caught'
  };
  statusEl.textContent = isFreeCam ? 'CCTV' : statuses[gameState] ?? 'Searching';
}

function resetGame({ showIntro = false } = {}) {
  collected = 0;
  stamina = 100;
  gameState = showIntro ? 'intro' : 'ready';
  roundStartTime = clock.elapsedTime;
  clownVelocity.set(0, 0, 0);
  staggerTimer = 0;
  surgeTimer = 0;
  generatorSequenceTime = 0;
  isFreeCam = false;
  freeCamButton.textContent = 'CCTV View';
  cctvOverlay.classList.add('is-hidden');
  scene.fog.density = 0.034;
  ambientLight.intensity = 0.18;
  hemisphereLight.intensity = 0.26;
  moonLight.intensity = 0.32;
  entrySpot.intensity = 0.55;
  camera.position.copy(playerStart);
  camera.rotation.set(0, 0, 0);
  controls.getObject().rotation.set(0, 0, 0);

  if (clownRoot) {
    clownRoot.position.copy(clownBasePosition);
    clownRoot.rotation.y = -Math.PI * 0.72;
    playClownAction('idle', 0.12);
  }

  collectibles.forEach((collectible) => {
    collectible.visible = true;
    collectible.userData.collected = false;
    collectible.rotation.set(0, 0, 0);
    const visual = collectible.children.find((child) => child.name === 'spark plug visual');
    const ring = collectible.children.find((child) => child.name === 'spark plug pickup glow ring');
    if (visual) visual.position.y = 0;
    if (ring) {
      ring.position.y = -collectible.userData.baseY + 0.075;
      ring.scale.set(0.82, 0.82, 0.82);
      ring.material.opacity = 0.34;
    }
  });
  poweredObjects.forEach((powered) => {
    powered.material.userData.power = 0.2;
    powered.material.emissiveIntensity = 0.2;
  });
  midwayLight.userData.baseIntensity = 0.05;
  midwayLight.intensity = 0.05;
  exitLight.intensity = 0.02;
  clownLight.intensity = 0.65;
  startOverlay.classList.toggle('is-hidden', !showIntro);
  hideEndOverlay();
  hideGameOverOverlay();
  messageEl.textContent = showIntro
    ? 'Read the instructions, then start the escape.'
    : 'Click the scene, then use WASD to move. Find spark plugs, repair the generator, and escape.';
  updateHud();
}

function animate() {
  const delta = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;

  mixers.forEach((mixer) => mixer.update(delta));
  updatePlayer(delta);
  updateWakeTimer(elapsed);
  animateCollectibles(elapsed);
  animateFuseBoxMarker(elapsed);
  animateLights(elapsed);
  animateGeneratorAndGate(delta, elapsed);
  animateClown(delta, elapsed);
  checkExitWin();
  updateHud();

  renderer.render(scene, camera);
}

function updatePlayer(delta) {
  if (isFreeCam || !controls.isLocked || gameState === 'intro' || gameState === 'ready' || gameState === 'won' || gameState === 'caught') return;

  const forwardAmount = Number(keys.forward) - Number(keys.backward);
  const rightAmount = Number(keys.right) - Number(keys.left);
  const isMoving = forwardAmount !== 0 || rightAmount !== 0;
  const canSprint = keys.sprint && isMoving && stamina > 2;
  const speed = canSprint ? 8.2 : 4.1;

  if (canSprint) {
    stamina = Math.max(0, stamina - delta * 24);
  } else {
    stamina = Math.min(100, stamina + delta * 16);
  }

  if (!isMoving) return;

  tempForward.set(0, 0, -1).applyQuaternion(camera.quaternion);
  tempForward.y = 0;
  tempForward.normalize();
  tempRight.crossVectors(tempForward, new THREE.Vector3(0, 1, 0)).normalize();
  tempVec.set(0, 0, 0)
    .addScaledVector(tempForward, forwardAmount)
    .addScaledVector(tempRight, rightAmount);

  if (tempVec.lengthSq() > 0) {
    tempVec.normalize().multiplyScalar(speed * delta);
    const nextPosition = camera.position.clone().add(tempVec);
    nextPosition.x = THREE.MathUtils.clamp(nextPosition.x, warehouseBounds.minX, warehouseBounds.maxX);
    nextPosition.z = THREE.MathUtils.clamp(nextPosition.z, warehouseBounds.minZ, warehouseBounds.maxZ);
    camera.position.copy(resolvePlayerCollision(camera.position, nextPosition));
  }
}

function updateWakeTimer(elapsed) {
  if (isFreeCam) return;
  if (gameState === 'searching' && elapsed - roundStartTime > wakeDelay) {
    wakeClown('The chaser got tired of waiting. Restore power and run.');
  }
}

function animateGeneratorAndGate(delta, elapsed) {
  if (isFreeCam) return;
  surgeTimer = Math.max(0, surgeTimer - delta);
  const gateProgress = gameState === 'gateOpen' || gameState === 'won' ? 1 : 0;
  if (gateLeft && gateRight) {
    gateLeft.position.x = THREE.MathUtils.damp(gateLeft.position.x, -2.35 * gateProgress - 1.1 * (1 - gateProgress), 5.2, delta);
    gateRight.position.x = THREE.MathUtils.damp(gateRight.position.x, 2.35 * gateProgress + 1.1 * (1 - gateProgress), 5.2, delta);
    gateLeft.rotation.z = THREE.MathUtils.damp(gateLeft.rotation.z, -0.12 * gateProgress, 5.2, delta);
    gateRight.rotation.z = THREE.MathUtils.damp(gateRight.rotation.z, 0.12 * gateProgress, 5.2, delta);
  }

  if (generatorGroup && gameState === 'gateOpen') {
    generatorSequenceTime = Math.max(0, generatorSequenceTime - delta);
    generatorGroup.position.y = Math.sin(elapsed * 32) * (generatorSequenceTime > 0 ? 0.025 : 0.008);
    const surgeProgress = THREE.MathUtils.clamp((3.4 - surgeTimer) / 3.4, 0, 1);
    const exponentialRamp = surgeProgress * surgeProgress;
    const blackoutPulse = surgeTimer > 2.7 ? 0.12 : 1;
    const flicker = 0.72 + Math.abs(Math.sin(elapsed * 23)) * 0.55;
    ambientLight.intensity = THREE.MathUtils.lerp(0.06, 0.95, exponentialRamp);
    hemisphereLight.intensity = THREE.MathUtils.lerp(0.08, 1.25, exponentialRamp);
    moonLight.intensity = THREE.MathUtils.lerp(0.08, 1.35, exponentialRamp);
    entrySpot.intensity = THREE.MathUtils.lerp(0.12, 2.8, exponentialRamp);
    midwayLight.userData.baseIntensity = THREE.MathUtils.lerp(0.03, 2.4, exponentialRamp) * blackoutPulse * flicker;
    midwayLight.intensity = midwayLight.userData.baseIntensity;
    exitLight.intensity = THREE.MathUtils.lerp(0.04, 3.8, exponentialRamp) + Math.abs(Math.sin(elapsed * 9.5)) * 1.4;
    poweredObjects.forEach((powered, index) => {
      const delay = powered.material.userData.surgeDelay ?? index * 0.075;
      const wave = THREE.MathUtils.clamp((3.4 - surgeTimer - delay) * 2.2, 0, 1);
      const easedWave = wave * wave;
      const pulse = 0.82 + Math.abs(Math.sin(elapsed * 12 + index)) * 0.28;
      powered.material.emissiveIntensity = THREE.MathUtils.lerp(0.04, powered.target * pulse, easedWave);
    });
    if (generatorCoreMaterial) {
      generatorCoreMaterial.emissiveIntensity = 2.4 + Math.abs(Math.sin(elapsed * 18)) * 1.3;
    }
  } else if (generatorGroup) {
    generatorGroup.position.y = THREE.MathUtils.damp(generatorGroup.position.y, 0, 5, delta);
  }
}

function animateCollectibles(elapsed) {
  collectibles.forEach((collectible, index) => {
    if (collectible.userData.collected) return;
    const visual = collectible.children.find((child) => child.name === 'spark plug visual');
    const ring = collectible.children.find((child) => child.name === 'spark plug pickup glow ring');
    if (visual) {
      visual.position.y = Math.sin(elapsed * 2.7 + index) * 0.16;
    }
    if (ring) {
      const pulse = 0.78 + Math.abs(Math.sin(elapsed * 3.2 + index)) * 0.18;
      ring.scale.set(pulse, pulse, pulse);
      ring.material.opacity = 0.24 + Math.abs(Math.sin(elapsed * 3.2 + index)) * 0.18;
    }
  });
}

function animateFuseBoxMarker(elapsed) {
  if (!fuseBoxMarker) return;
  const shouldShow = gameState !== 'gateOpen' && gameState !== 'won' && gameState !== 'caught';
  fuseBoxMarker.visible = shouldShow;
  if (!shouldShow) return;

  const urgency = collected === totalSparkPlugs ? 1 : 0.58;
  fuseBoxMarker.position.y = 4.1 + Math.sin(elapsed * 3.4) * 0.18;
  fuseBoxMarker.scale.setScalar(1 + Math.sin(elapsed * 5.2) * 0.05);
  if (fuseBoxMarkerMaterial) {
    fuseBoxMarkerMaterial.emissiveIntensity = urgency * (1.45 + Math.abs(Math.sin(elapsed * 6.4)) * 1.15);
  }
}

function animateLights(elapsed) {
  flickerLights.forEach((light, index) => {
    const chaseBoost = gameState === 'chasing' || gameState === 'generatorReady' || gameState === 'gateOpen' ? 0.5 : 0;
    const flicker = Math.sin(elapsed * (7.5 + index * 0.31)) * 0.12 + Math.sin(elapsed * (15.2 + index)) * 0.07;
    light.intensity = Math.max(0.06, (light.userData.baseIntensity ?? 0.18) + flicker + chaseBoost * 0.18);
  });
  flickerMaterials.forEach((material, index) => {
    const base = material.userData.power ?? 0.2;
    material.emissiveIntensity = Math.max(0.12, base + Math.sin(elapsed * 9 + index) * 0.035);
  });
}

function animateClown(delta, elapsed) {
  if (!clownRoot) return;
  if (isFreeCam) {
    playClownAction('idle', 0.2);
    return;
  }

  if (gameState === 'intro' || gameState === 'ready' || gameState === 'searching') {
    playClownAction('idle', 0.2);
    clownRoot.rotation.y = -Math.PI * 0.72 + Math.sin(elapsed * 0.8) * 0.035;
    clownLight.position.set(clownRoot.position.x, 3.1, clownRoot.position.z);
    return;
  }

  if (gameState !== 'chasing' && gameState !== 'generatorReady' && gameState !== 'gateOpen' && gameState !== 'won') return;

  const player = camera.position.clone();
  player.y = 0;
  const current = clownRoot.position.clone();
  current.y = 0;
  const toPlayer = player.sub(current);
  const distance = toPlayer.length();
  const flashlightHit = isFlashlightOnClown(distance);
  const isAngry = gameState === 'gateOpen' || gameState === 'won';
  const baseSpeed = (isAngry ? 3.35 : 2.0) + collected * (isAngry ? 0.48 : 0.34);
  const speed = flashlightHit ? baseSpeed * 0.26 : baseSpeed;
  staggerTimer = Math.max(0, staggerTimer - delta);

  if (flashlightHit && staggerTimer <= 0) {
    staggerTimer = 0.52;
    playClownAction('stagger', 0.08);
  } else if (!flashlightHit && staggerTimer <= 0) {
    playClownAction(isAngry ? 'run' : 'chase', 0.16);
  }

  if (distance > 0.001) {
    const directionToPlayer = toPlayer.normalize();
    clownVelocity.lerp(directionToPlayer.clone().multiplyScalar(speed), flashlightHit ? 0.015 : 0.06);
    if (flashlightHit) {
      clownVelocity.multiplyScalar(0.9);
      clownRoot.position.x += Math.sin(elapsed * 16) * delta * 0.35;
    }
    clownRoot.position.addScaledVector(clownVelocity, delta);
    clownRoot.rotation.y = Math.atan2(directionToPlayer.x, directionToPlayer.z) + clownFacingOffset;
    clownRoot.position.y = Math.sin(elapsed * 8.5) * 0.04;
  }

  clownLight.position.set(clownRoot.position.x, 3.1, clownRoot.position.z);
  clownLight.intensity = flashlightHit ? 0.25 : (isAngry ? 2.2 + Math.sin(elapsed * 11) * 0.45 : 0.95 + collected * 0.12);

  if (gameState !== 'won' && distance < 1.3 && gameState !== 'gateOpen') {
    loseGame('The chaser caught you before the power came back.');
  } else if (gameState !== 'won' && distance < 1.15 && gameState === 'gateOpen') {
    loseGame('The chaser caught you at the gate. Sprint sooner next time.');
  }
}

function isFlashlightOnClown(distance) {
  if (!clownRoot || distance > 18) return false;
  const forward = camera.getWorldDirection(tempForward).normalize();
  const toClown = clownRoot.position.clone().sub(camera.position).normalize();
  return forward.dot(toClown) > 0.9;
}

function checkExitWin() {
  if (gameState !== 'gateOpen') return;
  if (camera.position.distanceTo(exitPosition) <= exitRadius) {
    gameState = 'won';
    scene.fog.density = 0.014;
    messageEl.textContent = 'You escaped through the restored crash bay gate.';
    showEndOverlay();
    if (controls.isLocked) controls.unlock();
  }
}

function showEndOverlay() {
  endOverlay.classList.remove('is-hidden');
}

function hideEndOverlay() {
  endOverlay.classList.add('is-hidden');
}

function loseGame(message) {
  gameState = 'caught';
  messageEl.textContent = `${message} Press Reset to try again.`;
  showGameOverOverlay();
  if (controls.isLocked) controls.unlock();
  updateHud();
}

function showGameOverOverlay() {
  gameOverScoreEl.textContent = `${collected} / ${totalSparkPlugs} recovered`;
  gameOverOverlay.classList.remove('is-hidden');
}

function hideGameOverOverlay() {
  gameOverOverlay.classList.add('is-hidden');
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
