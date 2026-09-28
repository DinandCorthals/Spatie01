const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const healthText = document.getElementById('health');
const blocksText = document.getElementById('blocks');

const TILE = 32;
const WORLD_W = 28;
const WORLD_H = 16;

const BLOCKS = {
  grass: { color: '#5cb85c', solid: true },
  dirt: { color: '#8b5a2b', solid: true },
  stone: { color: '#8a8a8a', solid: true },
  sand: { color: '#d9c27c', solid: true },
  log: { color: '#7d4f1d', solid: true },
  leaves: { color: '#4caf50', solid: true },
  water: { color: '#1d7ae6', solid: false },
  lava: { color: '#ff5c00', solid: false },
  bedrock: { color: '#404040', solid: true },
};

let player = {
  x: 4 * TILE + TILE / 2,
  y: 4 * TILE + TILE / 2,
  size: 22,
  speed: 2.2,
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

function cellAt(px, py) {
  const x = Math.floor(px / TILE);
  const y = Math.floor(py / TILE);

  if (x < 0 || y < 0 || x >= WORLD_W || y >= WORLD_H) {
    return 'bedrock';
  }

  return world[y][x];
}

function collides(nx, ny) {
  const left = nx - player.size / 2;
  const right = nx + player.size / 2;
  const top = ny - player.size / 2;
  const bottom = ny + player.size / 2;

  const cells = [
    [Math.floor(left / TILE), Math.floor(top / TILE)],
    [Math.floor(right / TILE), Math.floor(top / TILE)],
    [Math.floor(left / TILE), Math.floor(bottom / TILE)],
    [Math.floor(right / TILE), Math.floor(bottom / TILE)],
  ];

  return cells.some(([x, y]) => {
    if (x < 0 || y < 0 || x >= WORLD_W || y >= WORLD_H) return true;
    return BLOCKS[world[y][x]]?.solid;
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
    const nx = player.x + (moveX / length) * player.speed;
    const ny = player.y + (moveY / length) * player.speed;

    if (!collides(nx, player.y)) player.x = nx;
    if (!collides(player.x, ny)) player.y = ny;
  }

  const tile = cellAt(player.x, player.y);
  if (tile === 'lava') {
    player.health -= 0.3;
  }

  if (player.health <= 0) {
    player.health = 10;
    player.blocks = 0;
    player.x = 4 * TILE + TILE / 2;
    player.y = 4 * TILE + TILE / 2;
  }

  player.x = Math.max(player.size / 2, Math.min(canvas.width - player.size / 2, player.x));
  player.y = Math.max(player.size / 2, Math.min(canvas.height - player.size / 2, player.y));
}

function mineCurrentBlock() {
  const lookX = player.x + 20;
  const lookY = player.y + 20;
  const tileX = Math.floor(lookX / TILE);
  const tileY = Math.floor(lookY / TILE);

  const target = world[tileY]?.[tileX];
  if (!target || target === 'bedrock' || target === 'water' || target === 'lava') {
    return;
  }

  world[tileY][tileX] = 'grass';
  player.blocks += 1;
}

function drawTile(x, y, type) {
  const color = BLOCKS[type]?.color || '#fff';
  ctx.fillStyle = color;
  ctx.fillRect(x * TILE, y * TILE, TILE, TILE);

  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.strokeRect(x * TILE, y * TILE, TILE, TILE);
}

function drawPlayer() {
  ctx.fillStyle = '#7d4db8';
  ctx.fillRect(player.x - player.size / 2, player.y - player.size / 2, player.size, player.size);

  ctx.fillStyle = '#f0d58a';
  ctx.fillRect(player.x - 6, player.y - 10, 12, 10);
}

function drawWorld() {
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

  ctx.clearRect(0, 0, canvas.width, canvas.height);
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
      x: 4 * TILE + TILE / 2,
      y: 4 * TILE + TILE / 2,
      size: 22,
      speed: 2.2,
      health: 10,
      blocks: 0,
    };
  }
});

window.addEventListener('keyup', (event) => {
  keys[event.key.toLowerCase()] = false;
});

createWorld();
requestAnimationFrame(gameLoop);
