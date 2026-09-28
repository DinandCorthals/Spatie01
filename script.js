const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const healthText = document.getElementById('health');
const blocksText = document.getElementById('blocks');

const TILE = 32;
const WORLD_W = 28;
const WORLD_H = 16;

const BLOCKS = {
  grass: { color: '#5dbb5d', solid: true },
  dirt: { color: '#8d5a2b', solid: true },
  stone: { color: '#8e8e8e', solid: true },
  sand: { color: '#d9c47a', solid: true },
  log: { color: '#7b4d22', solid: true },
  leaves: { color: '#4caf50', solid: true },
  water: { color: '#2e7de9', solid: false },
  lava: { color: '#ff5a00', solid: false },
  bedrock: { color: '#3d3d3d', solid: true },
};

let player = {
  x: 6 * TILE + 10,
  y: 6 * TILE + 10,
  size: 20,
  speed: 2.4,
  health: 10,
  blocks: 0,
};

let world = [];
const keys = {};

function createWorld() {
  world = Array.from({ length: WORLD_H }, (_, y) =>
    Array.from({ length: WORLD_W }, (_, x) => {
      const edge = x === 0 || y === 0 || x === WORLD_W - 1 || y === WORLD_H - 1;
      if (edge) return 'bedrock';
      if (y > 10) return 'water';
      if (y > 8) return Math.random() < 0.8 ? 'grass' : 'sand';
      if (y > 6) return Math.random() < 0.7 ? 'dirt' : 'stone';
      if (Math.random() < 0.12) return 'log';
      if (Math.random() < 0.08) return 'lava';
      return 'stone';
    })
  );

  for (let y = 0; y < WORLD_H; y += 1) {
    for (let x = 0; x < WORLD_W; x += 1) {
      if (world[y][x] === 'grass' && Math.random() < 0.15) {
        world[y][x] = 'leaves';
      }
    }
  }
}

function isSolid(type) {
  return !!BLOCKS[type]?.solid;
}

function cellAt(px, py) {
  const x = Math.floor(px / TILE);
  const y = Math.floor(py / TILE);
  if (x < 0 || y < 0 || x >= WORLD_W || y >= WORLD_H) return 'bedrock';
  return world[y][x];
}

function collides(nx, ny) {
  const left = nx - player.size / 2;
  const right = nx + player.size / 2;
  const top = ny - player.size / 2;
  const bottom = ny + player.size / 2;

  const points = [
    [Math.floor(left / TILE), Math.floor(top / TILE)],
    [Math.floor(right / TILE), Math.floor(top / TILE)],
    [Math.floor(left / TILE), Math.floor(bottom / TILE)],
    [Math.floor(right / TILE), Math.floor(bottom / TILE)],
  ];

  return points.some(([x, y]) => {
    if (x < 0 || y < 0 || x >= WORLD_W || y >= WORLD_H) return true;
    return isSolid(world[y][x]);
  });
}

function updatePlayer() {
  let moveX = 0;
  let moveY = 0;

  if (keys.w || keys.arrowup) moveY -= 1;
  if (keys.s || keys.arrowdown) moveY += 1;
  if (keys.a || keys.arrowleft) moveX -= 1;
  if (keys.d || keys.arrowright) moveX += 1;

  if (moveX !== 0 || moveY !== 0) {
    const length = Math.hypot(moveX, moveY) || 1;
    const targetX = player.x + (moveX / length) * player.speed;
    const targetY = player.y + (moveY / length) * player.speed;

    if (!collides(targetX, player.y)) player.x = targetX;
    if (!collides(player.x, targetY)) player.y = targetY;
  }

  const tile = cellAt(player.x, player.y);
  if (tile === 'lava') {
    player.health -= 0.25;
  }

  if (player.health <= 0) {
    player.health = 10;
    player.blocks = 0;
    player.x = 6 * TILE + 10;
    player.y = 6 * TILE + 10;
  }

  player.x = Math.max(player.size / 2, Math.min(canvas.width - player.size / 2, player.x));
  player.y = Math.max(player.size / 2, Math.min(canvas.height - player.size / 2, player.y));
}

function mineCurrentBlock() {
  const px = player.x + player.size / 2 + 8;
  const py = player.y + player.size / 2 + 8;

  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);

  const target = world[ty]?.[tx];
  if (!target || target === 'bedrock' || target === 'water' || target === 'lava') {
    return;
  }

  world[ty][tx] = 'grass';
  player.blocks += 1;
}

function drawTile(x, y, type) {
  const color = BLOCKS[type]?.color || '#ffffff';
  ctx.fillStyle = color;
  ctx.fillRect(x * TILE, y * TILE, TILE, TILE);

  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.strokeRect(x * TILE, y * TILE, TILE, TILE);
}

function drawPlayer() {
  const px = player.x - player.size / 2;
  const py = player.y - player.size / 2;

  ctx.fillStyle = '#7347b5';
  ctx.fillRect(px, py + 8, player.size, player.size - 8);

  ctx.fillStyle = '#f2d8a5';
  ctx.fillRect(px + 4, py, player.size - 8, 10);

  ctx.fillStyle = '#2e2e2e';
  ctx.fillRect(px + 4, py + 14, 4, 8);
  ctx.fillRect(px + player.size - 8, py + 14, 4, 8);
}

function drawWorld() {
  ctx.fillStyle = '#8ec7ee';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < WORLD_H; y += 1) {
    for (let x = 0; x < WORLD_W; x += 1) {
      drawTile(x, y, world[y][x]);
    }
  }

  drawPlayer();
}

function updateHud() {
  healthText.textContent = Math.max(0, Math.ceil(player.health));
  blocksText.textContent = player.blocks;
}

function gameLoop() {
  updatePlayer();
  updateHud();
  drawWorld();
  requestAnimationFrame(gameLoop);
}

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  keys[key] = true;

  if (key === ' ') {
    event.preventDefault();
    mineCurrentBlock();
  }

  if (key === 'r') {
    createWorld();
    player = {
      x: 6 * TILE + 10,
      y: 6 * TILE + 10,
      size: 20,
      speed: 2.4,
      health: 10,
      blocks: 0,
    };
  }
});

window.addEventListener('keyup', (event) => {
  keys[event.key.toLowerCase()] = false;
});

canvas.addEventListener('click', () => canvas.focus());

createWorld();
canvas.focus();
requestAnimationFrame(gameLoop);

