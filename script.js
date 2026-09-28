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
  coal: { color: '#2a2a2a', solid: true },
  iron: { color: '#c0c0c0', solid: true },
  gold: { color: '#ffd700', solid: true },
  diamond: { color: '#00ffff', solid: true },
  air: { color: null, solid: false },
};

let player = {
  x: 0,
  y: 0,
  size: 18,
  speed: 3,
  health: 20,
  maxHealth: 20,
  blocks: 0,
  dirX: 1,
  dirY: 0,
  isMoving: false,
};

const keys = {};
let world = [];
let particles = [];

function randomTileForDepth(y) {
  if (y > 12) return 'water';
  if (y > 10) return Math.random() < 0.6 ? 'sand' : 'dirt';
  if (y > 8) return Math.random() < 0.7 ? 'grass' : 'dirt';
  if (y > 5) return Math.random() < 0.6 ? 'dirt' : 'stone';
  if (Math.random() < 0.08) return 'coal';
  if (Math.random() < 0.04) return 'iron';
  if (Math.random() < 0.02) return 'gold';
  if (Math.random() < 0.01) return 'diamond';
  if (Math.random() < 0.05) return 'lava';
  return 'stone';
}

function createWorld() {
  world = Array.from({ length: WORLD_H }, (_, y) =>
    Array.from({ length: WORLD_W }, (_, x) => {
      const edge = x === 0 || y === 0 || x === WORLD_W - 1 || y === WORLD_H - 1;
      if (edge) return 'bedrock';
      
      // Create safe spawn area (top-left area)
      if (x < 5 && y < 5) return 'air';
      
      return randomTileForDepth(y);
    })
  );

  // Add trees
  for (let y = 0; y < WORLD_H; y += 1) {
    for (let x = 0; x < WORLD_W; x += 1) {
      if (world[y][x] === 'grass' && Math.random() < 0.08) {
        // Tree trunk
        if (y + 3 < WORLD_H) {
          world[y + 1][x] = 'log';
          world[y + 2][x] = 'log';
          
          // Tree leaves
          for (let ly = -2; ly <= 2; ly++) {
            for (let lx = -2; lx <= 2; lx++) {
              const ny = y - 1 + ly;
              const nx = x + lx;
              if (ny >= 0 && ny < WORLD_H && nx >= 0 && nx < WORLD_W) {
                if (world[ny][nx] !== 'log' && world[ny][nx] !== 'bedrock') {
                  world[ny][nx] = 'leaves';
                }
              }
            }
          }
        }
      }
    }
  }

  // Find safe spawn location
  let spawnFound = false;
  for (let y = 1; y < 5; y++) {
    for (let x = 1; x < 5; x++) {
      if (!isSolidType(world[y][x])) {
        player.x = x * TILE + TILE / 2;
        player.y = y * TILE + TILE / 2;
        spawnFound = true;
        break;
      }
    }
    if (spawnFound) break;
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

function addParticle(x, y, color) {
  particles.push({
    x: x + (Math.random() - 0.5) * 16,
    y: y + (Math.random() - 0.5) * 16,
    vx: (Math.random() - 0.5) * 4,
    vy: (Math.random() - 0.5) * 4 - 1,
    life: 20,
    maxLife: 20,
    color: color,
  });
}

function updateParticles() {
  particles = particles.filter(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.1; // gravity
    p.life -= 1;
    return p.life > 0;
  });
}

function updatePlayer() {
  let moveX = 0;
  let moveY = 0;

  if (keys.w || keys.arrowup) moveY -= 1;
  if (keys.s || keys.arrowdown) moveY += 1;
  if (keys.a || keys.arrowleft) moveX -= 1;
  if (keys.d || keys.arrowright) moveX += 1;

  player.isMoving = moveX !== 0 || moveY !== 0;

  if (player.isMoving) {
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
    player.health -= 0.5;
  } else if (tile === 'water') {
    player.speed = 1.5;
  } else {
    player.speed = 3;
  }

  // Collect ores
  const gridX = Math.floor(player.x / TILE);
  const gridY = Math.floor(player.y / TILE);
  const centerTile = world[gridY]?.[gridX];
  if (['coal', 'iron', 'gold', 'diamond'].includes(centerTile)) {
    addParticle(player.x, player.y, BLOCKS[centerTile].color);
    world[gridY][gridX] = 'air';
    player.blocks += centerTile === 'diamond' ? 5 : centerTile === 'gold' ? 3 : centerTile === 'iron' ? 2 : 1;
  }

  if (player.health <= 0) {
    resetGame();
  }

  player.x = Math.max(player.size / 2, Math.min(canvas.width - player.size / 2, player.x));
  player.y = Math.max(player.size / 2, Math.min(canvas.height - player.size / 2, player.y));
}

function resetGame() {
  createWorld();
  player.health = player.maxHealth;
  player.blocks = 0;
  player.dirX = 1;
  player.dirY = 0;
}

function mineCurrentBlock() {
  const offsetX = player.dirX || 1;
  const offsetY = player.dirY || 0;

  const px = player.x + offsetX * 24;
  const py = player.y + offsetY * 24;

  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);

  if (tx < 0 || ty < 0 || tx >= WORLD_W || ty >= WORLD_H) return;

  const target = world[ty]?.[tx];
  if (!target || target === 'bedrock' || target === 'water' || target === 'lava' || target === 'air') {
    return;
  }

  const blockValue = target === 'diamond' ? 5 : target === 'gold' ? 3 : target === 'iron' ? 2 : 1;
  addParticle(px, py, BLOCKS[target].color);
  world[ty][tx] = 'air';
  player.blocks += blockValue;
}

function drawTile(x, y, type) {
  if (!BLOCKS[type]) return;
  
  const color = BLOCKS[type].color;
  if (!color) return;

  ctx.fillStyle = color;
  ctx.fillRect(x * TILE, y * TILE, TILE, TILE);

  // Add shading for depth
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(x * TILE, y * TILE, TILE, 2);
  
  // Border
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x * TILE, y * TILE, TILE, TILE);

  // Special texture for certain blocks
  if (type === 'grass') {
    ctx.fillStyle = 'rgba(100, 150, 80, 0.3)';
    ctx.fillRect(x * TILE + 2, y * TILE + 2, TILE - 4, 4);
  } else if (type === 'log') {
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(x * TILE + 6, y * TILE, 4, TILE);
    ctx.fillRect(x * TILE, y * TILE + 6, TILE, 4);
  }
}

function drawPlayer() {
  const px = player.x - player.size / 2;
  const py = player.y - player.size / 2;

  // Head
  ctx.fillStyle = '#f1d39c';
  ctx.fillRect(px + 4, py, player.size - 8, 10);
  
  // Eyes
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(px + 6, py + 3, 3, 3);
  ctx.fillRect(px + player.size - 9, py + 3, 3, 3);
  
  // Mouth
  ctx.fillStyle = '#d4a574';
  ctx.fillRect(px + 7, py + 7, 4, 1);

  // Body (with animation)
  const bodyColor = player.isMoving ? '#4a7ec7' : '#4a7ec7';
  ctx.fillStyle = bodyColor;
  ctx.fillRect(px + 3, py + 10, player.size - 6, 8);

  // Arms
  const armOffset = player.isMoving ? Math.sin(Date.now() / 100) * 2 : 0;
  ctx.fillStyle = '#f1d39c';
  ctx.fillRect(px - 2, py + 10 + armOffset, 3, 8);
  ctx.fillRect(px + player.size - 1, py + 10 - armOffset, 3, 8);

  // Legs
  ctx.fillStyle = '#2d2d2d';
  ctx.fillRect(px + 5, py + 18, 3, player.size - 18);
  ctx.fillRect(px + player.size - 8, py + 18, 3, player.size - 18);
}

function drawParticles() {
  particles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
  });
  ctx.globalAlpha = 1;
}

function drawWorld() {
  ctx.fillStyle = '#87ceeb';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw clouds
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  for (let i = 0; i < 3; i++) {
    const cloudX = ((Date.now() / 50 + i * 200) % canvas.width);
    ctx.fillRect(cloudX, 20 + i * 60, 80, 20);
    ctx.fillRect(cloudX + 20, 10 + i * 60, 60, 15);
  }

  for (let y = 0; y < WORLD_H; y += 1) {
    for (let x = 0; x < WORLD_W; x += 1) {
      drawTile(x, y, world[y][x]);
    }
  }

  drawParticles();
  drawPlayer();
}

function updateHud() {
  healthText.textContent = Math.max(0, Math.ceil(player.health));
  blocksText.textContent = player.blocks;
}

function gameLoop() {
  updatePlayer();
  updateParticles();
  updateHud();
  drawWorld();
  requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();

  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
    event.preventDefault();
  }

  keys[key] = true;

  if (key === ' ') {
    event.preventDefault();
    mineCurrentBlock();
  }

  if (key === 'r') {
    event.preventDefault();
    resetGame();
  }
});

document.addEventListener('keyup', (event) => {
  const key = event.key.toLowerCase();
  keys[key] = false;
});

canvas.addEventListener('click', () => canvas.focus());
canvas.focus();
createWorld();
requestAnimationFrame(gameLoop);
