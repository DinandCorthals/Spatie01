const THREE = window.THREE;
const canvas = document.getElementById('gameCanvas');
const healthText = document.getElementById('health');
const blocksText = document.getElementById('blocks');
const woodText = document.getElementById('wood');
const gameStatus = document.getElementById('gameStatus');
const exitDistance = document.getElementById('exitDistance');
const exitArrow = document.getElementById('exitArrow');
const lookPrompt = document.getElementById('lookPrompt');
const crosshair = document.getElementById('crosshair');
const hotbarSlots = [...document.querySelectorAll('.hotbar-slot')];
const inventoryButton = document.getElementById('inventoryButton');
const inventoryPanel = document.getElementById('inventoryPanel');
const inventoryClose = document.getElementById('inventoryClose');
const inventoryItems = [...document.querySelectorAll('.inventory-item')];
const inventoryWood = document.getElementById('inventoryWood');
const inventoryLeaves = document.getElementById('inventoryLeaves');
const inventoryStone = document.getElementById('inventoryStone');
const inventoryWoodItem = document.getElementById('inventoryWoodItem');
const inventoryLeavesItem = document.getElementById('inventoryLeavesItem');
const multiplayerButton = document.getElementById('multiplayerButton');
const multiplayerPanel = document.getElementById('multiplayerPanel');
const multiplayerClose = document.getElementById('multiplayerClose');
const hostButton = document.getElementById('hostButton');
const joinButton = document.getElementById('joinButton');
const joinCodeInput = document.getElementById('joinCode');
const roomCode = document.getElementById('roomCode');
const copyRoomButton = document.getElementById('copyRoomButton');
const startGameButton = document.getElementById('startGameButton');
const playerNameInput = document.getElementById('playerName');
const multiplayerStatus = document.getElementById('multiplayerStatus');
const multiplayerPlayers = document.getElementById('multiplayerPlayers');
const leaveRoomButton = document.getElementById('leaveRoomButton');

if (!THREE) {
  if (gameStatus) gameStatus.textContent = 'Three.js did not load. Check your internet connection and reload.';
  throw new Error('Three.js failed to load from the CDN.');
}

const WORLD_SIZE = 80;
const WORLD_CENTER = WORLD_SIZE / 2;
const SPAWN = { x: 6.5, z: 40.5 };
const EXIT = { x: 73.5, z: 40.5 };
const PLAYER_RADIUS = 0.22;
const WALK_SPEED = 4.2;
const SWIM_SPEED = 2.45;
const JUMP_SPEED = 7.2;
const GRAVITY = 18;
const SWIM_SURFACE = 0.24;
const MOUSE_SENSITIVITY = 0.0022;

const BLOCKS = {
  grass: { solid: false, ground: '#6eaa53' },
  sand: { solid: false, ground: '#d7c275' },
  stone: { solid: true, ground: 'grass', color: '#89949b', height: 0.9, width: 0.78 },
  log: { solid: true, ground: 'grass', color: '#80502e', height: 1.72, width: 0.55 },
  leaves: { solid: true, ground: 'grass', color: '#478449', height: 2.05, width: 0.95 },
  water: { solid: false, ground: '#347e9e' },
  lava: { solid: false, ground: '#9c4e32' },
};

const scene = new THREE.Scene();
scene.background = new THREE.Color('#b5dce4');
scene.fog = new THREE.Fog('#b5dce4', 52, 104);

const camera = new THREE.PerspectiveCamera(76, 7 / 4, 0.08, 120);
camera.rotation.order = 'YXZ';

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
} catch (error) {
  gameStatus.textContent = 'WebGL could not start. Try a browser with hardware acceleration enabled.';
  throw error;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

scene.add(new THREE.HemisphereLight('#e5f6ff', '#596449', 2.2));
const sunlight = new THREE.DirectionalLight('#fff0d1', 2.8);
sunlight.position.set(-18, 28, 16);
sunlight.castShadow = true;
sunlight.shadow.mapSize.set(1024, 1024);
sunlight.shadow.camera.left = -24;
sunlight.shadow.camera.right = 24;
sunlight.shadow.camera.top = 24;
sunlight.shadow.camera.bottom = -24;
sunlight.shadow.bias = -0.0004;
scene.add(sunlight);
scene.add(sunlight.target);

const groundGeometry = new THREE.BoxGeometry(0.98, 0.12, 0.98);
const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
const rockGeometry = new THREE.DodecahedronGeometry(0.5, 0);
const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.58, 1, 7);
const canopyGeometry = new THREE.DodecahedronGeometry(0.5, 0);
const hazardGeometry = new THREE.BoxGeometry(0.96, 0.025, 0.96);
const groundMaterials = {
  grass: new THREE.MeshStandardMaterial({ color: BLOCKS.grass.ground, roughness: 0.96 }),
  sand: new THREE.MeshStandardMaterial({ color: BLOCKS.sand.ground, roughness: 0.96 }),
  water: new THREE.MeshStandardMaterial({ color: BLOCKS.water.ground, roughness: 0.42 }),
  lava: new THREE.MeshStandardMaterial({ color: BLOCKS.lava.ground, roughness: 0.9, emissive: '#6d2007', emissiveIntensity: 0.45 }),
};
const blockMaterials = {
  stone: new THREE.MeshStandardMaterial({ color: BLOCKS.stone.color, roughness: 0.9 }),
  log: new THREE.MeshStandardMaterial({ color: BLOCKS.log.color, roughness: 0.92 }),
  leaves: new THREE.MeshStandardMaterial({ color: BLOCKS.leaves.color, roughness: 1, flatShading: true }),
};
const hazardMaterials = {
  water: new THREE.MeshStandardMaterial({ color: '#49a9ce', transparent: true, opacity: 0.76, roughness: 0.3 }),
  lava: new THREE.MeshStandardMaterial({ color: '#ff702f', emissive: '#f83a00', emissiveIntensity: 1.25, roughness: 0.55 }),
};

const outerGround = new THREE.Mesh(
  new THREE.PlaneGeometry(WORLD_SIZE + 8, WORLD_SIZE + 8),
  new THREE.MeshStandardMaterial({ color: '#667953', roughness: 1 })
);
outerGround.rotation.x = -Math.PI / 2;
outerGround.position.y = -0.18;
outerGround.receiveShadow = true;
scene.add(outerGround);

const player = {
  x: SPAWN.x,
  z: SPAWN.z,
  health: 10,
  blocks: 0,
  wood: 0,
  stone: 0,
  leaves: 0,
  won: false,
  vertical: 0,
  verticalSpeed: 0,
  grounded: true,
  swimming: false,
  selectedSlot: 0,
  yaw: -Math.PI / 2,
  pitch: 0,
};

const keys = Object.create(null);
const raycaster = new THREE.Raycaster();
raycaster.far = 5;
let world = [];
let treeCanopyCells = new Set();
let meshes = [];
let obstacleMeshes = [];
let instanceLookup = new Map();
let waterMesh = null;
let waterPhases = [];
let lastFrame = 0;

const tempMatrix = new THREE.Matrix4();
const tempPosition = new THREE.Vector3();
const tempQuaternion = new THREE.Quaternion();
const tempScale = new THREE.Vector3();
const tempColor = new THREE.Color();
let swingEndsAt = 0;
let actionMessage = '';
let actionMessageUntil = 0;
let peer = null;
let multiplayerRole = 'offline';
let multiplayerHostId = null;
let localPeerId = null;
let networkAccumulator = 0;
const peerConnections = new Map();
const remotePlayers = new Map();

function worldX(x) {
  return x - WORLD_CENTER;
}

function worldZ(z) {
  return z - WORLD_CENTER;
}

function makeWorld() {
  treeCanopyCells = new Set();
  world = Array.from({ length: WORLD_SIZE }, (_, z) =>
    Array.from({ length: WORLD_SIZE }, (_, x) => {
      const inStartClearing = Math.hypot(x + 0.5 - SPAWN.x, z + 0.5 - SPAWN.z) < 5;
      const nearExit = Math.hypot(x + 0.5 - EXIT.x, z + 0.5 - EXIT.z) < 4;
      if (inStartClearing || nearExit || Math.abs(z + 0.5 - SPAWN.z) < 2.5) return 'grass';

      const roll = Math.random();
      const terrainShape = Math.sin(x * 0.11) + Math.cos(z * 0.1) + Math.sin((x + z) * 0.06);
      if (terrainShape > 1.8 && roll < 0.43) return 'sand';
      if (roll < 0.014) return 'stone';
      return 'grass';
    })
  );

  const safeFeatureCell = (x, z) =>
    Math.abs(z + 0.5 - SPAWN.z) < 4 ||
    Math.hypot(x + 0.5 - SPAWN.x, z + 0.5 - SPAWN.z) < 9 ||
    Math.hypot(x + 0.5 - EXIT.x, z + 0.5 - EXIT.z) < 8;

  const lakes = [];
  for (let attempt = 0; attempt < 24 && lakes.length < 7; attempt += 1) {
    const centerX = 10 + Math.floor(Math.random() * (WORLD_SIZE - 20));
    const centerZ = 8 + Math.floor(Math.random() * (WORLD_SIZE - 16));
    const radiusX = 2.4 + Math.random() * 2.1;
    const radiusZ = 2 + Math.random() * 2;
    if (safeFeatureCell(centerX, centerZ)) continue;
    if (lakes.some((lake) => Math.hypot(lake.x - centerX, lake.z - centerZ) < 10)) continue;
    lakes.push({ x: centerX, z: centerZ, radiusX, radiusZ });
  }

  for (const lake of lakes) {
    for (let z = Math.floor(lake.z - lake.radiusZ - 1); z <= lake.z + lake.radiusZ + 1; z += 1) {
      for (let x = Math.floor(lake.x - lake.radiusX - 1); x <= lake.x + lake.radiusX + 1; x += 1) {
        if (x < 2 || z < 2 || x >= WORLD_SIZE - 2 || z >= WORLD_SIZE - 2 || safeFeatureCell(x, z)) continue;
        const edgeNoise = Math.sin(x * 3.7 + z * 1.9) * 0.12;
        const ellipse = ((x + 0.5 - lake.x) / lake.radiusX) ** 2 + ((z + 0.5 - lake.z) / lake.radiusZ) ** 2;
        if (ellipse < 1 + edgeNoise) world[z][x] = 'water';
      }
    }
  }

  const shoreline = [];
  for (let z = 2; z < WORLD_SIZE - 2; z += 1) {
    for (let x = 2; x < WORLD_SIZE - 2; x += 1) {
      if (world[z][x] !== 'grass' || safeFeatureCell(x, z)) continue;
      const touchesWater = world[z - 1][x] === 'water' || world[z + 1][x] === 'water' ||
        world[z][x - 1] === 'water' || world[z][x + 1] === 'water';
      if (touchesWater && Math.random() < 0.74) shoreline.push([x, z]);
    }
  }
  shoreline.forEach(([x, z]) => { world[z][x] = 'sand'; });

  for (let attempt = 0; attempt < 180; attempt += 1) {
    const x = 3 + Math.floor(Math.random() * (WORLD_SIZE - 6));
    const z = 3 + Math.floor(Math.random() * (WORLD_SIZE - 6));
    if (safeFeatureCell(x, z) || world[z][x] !== 'grass' || Math.random() > 0.2) continue;
    world[z][x] = 'lava';
    if (Math.random() < 0.55) {
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const nz = z + dz;
        if (!safeFeatureCell(nx, nz) && world[nz][nx] === 'grass' && Math.random() < 0.65) world[nz][nx] = 'lava';
      }
    }
  }

  for (let z = 5; z < WORLD_SIZE - 5; z += 5) {
    for (let x = 5; x < WORLD_SIZE - 5; x += 5) {
      const startClear = Math.hypot(x + 0.5 - SPAWN.x, z + 0.5 - SPAWN.z) < 7;
      const exitClear = Math.hypot(x + 0.5 - EXIT.x, z + 0.5 - EXIT.z) < 6;
      const route = Math.abs(z + 0.5 - SPAWN.z) < 3.5;
      if (startClear || exitClear || route || Math.random() > 0.52 || world[z][x] !== 'grass') continue;

      world[z][x] = 'log';
      for (let offsetZ = -1; offsetZ <= 1; offsetZ += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (offsetX === 0 && offsetZ === 0) continue;
          if (Math.random() < 0.76 && world[z + offsetZ][x + offsetX] === 'grass') {
            world[z + offsetZ][x + offsetX] = 'leaves';
            treeCanopyCells.add((z + offsetZ) * WORLD_SIZE + x + offsetX);
          }
        }
      }
    }
  }
}

function placeInstance(mesh, index, x, y, z, sx = 1, sy = 1, sz = 1) {
  tempPosition.set(x, y, z);
  tempScale.set(sx, sy, sz);
  tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
  mesh.setMatrixAt(index, tempMatrix);
}

function batchInstances(type, records, geometry, material, transform) {
  if (records.length === 0) return null;
  const mesh = new THREE.InstancedMesh(geometry, material, records.length);
  mesh.receiveShadow = true;
  const isObstacleBatch = Boolean(BLOCKS[type]?.solid);
  mesh.castShadow = isObstacleBatch;
  mesh.instanceMatrix.setUsage(isObstacleBatch ? THREE.DynamicDrawUsage : THREE.StaticDrawUsage);

  records.forEach((record, index) => {
    placeInstance(mesh, index, ...transform(record));
    const shade = geometry === groundGeometry ? 0.9 + Math.random() * 0.18 : 0.94 + Math.random() * 0.12;
    mesh.setColorAt(index, tempColor.setRGB(shade, shade, shade));
    if (record.cell) {
      record.cell.mesh = mesh;
      record.cell.instance = index;
    }
  });

  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  scene.add(mesh);
  meshes.push(mesh);
  if (isObstacleBatch) {
    obstacleMeshes.push(mesh);
    records.forEach((record, index) => instanceLookup.set(`${mesh.uuid}:${index}`, record));
  }
  return mesh;
}

function buildWorld() {
  meshes.forEach((mesh) => scene.remove(mesh));
  meshes = [];
  obstacleMeshes = [];
  instanceLookup = new Map();
  waterMesh = null;
  waterPhases = [];

  const groundCells = { grass: [], sand: [], water: [], lava: [] };
  const blockCells = { stone: [], log: [], leaves: [] };
  const hazardCells = { water: [], lava: [] };
  const cells = Array.from({ length: WORLD_SIZE }, () => Array(WORLD_SIZE));

  for (let z = 0; z < WORLD_SIZE; z += 1) {
    for (let x = 0; x < WORLD_SIZE; x += 1) {
      const type = world[z]?.[x];
      if (!BLOCKS[type]) continue;
      const cell = { type, mesh: null, instance: -1, treeCanopy: treeCanopyCells.has(z * WORLD_SIZE + x) };
      cells[z][x] = cell;
      const groundType = BLOCKS[type].solid ? BLOCKS[type].ground : type;
      groundCells[groundType].push({ x, z });
      if (BLOCKS[type].solid) blockCells[type].push({ x, z, cell });
      if (type === 'water' || type === 'lava') hazardCells[type].push({ x, z, cell });
    }
  }

  for (const [type, records] of Object.entries(groundCells)) {
    batchInstances(type, records, groundGeometry, groundMaterials[type], ({ x, z }) => [worldX(x) + 0.5, -0.08, worldZ(z) + 0.5]);
  }

  for (const [type, records] of Object.entries(blockCells)) {
    const spec = BLOCKS[type];
    const geometry = type === 'log'
      ? trunkGeometry
      : type === 'leaves'
        ? canopyGeometry
        : type === 'stone'
          ? rockGeometry
          : blockGeometry;
    batchInstances(type, records, geometry, blockMaterials[type], ({ x, z, cell }) => {
      if (type === 'log') {
        return [worldX(x) + 0.5, spec.height / 2, worldZ(z) + 0.5, 0.76, spec.height, 0.76];
      }
      if (type === 'leaves') {
        if (cell.treeCanopy) {
          return [worldX(x) + 0.5, 1.42, worldZ(z) + 0.5, 1.72, 1.55, 1.72];
        }
        return [worldX(x) + 0.5, 0.5, worldZ(z) + 0.5, 1.12, 1.02, 1.12];
      }
      if (type === 'stone') {
        return [worldX(x) + 0.5, spec.height / 2, worldZ(z) + 0.5, 1.1, spec.height, 1.1];
      }
      return [worldX(x) + 0.5, spec.height / 2, worldZ(z) + 0.5, spec.width, spec.height, spec.width];
    });
  }

  for (const [type, records] of Object.entries(hazardCells)) {
    const material = hazardMaterials[type];
    const mesh = batchInstances(type, records, hazardGeometry, material, ({ x, z }) => [
      worldX(x) + 0.5,
      0.015,
      worldZ(z) + 0.5,
    ]);
    if (type === 'water') {
      waterMesh = mesh;
      waterPhases = records.map(() => Math.random() * Math.PI * 2);
    }
  }

  addGrassDetails(groundCells.grass);

  return cells;
}

function addGrassDetails(grassCells) {
  const patches = grassCells.filter(({ x, z }) =>
    Math.abs(z + 0.5 - SPAWN.z) > 2.7 && Math.random() < 0.13
  );
  if (patches.length === 0) return;

  const tuftGeometry = new THREE.ConeGeometry(0.075, 0.26, 4);
  const tuftMaterial = new THREE.MeshStandardMaterial({ color: '#75aa50', roughness: 1 });
  const tufts = new THREE.InstancedMesh(tuftGeometry, tuftMaterial, patches.length * 2);
  const yellowMaterial = new THREE.MeshStandardMaterial({ color: '#edc95f', roughness: 0.8 });
  const flowerGeometry = new THREE.SphereGeometry(0.055, 6, 5);
  const flowers = new THREE.InstancedMesh(flowerGeometry, yellowMaterial, Math.max(1, Math.floor(patches.length * 0.12)));
  let flowerIndex = 0;

  patches.forEach(({ x, z }, index) => {
    for (let blade = 0; blade < 2; blade += 1) {
      const angle = Math.random() * Math.PI;
      tempPosition.set(worldX(x) + 0.3 + Math.random() * 0.4, 0.105, worldZ(z) + 0.3 + Math.random() * 0.4);
      tempQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
      tempScale.set(0.72 + Math.random() * 0.5, 0.72 + Math.random() * 0.58, 0.72 + Math.random() * 0.5);
      tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
      tufts.setMatrixAt(index * 2 + blade, tempMatrix);
      tufts.setColorAt(index * 2 + blade, tempColor.setHSL(0.25 + Math.random() * 0.04, 0.34, 0.32 + Math.random() * 0.12));
    }

    if (flowerIndex < flowers.count && Math.random() < 0.12) {
      tempPosition.set(worldX(x) + 0.5, 0.17, worldZ(z) + 0.5);
      tempQuaternion.identity();
      tempScale.setScalar(0.8 + Math.random() * 0.55);
      tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
      flowers.setMatrixAt(flowerIndex, tempMatrix);
      flowerIndex += 1;
    }
  });

  tufts.instanceMatrix.needsUpdate = true;
  tufts.instanceColor.needsUpdate = true;
  tufts.computeBoundingSphere();
  scene.add(tufts);
  meshes.push(tufts);

  if (flowerIndex > 0) {
    flowers.count = flowerIndex;
    flowers.instanceMatrix.needsUpdate = true;
    flowers.computeBoundingSphere();
    scene.add(flowers);
    meshes.push(flowers);
  } else {
    flowers.dispose();
  }
}

let cells = [];

function createExit() {
  const gate = new THREE.Group();
  const frame = new THREE.MeshStandardMaterial({ color: '#43ed94', emissive: '#16a95b', emissiveIntensity: 1.25, roughness: 0.35 });
  const portal = new THREE.MeshStandardMaterial({ color: '#b9ffe0', emissive: '#42e88e', emissiveIntensity: 0.7, transparent: true, opacity: 0.3, side: THREE.DoubleSide });

  function piece(size, position, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...position);
    mesh.castShadow = true;
    gate.add(mesh);
  }

  piece([0.14, 2.25, 0.14], [0, 1.12, -0.68], frame);
  piece([0.14, 2.25, 0.14], [0, 1.12, 0.68], frame);
  piece([0.14, 0.16, 1.5], [0, 2.24, 0], frame);
  piece([0.06, 1.98, 1.28], [0, 1.12, 0], portal);

  gate.position.set(worldX(EXIT.x), 0, worldZ(EXIT.z));
  scene.add(gate);
  const glow = new THREE.PointLight('#54ff9a', 4, 8, 2);
  glow.position.set(gate.position.x, 1.5, gate.position.z);
  scene.add(glow);
  return gate;
}

const exitGate = createExit();

function createFirstPersonTool() {
  const viewModel = new THREE.Group();
  const shirtMaterial = new THREE.MeshStandardMaterial({ color: '#386a59', roughness: 0.9 });
  const skinMaterial = new THREE.MeshStandardMaterial({ color: '#dca77c', roughness: 0.85 });
  const handleMaterial = new THREE.MeshStandardMaterial({ color: '#705039', roughness: 0.95 });
  const metalMaterial = new THREE.MeshStandardMaterial({ color: '#c3d4d0', roughness: 0.55, metalness: 0.25 });

  function toolPart(size, position, material, rotationZ = 0) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...position);
    mesh.rotation.z = rotationZ;
    viewModel.add(mesh);
  }

  toolPart([0.2, 0.42, 0.24], [0.37, -0.39, -0.62], shirtMaterial, -0.24);
  toolPart([0.18, 0.18, 0.2], [0.32, -0.16, -0.71], skinMaterial, -0.24);
  toolPart([0.055, 0.48, 0.055], [0.51, -0.07, -0.92], handleMaterial, -0.42);
  toolPart([0.34, 0.09, 0.11], [0.42, 0.1, -0.94], metalMaterial, -0.12);
  toolPart([0.1, 0.19, 0.12], [0.29, 0.07, -0.94], metalMaterial, -0.16);

  camera.add(viewModel);
  return viewModel;
}

const firstPersonTool = createFirstPersonTool();

function playerName() {
  return playerNameInput.value.trim().slice(0, 16) || 'Miner';
}

function playerSnapshot() {
  return {
    x: player.x,
    z: player.z,
    vertical: player.vertical,
    yaw: player.yaw,
    swimming: player.swimming,
  };
}

function colorForPeer(peerId) {
  let hash = 0;
  for (let index = 0; index < peerId.length; index += 1) hash = (hash * 31 + peerId.charCodeAt(index)) | 0;
  const palette = ['#e5965b', '#6eb8b0', '#d4bd63', '#8ca6d2', '#cf7fa1', '#9bbd73'];
  return palette[Math.abs(hash) % palette.length];
}

function makeNameTag(name) {
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 256;
  labelCanvas.height = 64;
  const context = labelCanvas.getContext('2d');
  context.fillStyle = 'rgba(24, 39, 33, 0.82)';
  context.fillRect(4, 8, 248, 48);
  context.fillStyle = '#f2f3e6';
  context.font = '600 27px Manrope, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(name.slice(0, 16), 128, 33, 230);
  const texture = new THREE.CanvasTexture(labelCanvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.scale.set(1.45, 0.36, 1);
  sprite.position.y = 2.15;
  return sprite;
}

function makeRemotePlayer(id, name, snapshot) {
  const group = new THREE.Group();
  const clothes = new THREE.MeshStandardMaterial({ color: colorForPeer(id), roughness: 0.86 });
  const skin = new THREE.MeshStandardMaterial({ color: '#dcae83', roughness: 0.85 });

  function part(size, position, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...position);
    mesh.castShadow = true;
    group.add(mesh);
  }

  part([0.42, 0.64, 0.3], [0, 0.91, 0], clothes);
  part([0.34, 0.36, 0.34], [0, 1.45, 0], skin);
  part([0.16, 0.42, 0.22], [-0.14, 0.34, 0], clothes);
  part([0.16, 0.42, 0.22], [0.14, 0.34, 0], clothes);
  group.add(makeNameTag(name));
  scene.add(group);

  const remote = { id, name, group, target: { ...snapshot }, color: colorForPeer(id) };
  remotePlayers.set(id, remote);
  return remote;
}

function upsertRemotePlayer(id, name, snapshot) {
  if (id === localPeerId) return;
  let remote = remotePlayers.get(id);
  if (!remote) remote = makeRemotePlayer(id, name, snapshot);
  remote.name = name || remote.name;
  remote.target = { ...remote.target, ...snapshot };
  return remote;
}

function removeRemotePlayer(id) {
  const remote = remotePlayers.get(id);
  if (!remote) return;
  scene.remove(remote.group);
  remote.group.traverse((object) => {
    if (object.material?.map) object.material.map.dispose();
    if (object.material) object.material.dispose();
    if (object.geometry) object.geometry.dispose();
  });
  remotePlayers.delete(id);
  refreshPlayerList();
}

function refreshPlayerList() {
  multiplayerPlayers.replaceChildren();
  const addRow = (name, label) => {
    const row = document.createElement('li');
    const playerLabel = document.createElement('span');
    const stateLabel = document.createElement('small');
    playerLabel.textContent = name;
    stateLabel.textContent = label;
    row.append(playerLabel, stateLabel);
    multiplayerPlayers.append(row);
  };

  addRow(playerName(), 'YOU');
  for (const remote of remotePlayers.values()) addRow(remote.name, 'ONLINE');
}

function sendConnection(connection, message) {
  if (connection?.open) connection.send(message);
}

function broadcastMessage(message, exceptId = null) {
  for (const [id, connection] of peerConnections) {
    if (id !== exceptId) sendConnection(connection, message);
  }
}

function sendToHost(message) {
  if (multiplayerRole !== 'client' || !multiplayerHostId) return;
  sendConnection(peerConnections.get(multiplayerHostId), message);
}

function sendMultiplayerMessage(message) {
  if (multiplayerRole === 'host') broadcastMessage(message);
  else sendToHost(message);
}

function applySharedBlockChange(change) {
  const { x, z, type } = change;
  if (!Number.isInteger(x) || !Number.isInteger(z) || x < 0 || z < 0 || x >= WORLD_SIZE || z >= WORLD_SIZE) return;
  if (type === 'grass') {
    const cell = cells[z]?.[x];
    if (cell?.mesh && cell.instance >= 0) {
      cell.mesh.setMatrixAt(cell.instance, new THREE.Matrix4().makeScale(0, 0, 0));
      cell.mesh.instanceMatrix.needsUpdate = true;
      cell.mesh.computeBoundingSphere();
      instanceLookup.delete(`${cell.mesh.uuid}:${cell.instance}`);
    }
    world[z][x] = 'grass';
    treeCanopyCells.delete(z * WORLD_SIZE + x);
    return;
  }

  if (!BLOCKS[type]?.solid || world[z][x] !== 'grass' && world[z][x] !== 'sand') return;
  world[z][x] = type;
  treeCanopyCells.delete(z * WORLD_SIZE + x);
  cells = buildWorld();
}

function shareBlockChange(x, z, type) {
  const message = { type: 'block-change', x, z, block: type };
  if (multiplayerRole === 'host') broadcastMessage(message);
  else sendToHost(message);
}

function updateMultiplayerStatus(message) {
  multiplayerStatus.textContent = message;
}

function setRemoteName(id, name) {
  const remote = remotePlayers.get(id);
  if (!remote || !name) return;
  remote.name = name.slice(0, 16);
  const label = remote.group.children.at(-1);
  if (label) {
    label.material.map?.dispose();
    label.material.dispose();
    remote.group.remove(label);
  }
  remote.group.add(makeNameTag(remote.name));
  refreshPlayerList();
}

function disposePeer() {
  for (const connection of peerConnections.values()) connection.close();
  peerConnections.clear();
  for (const id of [...remotePlayers.keys()]) removeRemotePlayer(id);
  if (peer) peer.destroy();
  peer = null;
  multiplayerRole = 'offline';
  multiplayerHostId = null;
  localPeerId = null;
  roomCode.textContent = 'Not hosting';
  copyRoomButton.disabled = true;
  startGameButton.disabled = true;
  leaveRoomButton.hidden = true;
  multiplayerPlayers.replaceChildren();
  refreshPlayerList();
}

function receivePeerMessage(remoteId, message) {
  if (!message || typeof message !== 'object') return;

  if (message.type === 'init' && multiplayerRole === 'client') {
    if (!Array.isArray(message.world) || message.world.length !== WORLD_SIZE) {
      updateMultiplayerStatus('The host sent an invalid world.');
      return;
    }
    multiplayerHostId = remoteId;
    world = message.world;
    treeCanopyCells = new Set(message.treeCanopyCells || []);
    cells = buildWorld();
    player.x = message.spawn?.x ?? SPAWN.x + 1.5;
    player.z = message.spawn?.z ?? SPAWN.z;
    player.vertical = 0;
    player.verticalSpeed = 0;
    player.grounded = true;
    player.swimming = false;
    player.won = false;

    for (const remoteIdToRemove of [...remotePlayers.keys()]) removeRemotePlayer(remoteIdToRemove);
    for (const playerInfo of message.players || []) {
      upsertRemotePlayer(playerInfo.id, playerInfo.name, playerInfo.player);
    }
    upsertRemotePlayer(message.host.id, message.host.name, message.host.player);
    peerConnections.get(remoteId)?.send({ type: 'hello', name: playerName(), player: playerSnapshot() });
    startGameButton.disabled = false;
    leaveRoomButton.hidden = false;
    updateMultiplayerStatus('Connected. Enter the world when ready.');
    refreshPlayerList();
    return;
  }

  if (message.type === 'room-closed' && multiplayerRole === 'client') {
    disposePeer();
    hostButton.disabled = false;
    joinButton.disabled = false;
    updateMultiplayerStatus('The host closed the room.');
    return;
  }

  if (message.type === 'hello' && multiplayerRole === 'host') {
    const snapshot = message.player || { x: SPAWN.x + 1.5, z: SPAWN.z, yaw: -Math.PI / 2, vertical: 0 };
    const remote = upsertRemotePlayer(remoteId, message.name || 'Miner', snapshot);
    setRemoteName(remoteId, message.name || 'Miner');
    const joined = { type: 'player-joined', id: remoteId, name: remote.name, player: snapshot };
    broadcastMessage(joined, remoteId);
    refreshPlayerList();
    return;
  }

  if (message.type === 'player') {
    upsertRemotePlayer(message.id || remoteId, message.name, message.player);
    if (multiplayerRole === 'host') broadcastMessage(message, remoteId);
    refreshPlayerList();
    return;
  }

  if (message.type === 'player-joined') {
    upsertRemotePlayer(message.id, message.name, message.player);
    refreshPlayerList();
    return;
  }

  if (message.type === 'player-left') {
    removeRemotePlayer(message.id);
    return;
  }

  if (message.type === 'player-name') {
    setRemoteName(message.id, message.name);
    if (multiplayerRole === 'host') broadcastMessage(message, remoteId);
    return;
  }

  if (message.type === 'block-change') {
    applySharedBlockChange(message);
    if (multiplayerRole === 'host') broadcastMessage(message, remoteId);
  }
}

function attachConnection(connection, asHost) {
  peerConnections.set(connection.peer, connection);
  connection.on('data', (message) => receivePeerMessage(connection.peer, message));
  connection.on('close', () => {
    peerConnections.delete(connection.peer);
    removeRemotePlayer(connection.peer);
    if (asHost) broadcastMessage({ type: 'player-left', id: connection.peer });
    refreshPlayerList();
    if (multiplayerRole === 'client') {
      updateMultiplayerStatus('Disconnected from the host.');
      startGameButton.disabled = true;
      leaveRoomButton.hidden = true;
      hostButton.disabled = false;
      joinButton.disabled = false;
    }
  });
  connection.on('error', () => updateMultiplayerStatus('Connection error. Check the room code and try again.'));

  connection.on('open', () => {
    if (!asHost) {
      updateMultiplayerStatus('Connected. Receiving the host world...');
      sendConnection(connection, { type: 'hello', name: playerName(), player: playerSnapshot() });
      return;
    }

    const spawnIndex = remotePlayers.size;
    const spawn = {
      x: SPAWN.x + 1.5 + (spawnIndex % 3) * 0.72,
      z: SPAWN.z + (Math.floor(spawnIndex / 3) - 1) * 0.7,
    };
    const initialPlayer = { ...spawn, vertical: 0, yaw: -Math.PI / 2, swimming: false };
    upsertRemotePlayer(connection.peer, 'Joining player', initialPlayer);

    const players = [...remotePlayers.values()]
      .filter((remote) => remote.id !== connection.peer)
      .map((remote) => ({ id: remote.id, name: remote.name, player: remote.target }));
    sendConnection(connection, {
      type: 'init',
      world,
      treeCanopyCells: [...treeCanopyCells],
      spawn,
      host: { id: localPeerId, name: playerName(), player: playerSnapshot() },
      players,
    });
    broadcastMessage({ type: 'player-joined', id: connection.peer, name: 'Joining player', player: initialPlayer }, connection.peer);
    refreshPlayerList();
  });
}

function startHosting() {
  if (!window.Peer) {
    updateMultiplayerStatus('Multiplayer service failed to load. Check your internet connection.');
    return;
  }
  disposePeer();
  multiplayerRole = 'host';
  updateMultiplayerStatus('Connecting to the multiplayer service...');
  hostButton.disabled = true;
  peer = new window.Peer();
  peer.on('open', (id) => {
    localPeerId = id;
    roomCode.textContent = id;
    copyRoomButton.disabled = false;
    startGameButton.disabled = false;
    leaveRoomButton.hidden = false;
    updateMultiplayerStatus('Room ready. Share the code with a friend.');
    refreshPlayerList();
  });
  peer.on('connection', (connection) => attachConnection(connection, true));
  peer.on('error', (error) => {
    updateMultiplayerStatus(error.type === 'peer-unavailable' ? 'Room not found. Check the code.' : `Connection service: ${error.type || 'error'}`);
    hostButton.disabled = false;
    joinButton.disabled = false;
  });
  peer.on('close', () => {
    multiplayerRole = 'offline';
    updateMultiplayerStatus('Room closed.');
    hostButton.disabled = false;
  });
}

function joinHostedWorld() {
  const code = joinCodeInput.value.trim();
  if (!code) {
    updateMultiplayerStatus('Enter a room code first.');
    joinCodeInput.focus();
    return;
  }
  if (!window.Peer) {
    updateMultiplayerStatus('Multiplayer service failed to load. Check your internet connection.');
    return;
  }

  disposePeer();
  multiplayerRole = 'client';
  joinButton.disabled = true;
  hostButton.disabled = true;
  updateMultiplayerStatus('Connecting to room...');
  peer = new window.Peer();
  peer.on('open', (id) => {
    localPeerId = id;
    const connection = peer.connect(code, { reliable: true });
    attachConnection(connection, false);
  });
  peer.on('error', (error) => {
    updateMultiplayerStatus(error.type === 'peer-unavailable' ? 'Room not found. Check the code.' : `Connection service: ${error.type || 'error'}`);
    joinButton.disabled = false;
    hostButton.disabled = false;
  });
}

function toggleMultiplayer(forceOpen) {
  const opening = typeof forceOpen === 'boolean' ? forceOpen : multiplayerPanel.hidden;
  multiplayerPanel.hidden = !opening;
  multiplayerButton.setAttribute('aria-expanded', String(opening));
  if (opening) {
    inventoryPanel.hidden = true;
    inventoryButton.setAttribute('aria-expanded', 'false');
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    lookPrompt.hidden = true;
  } else if (document.pointerLockElement !== canvas) {
    lookPrompt.hidden = false;
  }
}

function enterMultiplayerWorld() {
  multiplayerPanel.hidden = true;
  multiplayerButton.setAttribute('aria-expanded', 'false');
  enterWorld();
}

function leaveMultiplayerRoom() {
  if (multiplayerRole === 'host') broadcastMessage({ type: 'room-closed' });
  leaveRoomButton.disabled = true;
  window.setTimeout(() => {
    disposePeer();
    hostButton.disabled = false;
    joinButton.disabled = false;
    leaveRoomButton.disabled = false;
    updateMultiplayerStatus('Room closed.');
  }, 120);
}

function updateMultiplayer(delta) {
  for (const remote of remotePlayers.values()) {
    const target = remote.target;
    const targetPosition = new THREE.Vector3(worldX(target.x), (target.vertical || 0) + 0.05, worldZ(target.z));
    remote.group.position.lerp(targetPosition, 0.22);
    remote.group.rotation.y = target.yaw || 0;
  }

  if (multiplayerRole === 'offline') return;
  networkAccumulator += delta;
  if (networkAccumulator < 0.08) return;
  networkAccumulator = 0;
  sendMultiplayerMessage({
    type: 'player',
    id: localPeerId,
    name: playerName(),
    player: playerSnapshot(),
  });
}

function isBlocked(x, z, feetHeight = player.vertical) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return true;
  for (const dx of [-PLAYER_RADIUS, PLAYER_RADIUS]) {
    for (const dz of [-PLAYER_RADIUS, PLAYER_RADIUS]) {
      const cellX = Math.floor(x + dx);
      const cellZ = Math.floor(z + dz);
      if (cellX < 0 || cellZ < 0 || cellX >= WORLD_SIZE || cellZ >= WORLD_SIZE) return true;
      const type = world[cellZ]?.[cellX];
      if (!type || !BLOCKS[type]) return true;
      if (BLOCKS[type].solid && feetHeight < BLOCKS[type].height - 0.08) return true;
    }
  }
  return false;
}

function platformHeight(x, z) {
  let height = 0;
  for (const dx of [-PLAYER_RADIUS, PLAYER_RADIUS]) {
    for (const dz of [-PLAYER_RADIUS, PLAYER_RADIUS]) {
      const cellX = Math.floor(x + dx);
      const cellZ = Math.floor(z + dz);
      const type = world[cellZ]?.[cellX];
      if (type && BLOCKS[type]?.solid) height = Math.max(height, BLOCKS[type].height);
    }
  }
  return height;
}

function tileAt(x, z) {
  return world[Math.floor(z)]?.[Math.floor(x)] || 'grass';
}

function restart() {
  player.x = SPAWN.x;
  player.z = SPAWN.z;
  player.health = 10;
  player.blocks = 0;
  player.wood = 0;
  player.stone = 0;
  player.leaves = 0;
  player.won = false;
  player.vertical = 0;
  player.verticalSpeed = 0;
  player.grounded = true;
  player.selectedSlot = 0;
  player.yaw = -Math.PI / 2;
  player.pitch = 0;
  Object.keys(keys).forEach((key) => { keys[key] = false; });
}

function updatePlayer(delta) {
  if (!player.won) {
    const wasSwimming = player.swimming;
    player.swimming = tileAt(player.x, player.z) === 'water';

    if (player.swimming) {
      player.grounded = false;
      player.verticalSpeed = 0;
      const swimTarget = keys.jumpHeld ? 0.25 : keys.control ? -0.85 : -0.48;
      player.vertical += (swimTarget - player.vertical) * Math.min(1, delta * 3.5);
      player.vertical = THREE.MathUtils.clamp(player.vertical, -0.9, 0.28);
      keys.jump = false;
    } else {
      if (wasSwimming) {
        player.vertical = 0;
        player.verticalSpeed = 0;
        player.grounded = true;
      }
      if (keys.jump && player.grounded) {
        player.verticalSpeed = JUMP_SPEED;
        player.grounded = false;
      }
      keys.jump = false;

      if (!player.grounded) {
        player.verticalSpeed -= GRAVITY * delta;
        const nextHeight = player.vertical + player.verticalSpeed * delta;
        const landingHeight = platformHeight(player.x, player.z);
        if (player.verticalSpeed <= 0 && nextHeight <= landingHeight && player.vertical >= landingHeight) {
          player.vertical = landingHeight;
          player.verticalSpeed = 0;
          player.grounded = true;
        } else if (nextHeight <= 0) {
          player.vertical = 0;
          player.verticalSpeed = 0;
          player.grounded = true;
        } else {
          player.vertical = nextHeight;
        }
      }
    }

    const forwardInput = Number(Boolean(keys.w || keys.z || keys.arrowup)) - Number(Boolean(keys.s || keys.arrowdown));
    const sideInput = Number(Boolean(keys.d || keys.arrowright)) - Number(Boolean(keys.a || keys.q || keys.arrowleft));
    const forwardX = -Math.sin(player.yaw);
    const forwardZ = -Math.cos(player.yaw);
    const rightX = Math.cos(player.yaw);
    const rightZ = -Math.sin(player.yaw);
    let moveX = forwardX * forwardInput + rightX * sideInput;
    let moveZ = forwardZ * forwardInput + rightZ * sideInput;

    if (moveX !== 0 || moveZ !== 0) {
      const distance = Math.hypot(moveX, moveZ);
      moveX /= distance;
      moveZ /= distance;
      const baseSpeed = player.swimming ? SWIM_SPEED : WALK_SPEED;
      const step = baseSpeed * (keys.shift && !player.swimming ? 1.6 : 1) * delta;
      if (!isBlocked(player.x + moveX * step, player.z)) player.x += moveX * step;
      if (!isBlocked(player.x, player.z + moveZ * step)) player.z += moveZ * step;
    }

    if (player.grounded && player.vertical > platformHeight(player.x, player.z)) {
      player.grounded = false;
      player.verticalSpeed = 0;
    }

    const terrainType = tileAt(player.x, player.z);
    if (terrainType === 'lava') player.health -= delta * 1.5;
    if (terrainType === 'water') player.health = Math.min(10, player.health + delta * 0.3);
    if (player.health <= 0) restart();

    if (Math.hypot(player.x - EXIT.x, player.z - EXIT.z) < 1.2) player.won = true;
  }

  camera.position.set(worldX(player.x), 1.62 + player.vertical, worldZ(player.z));
  camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
}

function mineTarget() {
  if (document.pointerLockElement !== canvas || player.won) return;
  camera.updateMatrixWorld(true);
  scene.updateMatrixWorld(true);
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hit = raycaster.intersectObjects(obstacleMeshes, false)[0];
  if (!hit || hit.instanceId === undefined) return;

  const record = instanceLookup.get(`${hit.object.uuid}:${hit.instanceId}`);
  if (!record) return;
  const { x, z, cell } = record;
  const minedType = world[z][x];
  swingEndsAt = performance.now() + 280;
  const hideMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
  cell.mesh.setMatrixAt(cell.instance, hideMatrix);
  cell.mesh.instanceMatrix.needsUpdate = true;
  cell.mesh.computeBoundingSphere();
  instanceLookup.delete(`${cell.mesh.uuid}:${cell.instance}`);
  world[z][x] = 'grass';
  treeCanopyCells.delete(z * WORLD_SIZE + x);
  cell.type = 'grass';
  player.blocks += 1;

  if (minedType === 'log') {
    const amount = player.selectedSlot === 2 ? 3 : 1;
    player.wood += amount;
    actionMessage = `Wood +${amount}`;
  } else if (minedType === 'stone') {
    const amount = player.selectedSlot === 1 ? 2 : 1;
    player.stone += amount;
    actionMessage = `Stone +${amount}`;
  } else if (minedType === 'leaves') {
    player.leaves += 1;
    actionMessage = 'Leaves +1';
  }
  actionMessageUntil = performance.now() + 1400;
  shareBlockChange(x, z, 'grass');
}

function placeSelectedBlock() {
  if (document.pointerLockElement !== canvas || player.won) return;
  const blockType = player.selectedSlot === 3 ? 'leaves' : player.selectedSlot === 4 ? 'log' : null;
  if (!blockType) {
    actionMessage = 'Select leaves or logs to place';
    actionMessageUntil = performance.now() + 1400;
    return;
  }
  const available = blockType === 'leaves' ? player.leaves : player.wood;
  if (available < 1) {
    actionMessage = `No ${blockType === 'log' ? 'logs' : 'leaves'} in inventory`;
    actionMessageUntil = performance.now() + 1400;
    return;
  }

  camera.updateMatrixWorld(true);
  scene.updateMatrixWorld(true);
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hit = raycaster.intersectObjects(obstacleMeshes, false)[0];
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  if (Math.hypot(direction.x, direction.z) < 0.25) {
    direction.x = -Math.sin(player.yaw);
    direction.z = -Math.cos(player.yaw);
  }
  let targetX;
  let targetZ;

  if (hit && hit.instanceId !== undefined) {
    const adjacentBlock = instanceLookup.get(`${hit.object.uuid}:${hit.instanceId}`);
    if (!adjacentBlock) return;
    if (Math.abs(direction.x) >= Math.abs(direction.z)) {
      targetX = adjacentBlock.x + Math.sign(direction.x);
      targetZ = adjacentBlock.z;
    } else {
      targetX = adjacentBlock.x;
      targetZ = adjacentBlock.z + Math.sign(direction.z);
    }
  } else {
    targetX = Math.floor(player.x + direction.x * 1.4);
    targetZ = Math.floor(player.z + direction.z * 1.4);
  }

  const groundType = world[targetZ]?.[targetX];
  if (groundType !== 'grass' && groundType !== 'sand') return;
  if (Math.hypot(player.x - (targetX + 0.5), player.z - (targetZ + 0.5)) < 0.62) return;

  world[targetZ][targetX] = blockType;
  if (blockType === 'leaves') treeCanopyCells.delete(targetZ * WORLD_SIZE + targetX);
  if (blockType === 'leaves') player.leaves -= 1;
  else player.wood -= 1;
  cells = buildWorld();
  shareBlockChange(targetX, targetZ, blockType);
  actionMessage = blockType === 'log' ? 'Log placed' : 'Leaves placed';
  actionMessageUntil = performance.now() + 1400;
  swingEndsAt = performance.now() + 220;
}

function toggleInventory(forceOpen) {
  const opening = typeof forceOpen === 'boolean' ? forceOpen : inventoryPanel.hidden;
  inventoryPanel.hidden = !opening;
  inventoryButton.setAttribute('aria-expanded', String(opening));
  lookPrompt.hidden = opening || document.pointerLockElement === canvas;
}

function updateHud() {
  healthText.textContent = String(Math.max(0, Math.ceil(player.health)));
  blocksText.textContent = String(player.blocks);
  woodText.textContent = String(player.wood);
  inventoryWood.textContent = String(player.wood);
  inventoryLeaves.textContent = String(player.leaves);
  inventoryStone.textContent = String(player.stone);
  inventoryWoodItem.textContent = String(player.wood);
  inventoryLeavesItem.textContent = String(player.leaves);
  gameStatus.textContent = player.won
    ? 'Exit reached! Press R to restart'
    : performance.now() < actionMessageUntil
      ? actionMessage
      : 'Find the glowing exit';

  hotbarSlots.forEach((slot, index) => {
    const selected = index === player.selectedSlot;
    slot.classList.toggle('selected', selected);
    slot.setAttribute('aria-pressed', String(selected));
    const quantity = slot.querySelector('.slot-count');
    if (quantity) {
      const itemCount = index === 1 ? player.stone : index === 2 || index === 4 ? player.wood : index === 3 ? player.leaves : 0;
      quantity.textContent = itemCount > 0 ? String(itemCount) : '';
    }
  });

  const dx = EXIT.x - player.x;
  const dz = EXIT.z - player.z;
  const angleToExit = Math.atan2(-dx, -dz);
  const relativeAngle = Math.atan2(Math.sin(angleToExit - player.yaw), Math.cos(angleToExit - player.yaw));
  exitDistance.textContent = `${Math.round(Math.hypot(dx, dz))} m`;
  exitArrow.style.transform = `rotate(${relativeAngle}rad)`;
}

function updateSize() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (width < 1 || height < 1) return;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function animate(time) {
  const delta = lastFrame ? Math.min((time - lastFrame) / 1000, 0.05) : 0;
  lastFrame = time;
  updatePlayer(delta);
  updateHud();
  updateMultiplayer(delta);

  if (waterMesh) {
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    for (let index = 0; index < waterMesh.count; index += 1) {
      waterMesh.getMatrixAt(index, matrix);
      matrix.decompose(position, rotation, scale);
      position.y = 0.015 + Math.sin(time * 0.0015 + waterPhases[index]) * 0.025;
      matrix.compose(position, rotation, scale);
      waterMesh.setMatrixAt(index, matrix);
    }
    waterMesh.instanceMatrix.needsUpdate = true;
  }

  exitGate.rotation.y = Math.sin(time * 0.0005) * 0.03;
  const swing = Math.max(0, (swingEndsAt - time) / 280);
  firstPersonTool.rotation.x = Math.sin((1 - swing) * Math.PI) * 0.42;
  firstPersonTool.rotation.z = swing * -0.14;
  sunlight.position.set(camera.position.x - 18, 28, camera.position.z + 16);
  sunlight.target.position.set(camera.position.x, 0, camera.position.z);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function enterWorld() {
  try {
    const lockRequest = canvas.requestPointerLock();
    if (lockRequest && typeof lockRequest.catch === 'function') lockRequest.catch(() => {});
  } catch (error) {
    gameStatus.textContent = 'Mouse look is unavailable in this browser';
  }
}

multiplayerButton.addEventListener('click', () => toggleMultiplayer());
multiplayerClose.addEventListener('click', () => toggleMultiplayer(false));
hostButton.addEventListener('click', startHosting);
joinButton.addEventListener('click', joinHostedWorld);
joinCodeInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') joinHostedWorld();
});
copyRoomButton.addEventListener('click', async () => {
  if (!localPeerId) return;
  try {
    await navigator.clipboard.writeText(localPeerId);
    updateMultiplayerStatus('Room code copied. Send it to your friend.');
  } catch (error) {
    updateMultiplayerStatus(`Share this room code: ${localPeerId}`);
  }
});
startGameButton.addEventListener('click', enterMultiplayerWorld);
leaveRoomButton.addEventListener('click', leaveMultiplayerRoom);
playerNameInput.addEventListener('change', () => {
  if (!localPeerId) return;
  sendMultiplayerMessage({ type: 'player-name', id: localPeerId, name: playerName() });
  refreshPlayerList();
});
lookPrompt.addEventListener('click', enterWorld);
canvas.addEventListener('click', () => {
  if (document.pointerLockElement !== canvas) enterWorld();
});
canvas.addEventListener('mousedown', (event) => {
  if (event.button === 0 && document.pointerLockElement === canvas) mineTarget();
  if (event.button === 2 && document.pointerLockElement === canvas) placeSelectedBlock();
});
canvas.addEventListener('contextmenu', (event) => event.preventDefault());
inventoryButton.addEventListener('click', () => toggleInventory());
inventoryClose.addEventListener('click', () => toggleInventory(false));
inventoryItems.forEach((item) => {
  item.addEventListener('click', () => {
    player.selectedSlot = Number(item.dataset.hotbarSlot);
    toggleInventory(false);
    if (document.pointerLockElement !== canvas) enterWorld();
  });
});
hotbarSlots.forEach((slot, index) => {
  slot.addEventListener('click', () => { player.selectedSlot = index; });
});
document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === canvas;
  lookPrompt.hidden = locked || !inventoryPanel.hidden;
  crosshair.hidden = !locked;
  if (!locked) Object.keys(keys).forEach((key) => { keys[key] = false; });
});
document.addEventListener('mousemove', (event) => {
  if (document.pointerLockElement !== canvas || !inventoryPanel.hidden) return;
  player.yaw -= event.movementX * MOUSE_SENSITIVITY;
  player.pitch = THREE.MathUtils.clamp(player.pitch - event.movementY * MOUSE_SENSITIVITY, -1.48, 1.48);
});
window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (key === 'm' && !event.repeat) {
    event.preventDefault();
    toggleMultiplayer();
    return;
  }
  if (key === 'e' && !event.repeat) {
    event.preventDefault();
    toggleInventory();
    return;
  }
  if (event.code === 'Space') {
    event.preventDefault();
    keys.jumpHeld = true;
    if (!event.repeat && player.grounded && !player.won) keys.jump = true;
    return;
  }
  keys[key] = true;
  if (key.startsWith('arrow')) event.preventDefault();
  const numberKey = /^(?:Digit|Numpad)([1-5])$/.exec(event.code);
  if (numberKey) player.selectedSlot = Number(numberKey[1]) - 1;
  if (key === 'r' && !event.repeat) {
    makeWorld();
    cells = buildWorld();
    restart();
  }
});
window.addEventListener('keyup', (event) => {
  keys[event.key.toLowerCase()] = false;
  if (event.code === 'Space') keys.jumpHeld = false;
});
window.addEventListener('blur', () => { Object.keys(keys).forEach((key) => { keys[key] = false; }); });
window.addEventListener('resize', updateSize);

makeWorld();
cells = buildWorld();
camera.position.set(worldX(player.x), 1.62, worldZ(player.z));
camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
updateSize();
requestAnimationFrame(animate);
