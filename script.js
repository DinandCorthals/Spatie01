const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const healthText = document.getElementById('health');
const blocksText = document.getElementById('blocks');

const TILE = 32;
const WORLD_W = 28;
const WORLD_H = 16;

const BLOCKS = {
  grass: { color: '#5eba5a', solid: true },
  dirt: { color: '#8b5b2d', solid: true },
  stone: { color: '#8c8c8c', solid: true },
  sand: { color: '#d9c77a', solid: true },
  log: { color: '#794d20', solid: true },
  leaves: { color: '#4caf50', solid: true },
  water: { color: '#2b7fe8', solid: false },
  lava: { color: '#ff5a00', solid: false },
  bedrock: { color: '#3a3a3a', solid: true },
};

let player = {
  x: 6 * TILE + 12,
  y: 6 * TILE + 12,
  size: 18,
  speed: 2.4,
  health: 10,
  blocks: 0,
  dirX: 1,
  dirY: 0,
};

const keys = {};
let world = [];

function randomTileForDepth(y) {
  if (y > 10) return 'water';
  if (y > 8) return Math.random() < 0.8 ? 'grass' : 'sand';
  if (y > 6) return Math.random() < 0.7 ? 'dirt' : 'stone';
  if (Math.random() < 0.12) return 'log';
  if (Math.random() < 0.08) return 'lava';
  return 'stone';
}

function createWorld() {
  world = Array.from({ length: WORLD_H }, (_, y) =>
    Array.from({ length: WORLD_W }, (_, x) => {
      const edge = x === 0 || y === 0 || x === WORLD_W - 1 || y === WORLD_H - 1;
      if (edge) return 'bedrock';
      return randomTileForDepth(y);
    })
  );

  for (let y = 0; y < WORLD_H; y += 1) {
    for (let x = 0; x < WORLD_W; x += 1) {
      if (world[y][x] === 'grass' && Math.random() < 0.12) {
        world[y][x] = 'leaves';
      }
    }
  }
}

function isSolidType(type) {
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

  const cells = [
    [Math.floor(left / TILE), Math.floor(top / TILE)],
    [Math.floor(right / TILE), Math.floor(top / TILE)],
    [Math.floor(left / TILE), Math.floor(bottom / TILE)],
    [Math.floor(right / TILE), Math.floor(bottom / TILE)],
  ];

  return cells.some(([x, y]) => {
    if (x < 0 || y < 0 || x >= WORLD_W || y >= WORLD_H) return true;
    return isSolidType(world[y][x]);
  });
}

function updatePlayer() {
  let moveX = 0;
  let moveY = 0;

  if (keys.w || keys.ArrowUp) moveY -= 1;
  if (keys.s || keys.ArrowDown) moveY += 1;
  if (keys.a || keys.ArrowLeft) moveX -= 1;
  if (keys.d || keys.ArrowRight) moveX += 1;

  if (moveX !== 0 || moveY !== 0) {
    player.dirX = moveX;
    player.dirY = moveY;

    const length = Math.hypot(moveX, moveY) || 1;
    const nextX = player.x + (moveX / length) * player.speed;
    const nextY = player.y + (moveY / length) * player.speed;

    if (!collides(nextX, player.y)) player.x = nextX;
    if (!collides(player.x, nextY)) player.y = nextY;
  }

  const tile = cellAt(player.x, player.y);
  if (tile === 'lava') {
    player.health -= 0.25;
  }

  if (player.health <= 0) {
    player.health = 10;
    player.blocks = 0;
    player.x = 6 * TILE + 12;
    player.y = 6 * TILE + 12;
    player.dirX = 1;
    player.dirY = 0;
  }

  player.x = Math.max(player.size / 2, Math.min(canvas.width - player.size / 2, player.x));
  player.y = Math.max(player.size / 2, Math.min(canvas.height - player.size / 2, player.y));
}

function mineCurrentBlock() {
  const offsetX = player.dirX || 1;
  const offsetY = player.dirY || 0;

  const px = player.x + offsetX * 24;
  const py = player.y + offsetY * 24;

  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);

  if (tx < 0 || ty < 0 || tx >= WORLD_W || ty >= WORLD_H) return;

  const target = world[ty][tx];
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

  ctx.fillStyle = '#7a4ecf';
  ctx.fillRect(px, py + 8, player.size, player.size - 8);

  ctx.fillStyle = '#f1d39c';
  ctx.fillRect(px + 4, py, player.size - 8, 10);

  ctx.fillStyle = '#2d2d2d';
  ctx.fillRect(px + 3, py + 14, 4, 8);
  ctx.fillRect(px + player.size - 7, py + 14, 4, 8);
}

function drawWorld() {
  ctx.fillStyle = '#8fc9ef';
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

document.addEventListener('keydown', (event) => {
  const key = event.key;

  if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
    event.preventDefault();
  }

  if (key === 'w' || key === 'ArrowUp') keys.w = true;
  if (key === 's' || key === 'ArrowDown') keys.s = true;
  if (key === 'a' || key === 'ArrowLeft') keys.a = true;
  if (key === 'd' || key === 'ArrowRight') keys.d = true;

  if (key === ' ') {
    event.preventDefault();
    mineCurrentBlock();
  }

  if (key === 'r') {
    createWorld();
    player = {
      x: 6 * TILE + 12,
      y: 6 * TILE + 12,
      size: 18,
      speed: 2.4,
      health: 10,
      blocks: 0,
      dirX: 1,
      dirY: 0,
    };
  }
});

document.addEventListener('keyup', (event) => {
  const key = event.key;
  if (key === 'w' || key === 'ArrowUp') keys.w = false;
  if (key === 's' || key === 'ArrowDown') keys.s = false;
  if (key === 'a' || key === 'ArrowLeft') keys.a = false;
  if (key === 'd' || key === 'ArrowRight') keys.d = false;
});

canvas.addEventListener('click', () => canvas.focus());
canvas.focus();
createWorld();
requestAnimationFrame(gameLoop);
