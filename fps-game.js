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
  gameStatus.textContent = 'Three.js did not load. Check your internet connection and reload.';
  throw new Error('Three.js failed to load from the CDN.');
}

const WORLD_W = 128;
const WORLD_H = 128;
const SPAWN_X = 64.5;
const SPAWN_Z = 64.5;
const EXIT_X = 116;
const EXIT_Z = 64;
const PLAYER_RADIUS = 0.22;
const WALK_SPEED = 4.3;
const MOUSE_SENSITIVITY = 0.0022;

const BLOCKS = {
  grass: { solid: false, ground: '#6eaa53' },
  sand: { solid: false, ground: '#d9c777' },
  stone: { solid: true, ground: 'grass', color: '#89949b', height: 0.92 },
  log: { solid: true, ground: 'grass', color: '#80502e', height: 1.32 },
  leaves: { solid: true, ground: 'grass', color: '#478449', height: 1.18 },
  water: { solid: false, ground: '#347e9e' },
  lava: { solid: false, ground: '#9c4e32' },
};

const scene = new THREE.Scene();
scene.background = new THREE.Color('#a8d9e8');
scene.fog = new THREE.Fog('#a8d9e8', 58, 112);

const camera = new THREE.PerspectiveCamera(76, 7 / 4, 0.08, 150);
camera.rotation.order = 'YXZ';

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

scene.add(new THREE.HemisphereLight('#e5f6ff', '#596449', 2.2));

const sunlight = new THREE.DirectionalLight('#fff0d1', 2.8);
sunlight.castShadow = true;
sunlight.shadow.mapSize.set(1024, 1024);
sunlight.shadow.camera.left = -30;
sunlight.shadow.camera.right = 30;
sunlight.shadow.camera.top = 30;
sunlight.shadow.camera.bottom = -30;
sunlight.shadow.bias = -0.0004;
scene.add(sunlight);
scene.add(sunlight.target);

const groundGeometry = new THREE.BoxGeometry(0.98, 0.12, 0.98);
const obstacleGeometry = new THREE.BoxGeometry(1, 1, 1);
const waterGeometry = new THREE.BoxGeometry(0.96, 0.035, 0.96);

const groundMaterials = {
  grass: new THREE.MeshStandardMaterial({ color: BLOCKS.grass.ground, roughness: 0.95 }),
  sand: new THREE.MeshStandardMaterial({ color: BLOCKS.sand.ground, roughness: 0.95 }),
  water: new THREE.MeshStandardMaterial({ color: BLOCKS.water.ground, roughness: 0.42, metalness: 0.05 }),
  lava: new THREE.MeshStandardMaterial({
    color: BLOCKS.lava.ground,
    roughness: 0.8,
    emissive: '#9b2605',
    emissiveIntensity: 0.38,
  }),
};
const obstacleMaterials = {
  stone: new THREE.MeshStandardMaterial({ color: BLOCKS.stone.color, roughness: 0.9 }),
  log: new THREE.MeshStandardMaterial({ color: BLOCKS.log.color, roughness: 0.92 }),
  leaves: new THREE.MeshStandardMaterial({ color: BLOCKS.leaves.color, roughness: 1 }),
};
const hazardMaterials = {
  water: new THREE.MeshStandardMaterial({
    color: '#48a8cd',
    transparent: true,
    opacity: 0.83,
    roughness: 0.3,
    metalness: 0.05,
  }),
  lava: new THREE.MeshStandardMaterial({
    color: '#ff702f',
    emissive: '#f83a00',
    emissiveIntensity: 1.2,
    roughness: 0.55,
  }),
};

const terrain = new THREE.Mesh(
  new THREE.PlaneGeometry(WORLD_W + 32, WORLD_H + 32),
  new THREE.MeshStandardMaterial({ color: '#667953', roughness: 1 })
);
terrain.rotation.x = -Math.PI / 2;
terrain.position.y = -0.2;
terrain.receiveShadow = true;
scene.add(terrain);

const player = {
  x: SPAWN_X,
  z: SPAWN_Z,
  health: 10,
  blocks: 0,
  foundExit: false,
  yaw: -Math.PI / 2,
  pitch: 0,
};

let world = [];
let cellMeshes = [];
let worldInstances = [];
let obstacleMeshes = [];
let waterInstances = null;
let waterPhases = [];
let lastTime = 0;
const keys = {};
const instanceCells = new Map();
const raycaster = new THREE.Raycaster();
raycaster.far = 5;
const instanceMatrix = new THREE.Matrix4();
const instancePosition = new THREE.Vector3();
const instanceRotation = new THREE.Quaternion();
const instanceScale = new THREE.Vector3();

function gridToWorldX(x) {
  return x - WORLD_W / 2;
}

function gridToWorldZ(z) {
  return z - WORLD_H / 2;
}

function createWorld() {
  world = Array.from({ length: WORLD_H }, (_, z) =>
    Array.from({ length: WORLD_W }, (_, x) => {
      const inStartClearing = Math.hypot(x + 0.5 - SPAWN_X, z + 0.5 - SPAWN_Z) < 6;
      const nearExit = x > EXIT_X - 5 && Math.abs(z - (EXIT_Z + 0.5)) < 5;
      if (inStartClearing || nearExit) return 'grass';

      const roll = Math.random();
      const biome = Math.sin(x * 0.085) + Math.cos(z * 0.09) + Math.sin((x - z) * 0.05);
      if (biome > 1.8 && roll < 0.48) return 'sand';
      if (biome < -2.15 && roll < 0.36) return 'water';
      if (roll < 0.012) return 'stone';
      if (roll < 0.022) return 'log';
      if (roll < 0.043) return 'leaves';
      if (roll < 0.05) return 'lava';
      if (roll < 0.082) return 'water';
      return 'grass';
    })
  );
}

function setInstance(mesh, index, x, y, z, scaleX = 1, scaleY = 1, scaleZ = 1) {
  instancePosition.set(x, y, z);
  instanceScale.set(scaleX, scaleY, scaleZ);
  instanceMatrix.compose(instancePosition, instanceRotation, instanceScale);
  mesh.setMatrixAt(index, instanceMatrix);
}

function addInstanceBatch(type, records, geometry, materials, getTransform, onCreate) {
  if (records.length === 0) return null;

  const mesh = new THREE.InstancedMesh(geometry, materials[type], records.length);
  mesh.castShadow = geometry === obstacleGeometry;
  mesh.receiveShadow = true;
  mesh.instanceMatrix.setUsage(
    type === 'water' || geometry === obstacleGeometry ? THREE.DynamicDrawUsage : THREE.StaticDrawUsage
  );

  records.forEach((record, index) => {
    const transform = getTransform(record);
    setInstance(mesh, index, ...transform);
    onCreate?.(record, mesh, index);
  });

  mesh.computeBoundingSphere();
  scene.add(mesh);
  worldInstances.push(mesh);
  return mesh;
}

function buildWorldMeshes() {
  for (const mesh of worldInstances) scene.remove(mesh);
  worldInstances = [];
  obstacleMeshes = [];
  waterInstances = null;
  waterPhases = [];
  instanceCells.clear();
  cellMeshes = Array.from({ length: WORLD_H }, () => Array(WORLD_W));

  const groundRecords = { grass: [], sand: [], water: [], lava: [] };
  const obstacleRecords = { stone: [], log: [], leaves: [] };
  const hazardRecords = { water: [], lava: [] };

  for (let z = 0; z < WORLD_H; z += 1) {
    for (let x = 0; x < WORLD_W; x += 1) {
      const type = world[z][x];
      const groundType = BLOCKS[type].solid ? BLOCKS[type].ground : type;
      const cell = { type, obstacleMesh: null, obstacleIndex: -1, surfaceIndex: -1 };
      cellMeshes[z][x] = cell;
      groundRecords[groundType].push({ x, z, cell });

      if (BLOCKS[type].solid) obstacleRecords[type].push({ x, z, cell });
      if (type === 'water' || type === 'lava') hazardRecords[type].push({ x, z, cell });
    }
  }

  for (const [type, records] of Object.entries(groundRecords)) {
    addInstanceBatch(
      type,
      records,
      groundGeometry,
      groundMaterials,
      ({ x, z }) => [gridToWorldX(x) + 0.5, -0.08, gridToWorldZ(z) + 0.5]
    );
  }

  for (const [type, records] of Object.entries(obstacleRecords)) {
    const mesh = addInstanceBatch(
      type,
      records,
      obstacleGeometry,
      obstacleMaterials,
      ({ x, z }) => {
        const height = BLOCKS[type].height;
        const width = type === 'log' ? 0.56 : type === 'leaves' ? 0.94 : 0.82;
        return [gridToWorldX(x) + 0.5, height / 2, gridToWorldZ(z) + 0.5, width, height, width];
      },
      (record, instanceMesh, index) => {
        record.cell.obstacleMesh = instanceMesh;
        record.cell.obstacleIndex = index;
      }
    );
    if (mesh) {
      obstacleMeshes.push(mesh);
      records.forEach((record, index) => {
        instanceCells.set(`${mesh.uuid}:${index}`, record);
      });
    }
  }

  for (const [type, records] of Object.entries(hazardRecords)) {
    const mesh = addInstanceBatch(
      type,
      records,
      waterGeometry,
      hazardMaterials,
      ({ x, z }) => [gridToWorldX(x) + 0.5, 0.015, gridToWorldZ(z) + 0.5],
      (record, instanceMesh, index) => {
        record.cell.surfaceIndex = index;
        if (type === 'water') waterPhases.push(Math.random() * Math.PI * 2);
      }
    );
    if (type === 'water') waterInstances = mesh;
  }
}

function createExit() {
  const gate = new THREE.Group();
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: '#43ed94',
    emissive: '#16a95b',
    emissiveIntensity: 1.15,
    roughness: 0.35,
  });
  const portalMaterial = new THREE.MeshStandardMaterial({
    color: '#b9ffe0',
    emissive: '#42e88e',
    emissiveIntensity: 0.65,
    transparent: true,
    opacity: 0.32,
    side: THREE.DoubleSide,
  });

  function part(size, position, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...position);
    mesh.castShadow = true;
    gate.add(mesh);
  }

  part([0.14, 2.25, 0.14], [0, 1.12, -0.68], frameMaterial);
  part([0.14, 2.25, 0.14], [0, 1.12, 0.68], frameMaterial);
  part([0.14, 0.16, 1.5], [0, 2.24, 0], frameMaterial);
  part([0.06, 1.98, 1.28], [0, 1.12, 0], portalMaterial);

  gate.position.set(gridToWorldX(EXIT_X) + 0.5, 0, gridToWorldZ(EXIT_Z) + 0.5);
  scene.add(gate);

  const light = new THREE.PointLight('#54ff9a', 4, 7, 2);
  light.position.set(gate.position.x, 1.3, gate.position.z);
  scene.add(light);
  return gate;
}

const exitGate = createExit();

function collides(x, z) {
  for (const offsetX of [-PLAYER_RADIUS, PLAYER_RADIUS]) {
    for (const offsetZ of [-PLAYER_RADIUS, PLAYER_RADIUS]) {
      const cellX = Math.floor(x + offsetX);
      const cellZ = Math.floor(z + offsetZ);
      if (cellX < 0 || cellZ < 0 || cellX >= WORLD_W || cellZ >= WORLD_H) return true;
      if (BLOCKS[world[cellZ][cellX]].solid) return true;
    }
  }
  return false;
}

function cellAt(x, z) {
  return world[Math.floor(z)]?.[Math.floor(x)] || 'grass';
}

function resetPlayer() {
  player.x = SPAWN_X;
  player.z = SPAWN_Z;
  player.health = 10;
  player.blocks = 0;
  player.foundExit = false;
  player.yaw = -Math.PI / 2;
  player.pitch = 0;
}

function updatePlayer(deltaTime) {
  const forwardInput = Number(Boolean(keys.w || keys.arrowup)) - Number(Boolean(keys.s || keys.arrowdown));
  const sideInput = Number(Boolean(keys.d || keys.arrowright)) - Number(Boolean(keys.a || keys.arrowleft));
  const forwardX = -Math.sin(player.yaw);
  const forwardZ = -Math.cos(player.yaw);
  const rightX = Math.cos(player.yaw);
  const rightZ = -Math.sin(player.yaw);
  let moveX = forwardX * forwardInput + rightX * sideInput;
  let moveZ = forwardZ * forwardInput + rightZ * sideInput;

  if (moveX !== 0 || moveZ !== 0) {
    const magnitude = Math.hypot(moveX, moveZ);
    moveX /= magnitude;
    moveZ /= magnitude;
    const speed = WALK_SPEED * (keys.shift ? 1.65 : 1);
    const step = speed * deltaTime;
    if (!collides(player.x + moveX * step, player.z)) player.x += moveX * step;
    if (!collides(player.x, player.z + moveZ * step)) player.z += moveZ * step;
  }

  const tile = cellAt(player.x, player.z);
  if (tile === 'lava') player.health -= deltaTime * 1.5;
  if (tile === 'water') player.health = Math.min(10, player.health + deltaTime * 0.35);
  if (player.health <= 0) resetPlayer();

  const exitX = EXIT_X + 0.5;
  const exitZ = EXIT_Z + 0.5;
  if (Math.hypot(player.x - exitX, player.z - exitZ) < 1.2) player.foundExit = true;

  camera.position.set(gridToWorldX(player.x), 1.62, gridToWorldZ(player.z));
  camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
}

function mineBlock() {
  if (document.pointerLockElement !== canvas) return;

  camera.updateMatrixWorld(true);
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hit = raycaster.intersectObjects(obstacleMeshes, false)[0];
  if (!hit || hit.instanceId === undefined) return;

  const record = instanceCells.get(`${hit.object.uuid}:${hit.instanceId}`);
  if (!record) return;

  const { x, z, cell } = record;
  const matrix = new THREE.Matrix4().makeScale(0, 0, 0);
  cell.obstacleMesh.setMatrixAt(cell.obstacleIndex, matrix);
  cell.obstacleMesh.instanceMatrix.needsUpdate = true;
  cell.obstacleMesh.computeBoundingSphere();
  instanceCells.delete(`${cell.obstacleMesh.uuid}:${cell.obstacleIndex}`);
  cell.obstacleMesh = null;
  cell.obstacleIndex = -1;
  world[z][x] = 'grass';
  player.blocks += 1;
}

function updateHud() {
  healthText.textContent = Math.max(0, Math.ceil(player.health));
  blocksText.textContent = player.blocks;
  gameStatus.textContent = player.foundExit ? 'Exit found · keep exploring' : 'Explore and find the green gate';

  const dx = EXIT_X + 0.5 - player.x;
  const dz = EXIT_Z + 0.5 - player.z;
  const angleToExit = Math.atan2(-dx, -dz);
  const relativeAngle = Math.atan2(Math.sin(angleToExit - player.yaw), Math.cos(angleToExit - player.yaw));
  exitDistance.textContent = `${Math.round(Math.hypot(dx, dz))} m`;
  exitArrow.style.transform = `rotate(${relativeAngle}rad)`;
}

function updateViewport() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) return;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function updateWater(timestamp) {
  if (!waterInstances) return;

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  for (let index = 0; index < waterInstances.count; index += 1) {
    waterInstances.getMatrixAt(index, matrix);
    matrix.decompose(position, rotation, scale);
    position.y = 0.015 + Math.sin(timestamp * 0.0015 + waterPhases[index]) * 0.035;
    matrix.compose(position, rotation, scale);
    waterInstances.setMatrixAt(index, matrix);
  }
  waterInstances.instanceMatrix.needsUpdate = true;
}

function animate(timestamp) {
  const deltaTime = lastTime ? Math.min((timestamp - lastTime) / 1000, 0.05) : 0;
  lastTime = timestamp;

  updatePlayer(deltaTime);
  updateHud();
  updateWater(timestamp);

  sunlight.position.set(camera.position.x - 18, 28, camera.position.z + 15);
  sunlight.target.position.set(camera.position.x, 0, camera.position.z);
  exitGate.rotation.y = Math.sin(timestamp * 0.0006) * 0.025;

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function enterWorld() {
  const request = canvas.requestPointerLock();
  request?.catch(() => {
    gameStatus.textContent = 'Mouse look is unavailable in this browser';
  });
}

lookPrompt.addEventListener('click', enterWorld);
canvas.addEventListener('click', enterWorld);
document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === canvas;
  lookPrompt.hidden = locked;
  crosshair.hidden = !locked;
  if (!locked) {
    for (const key of Object.keys(keys)) keys[key] = false;
  }
});
document.addEventListener('mousemove', (event) => {
  if (document.pointerLockElement !== canvas) return;
  player.yaw -= event.movementX * MOUSE_SENSITIVITY;
  player.pitch = THREE.MathUtils.clamp(
    player.pitch - event.movementY * MOUSE_SENSITIVITY,
    -Math.PI / 2 + 0.04,
    Math.PI / 2 - 0.04
  );
});
window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  keys[key] = true;
  if (key.startsWith('arrow') || key === ' ') event.preventDefault();
  if (key === ' ' && !event.repeat) mineBlock();
  if (key === 'r' && !event.repeat) {
    createWorld();
    buildWorldMeshes();
    resetPlayer();
  }
});
window.addEventListener('keyup', (event) => {
  keys[event.key.toLowerCase()] = false;
});
window.addEventListener('blur', () => {
  for (const key of Object.keys(keys)) keys[key] = false;
});
window.addEventListener('resize', updateViewport);

createWorld();
buildWorldMeshes();
camera.position.set(gridToWorldX(player.x), 1.62, gridToWorldZ(player.z));
camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
updateViewport();
requestAnimationFrame(animate);