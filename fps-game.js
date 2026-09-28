const THREE = window.THREE;
const canvas = document.getElementById('gameCanvas');
const healthText = document.getElementById('health');
const blocksText = document.getElementById('blocks');
const gameStatus = document.getElementById('gameStatus');
const exitDistance = document.getElementById('exitDistance');
const exitArrow = document.getElementById('exitArrow');
const lookPrompt = document.getElementById('lookPrompt');
const crosshair = document.getElementById('crosshair');

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
const MOUSE_SENSITIVITY = 0.0022;

const BLOCKS = {
  grass: { solid: false, ground: '#6eaa53' },
  sand: { solid: false, ground: '#d7c275' },
  stone: { solid: true, ground: 'grass', color: '#89949b', height: 0.9, width: 0.78 },
  log: { solid: true, ground: 'grass', color: '#80502e', height: 1.22, width: 0.55 },
  leaves: { solid: true, ground: 'grass', color: '#478449', height: 1.35, width: 0.95 },
  water: { solid: false, ground: '#347e9e' },
  lava: { solid: false, ground: '#9c4e32' },
};

const scene = new THREE.Scene();
scene.background = new THREE.Color('#a8d9e8');
scene.fog = new THREE.Fog('#a8d9e8', 48, 95);

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
  leaves: new THREE.MeshStandardMaterial({ color: BLOCKS.leaves.color, roughness: 1 }),
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
  won: false,
  yaw: -Math.PI / 2,
  pitch: 0,
};

const keys = Object.create(null);
const raycaster = new THREE.Raycaster();
raycaster.far = 5;
let world = [];
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

function worldX(x) {
  return x - WORLD_CENTER;
}

function worldZ(z) {
  return z - WORLD_CENTER;
}

function makeWorld() {
  world = Array.from({ length: WORLD_SIZE }, (_, z) =>
    Array.from({ length: WORLD_SIZE }, (_, x) => {
      const inStartClearing = Math.hypot(x + 0.5 - SPAWN.x, z + 0.5 - SPAWN.z) < 5;
      const nearExit = Math.hypot(x + 0.5 - EXIT.x, z + 0.5 - EXIT.z) < 4;
      if (inStartClearing || nearExit || Math.abs(z + 0.5 - SPAWN.z) < 2.5) return 'grass';

      const roll = Math.random();
      const terrainShape = Math.sin(x * 0.11) + Math.cos(z * 0.1) + Math.sin((x + z) * 0.06);
      if (terrainShape > 1.8 && roll < 0.43) return 'sand';
      if (terrainShape < -2.15 && roll < 0.26) return 'water';
      if (roll < 0.012) return 'stone';
      if (roll < 0.019) return 'log';
      if (roll < 0.038) return 'leaves';
      if (roll < 0.046) return 'lava';
      if (roll < 0.075) return 'water';
      return 'grass';
    })
  );
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
  mesh.castShadow = geometry === blockGeometry;
  mesh.instanceMatrix.setUsage(geometry === blockGeometry ? THREE.DynamicDrawUsage : THREE.StaticDrawUsage);

  records.forEach((record, index) => {
    placeInstance(mesh, index, ...transform(record));
    if (record.cell) {
      record.cell.mesh = mesh;
      record.cell.instance = index;
    }
  });

  mesh.computeBoundingSphere();
  scene.add(mesh);
  meshes.push(mesh);
  if (geometry === blockGeometry) {
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
      const cell = { type, mesh: null, instance: -1 };
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
    batchInstances(type, records, blockGeometry, blockMaterials[type], ({ x, z }) => [
      worldX(x) + 0.5,
      spec.height / 2,
      worldZ(z) + 0.5,
      spec.width,
      spec.height,
      spec.width,
    ]);
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

  return cells;
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

function isBlocked(x, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return true;
  for (const dx of [-PLAYER_RADIUS, PLAYER_RADIUS]) {
    for (const dz of [-PLAYER_RADIUS, PLAYER_RADIUS]) {
      const cellX = Math.floor(x + dx);
      const cellZ = Math.floor(z + dz);
      if (cellX < 0 || cellZ < 0 || cellX >= WORLD_SIZE || cellZ >= WORLD_SIZE) return true;
      const type = world[cellZ]?.[cellX];
      if (!type || !BLOCKS[type] || BLOCKS[type].solid) return true;
    }
  }
  return false;
}

function tileAt(x, z) {
  return world[Math.floor(z)]?.[Math.floor(x)] || 'grass';
}

function restart() {
  player.x = SPAWN.x;
  player.z = SPAWN.z;
  player.health = 10;
  player.blocks = 0;
  player.won = false;
  player.yaw = -Math.PI / 2;
  player.pitch = 0;
  Object.keys(keys).forEach((key) => { keys[key] = false; });
}

function updatePlayer(delta) {
  if (!player.won) {
    const forwardInput = Number(Boolean(keys.w || keys.arrowup)) - Number(Boolean(keys.s || keys.arrowdown));
    const sideInput = Number(Boolean(keys.d || keys.arrowright)) - Number(Boolean(keys.a || keys.arrowleft));
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
      const step = WALK_SPEED * (keys.shift ? 1.6 : 1) * delta;
      if (!isBlocked(player.x + moveX * step, player.z)) player.x += moveX * step;
      if (!isBlocked(player.x, player.z + moveZ * step)) player.z += moveZ * step;
    }

    const terrainType = tileAt(player.x, player.z);
    if (terrainType === 'lava') player.health -= delta * 1.5;
    if (terrainType === 'water') player.health = Math.min(10, player.health + delta * 0.3);
    if (player.health <= 0) restart();

    if (Math.hypot(player.x - EXIT.x, player.z - EXIT.z) < 1.2) player.won = true;
  }

  camera.position.set(worldX(player.x), 1.62, worldZ(player.z));
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
  const hideMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
  cell.mesh.setMatrixAt(cell.instance, hideMatrix);
  cell.mesh.instanceMatrix.needsUpdate = true;
  cell.mesh.computeBoundingSphere();
  instanceLookup.delete(`${cell.mesh.uuid}:${cell.instance}`);
  world[z][x] = 'grass';
  cell.type = 'grass';
  player.blocks += 1;
}

function updateHud() {
  healthText.textContent = String(Math.max(0, Math.ceil(player.health)));
  blocksText.textContent = String(player.blocks);
  gameStatus.textContent = player.won ? 'Exit reached! Press R to restart' : 'Find the glowing exit';

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

lookPrompt.addEventListener('click', enterWorld);
canvas.addEventListener('click', enterWorld);
document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === canvas;
  lookPrompt.hidden = locked;
  crosshair.hidden = !locked;
  if (!locked) Object.keys(keys).forEach((key) => { keys[key] = false; });
});
document.addEventListener('mousemove', (event) => {
  if (document.pointerLockElement !== canvas) return;
  player.yaw -= event.movementX * MOUSE_SENSITIVITY;
  player.pitch = THREE.MathUtils.clamp(player.pitch - event.movementY * MOUSE_SENSITIVITY, -1.48, 1.48);
});
window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  keys[key] = true;
  if (key.startsWith('arrow') || key === ' ') event.preventDefault();
  if (key === ' ' && !event.repeat) mineTarget();
  if (key === 'r' && !event.repeat) {
    makeWorld();
    cells = buildWorld();
    restart();
  }
});
window.addEventListener('keyup', (event) => { keys[event.key.toLowerCase()] = false; });
window.addEventListener('blur', () => { Object.keys(keys).forEach((key) => { keys[key] = false; }); });
window.addEventListener('resize', updateSize);

makeWorld();
cells = buildWorld();
camera.position.set(worldX(player.x), 1.62, worldZ(player.z));
camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
updateSize();
requestAnimationFrame(animate);
