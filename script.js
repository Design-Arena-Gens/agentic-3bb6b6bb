const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const cheeseEl = document.getElementById('cheese');
const highScoreEl = document.getElementById('high-score');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const restartBtn = document.getElementById('restart');

const WORLD = {
  width: canvas.width,
  height: canvas.height,
};

const COLORS = {
  jerry: '#f7b500',
  tom: '#5bd5ff',
  cheese: '#ffd866',
};

const KEY_STATE = new Map();

document.addEventListener('keydown', (event) => {
  KEY_STATE.set(event.code, true);
  if (event.code === 'Space' && game.state !== 'running') {
    startGame();
  }
});

document.addEventListener('keyup', (event) => {
  KEY_STATE.set(event.code, false);
});

restartBtn.addEventListener('click', startGame);

class Entity {
  constructor(x, y, radius, color) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
  }

  draw() {
    ctx.beginPath();
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 12;
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

class Cheese extends Entity {
  constructor(x, y) {
    super(x, y, 14, COLORS.cheese);
    this.pulse = Math.random() * Math.PI * 2;
  }

  update(t) {
    this.pulse += t * 4;
    this.radius = 12 + Math.sin(this.pulse) * 2;
    this.draw();
  }
}

class Jerry extends Entity {
  constructor() {
    super(WORLD.width * 0.25, WORLD.height * 0.5, 16, COLORS.jerry);
    this.speed = 220;
    this.dashBoost = 0;
  }

  update(dt) {
    const dir = { x: 0, y: 0 };
    if (KEY_STATE.get('ArrowUp') || KEY_STATE.get('KeyW')) dir.y -= 1;
    if (KEY_STATE.get('ArrowDown') || KEY_STATE.get('KeyS')) dir.y += 1;
    if (KEY_STATE.get('ArrowLeft') || KEY_STATE.get('KeyA')) dir.x -= 1;
    if (KEY_STATE.get('ArrowRight') || KEY_STATE.get('KeyD')) dir.x += 1;

    let dashActive = false;
    if ((KEY_STATE.get('ShiftLeft') || KEY_STATE.get('ShiftRight')) && game.cheese > 0) {
      dashActive = true;
    }

    let currentSpeed = this.speed;
    if (dashActive && this.dashBoost <= 0) {
      this.dashBoost = 1.1; // seconds of dash
      game.cheese -= 1;
      cheeseEl.textContent = game.cheese;
    }

    if (this.dashBoost > 0) {
      currentSpeed *= 1.9;
      this.dashBoost -= dt;
    }

    const magnitude = Math.hypot(dir.x, dir.y) || 1;
    this.x += (dir.x / magnitude) * currentSpeed * dt;
    this.y += (dir.y / magnitude) * currentSpeed * dt;

    this.x = Math.max(this.radius, Math.min(WORLD.width - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(WORLD.height - this.radius, this.y));

    this.draw();

    if (this.dashBoost > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 6, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }
  }
}

class Tom extends Entity {
  constructor() {
    super(WORLD.width * 0.75, WORLD.height * 0.5, 22, COLORS.tom);
    this.baseSpeed = 140;
  }

  update(dt) {
    const target = game.jerry;
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const distance = Math.hypot(dx, dy) || 1;

    const difficultyBoost = 1 + game.elapsed / 60;
    const cheesePenalty = 1 - Math.min(game.cheese * 0.04, 0.4);
    const speed = this.baseSpeed * difficultyBoost * cheesePenalty;

    this.x += (dx / distance) * speed * dt;
    this.y += (dy / distance) * speed * dt;

    this.draw();
  }
}

const game = {
  state: 'idle',
  jerry: null,
  tom: null,
  cheese: 0,
  elapsed: 0,
  score: 0,
  best: parseInt(localStorage.getItem('tj-best-score') ?? '0', 10),
  cheeses: [],
  cheeseTimer: 0,
};

highScoreEl.textContent = game.best;

function resetGame() {
  game.state = 'idle';
  game.jerry = new Jerry();
  game.tom = new Tom();
  game.cheese = 0;
  game.elapsed = 0;
  game.score = 0;
  game.cheeseTimer = 0;
  game.cheeses = [];
  cheeseEl.textContent = '0';
  scoreEl.textContent = '0';
}

function startGame() {
  resetGame();
  overlay.classList.add('hidden');
  game.state = 'running';
  lastTime = performance.now();
  requestAnimationFrame(loop);
}

function spawnCheese() {
  const padding = 40;
  let x = padding + Math.random() * (WORLD.width - padding * 2);
  let y = padding + Math.random() * (WORLD.height - padding * 2);
  const cheese = new Cheese(x, y);
  game.cheeses.push(cheese);
}

function handleCheese() {
  game.cheeseTimer -= game.delta;
  if (game.cheeseTimer <= 0) {
    spawnCheese();
    game.cheeseTimer = 6 + Math.random() * 4;
  }

  game.cheeses = game.cheeses.filter((cheese) => {
    const dist = Math.hypot(cheese.x - game.jerry.x, cheese.y - game.jerry.y);
    if (dist < cheese.radius + game.jerry.radius) {
      game.cheese += 1;
      cheeseEl.textContent = game.cheese;
      return false;
    }
    cheese.update(game.delta);
    return true;
  });
}

function checkCollision() {
  const dist = Math.hypot(game.jerry.x - game.tom.x, game.jerry.y - game.tom.y);
  if (dist < game.jerry.radius + game.tom.radius - 4) {
    endGame();
  }
}

function endGame() {
  game.state = 'ended';
  overlayTitle.textContent = `Tom caught Jerry! Score: ${Math.floor(game.score)}`;
  overlay.classList.remove('hidden');
  if (game.score > game.best) {
    game.best = Math.floor(game.score);
    localStorage.setItem('tj-best-score', String(game.best));
    highScoreEl.textContent = game.best;
  }
}

let lastTime = performance.now();

function loop(timestamp) {
  if (game.state !== 'running') return;

  game.delta = Math.min(0.033, (timestamp - lastTime) / 1000);
  lastTime = timestamp;
  game.elapsed += game.delta;
  game.score += game.delta * 100;
  scoreEl.textContent = Math.floor(game.score).toString();

  ctx.clearRect(0, 0, WORLD.width, WORLD.height);
  drawBackground();
  handleCheese();
  game.jerry.update(game.delta);
  game.tom.update(game.delta);
  drawTrail(game.jerry);
  drawTrail(game.tom, true);
  checkCollision();

  if (game.state === 'running') {
    requestAnimationFrame(loop);
  }
}

function drawBackground() {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  const gridSize = 60;
  for (let x = gridSize; x < WORLD.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, WORLD.height);
    ctx.stroke();
  }
  for (let y = gridSize; y < WORLD.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD.width, y);
    ctx.stroke();
  }
  ctx.restore();
}

const trailMap = new Map();

function drawTrail(entity, isTom = false) {
  const key = isTom ? 'tom' : 'jerry';
  if (!trailMap.has(key)) {
    trailMap.set(key, []);
  }
  const trail = trailMap.get(key);
  trail.push({ x: entity.x, y: entity.y, alpha: 0.4, life: 0.5 });
  while (trail.length > 40) {
    trail.shift();
  }
  for (let i = 0; i < trail.length; i += 1) {
    const node = trail[i];
    node.life -= game.delta;
    node.alpha = Math.max(0, node.life * 0.8);
    const size = entity.radius * (node.life * 1.8);
    ctx.beginPath();
    ctx.fillStyle = `rgba(${isTom ? '91,213,255' : '247,181,0'},${node.alpha})`;
    ctx.arc(node.x, node.y, Math.max(1.5, size), 0, Math.PI * 2);
    ctx.fill();
  }
  trailMap.set(
    key,
    trail.filter((node) => node.life > 0)
  );
}

resetGame();
overlay.classList.remove('hidden');
overlayTitle.textContent = 'Press Space to Start!';
