import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// ─── Constants ────────────────────────────────────────────────────────────────
const W = 800;
const H = 310;
const GROUND_Y = 252;
const DINO_X = 90;
const GRAVITY = 0.72;
const JUMP_FORCE = -15;
const INITIAL_SPEED = 5.5;
const MAX_SPEED = 18;
const SPEED_RAMP = 0.0015;

// ─── Types ────────────────────────────────────────────────────────────────────
type GameState = 'idle' | 'playing' | 'gameover';
type ObstacleType = 'cactus-sm' | 'cactus-lg' | 'cactus-dbl' | 'ptero-low' | 'ptero-mid' | 'ptero-high';

interface DinoState {
  y: number;      // top of dino body
  vy: number;
  ducking: boolean;
  onGround: boolean;
  legPhase: number;
}

interface Obstacle {
  type: ObstacleType;
  x: number;
  w: number;
  h: number;
  oy: number;   // y offset from ground (0 = on ground, positive = above)
  wingPhase?: number;
}

interface Cloud {
  x: number;
  y: number;
  w: number;
  speed: number;
}

interface GroundPebble {
  x: number;
  y: number;
  size: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function dinoBox(dino: DinoState): { x: number; y: number; w: number; h: number } {
  if (dino.ducking) return { x: DINO_X + 2, y: GROUND_Y - 30, w: 58, h: 28 };
  return { x: DINO_X + 2, y: dino.y + 2, w: 46, h: 50 };
}

function obstacleBox(obs: Obstacle): { x: number; y: number; w: number; h: number } {
  const y = GROUND_Y - obs.h - obs.oy;
  return { x: obs.x + 2, y: y + 2, w: obs.w - 4, h: obs.h - 4 };
}

function boxesOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function makeObstacle(x: number, speed: number): Obstacle {
  const r = Math.random();
  if (r < 0.28) return { type: 'cactus-sm',  x, w: 28, h: 52, oy: 0 };
  if (r < 0.52) return { type: 'cactus-lg',  x, w: 36, h: 72, oy: 0 };
  if (r < 0.68) return { type: 'cactus-dbl', x, w: 56, h: 56, oy: 0 };
  // Pterodactyls — only when speed is high enough to dodge
  const pteroSpeed = speed > 8;
  if (!pteroSpeed || r < 0.75) return { type: 'cactus-sm', x, w: 28, h: 52, oy: 0 };
  if (r < 0.84) return { type: 'ptero-low',  x, w: 48, h: 30, oy: 4,  wingPhase: 0 };
  if (r < 0.93) return { type: 'ptero-mid',  x, w: 48, h: 30, oy: 68, wingPhase: 0 };
  return           { type: 'ptero-high', x, w: 48, h: 30, oy: 110, wingPhase: 0 };
}

// ─── Drawing ──────────────────────────────────────────────────────────────────
function drawSky(ctx: CanvasRenderingContext2D, score: number) {
  // Day/night cycle based on score
  const dayness = Math.max(0, 1 - score / 800);
  const r1 = Math.round(14 + dayness * 180);
  const g1 = Math.round(18 + dayness * 100);
  const b1 = Math.round(40 + dayness * 60);
  const grad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  grad.addColorStop(0, `rgb(${r1},${g1},${b1})`);
  grad.addColorStop(1, `rgb(${Math.round(r1 * 1.5)},${Math.round(g1 * 1.2)},${b1})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

function drawMoon(ctx: CanvasRenderingContext2D, score: number) {
  const alpha = Math.min(1, score / 400);
  if (alpha < 0.05) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'hsl(55, 80%, 88%)';
  ctx.beginPath();
  ctx.arc(680, 40, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'hsl(220, 50%, 12%)';
  ctx.beginPath();
  ctx.arc(672, 36, 19, 0, Math.PI * 2);
  ctx.fill();
  // Stars
  ctx.fillStyle = 'hsl(55, 90%, 90%)';
  [[60, 20], [120, 10], [200, 35], [400, 18], [500, 8], [600, 28], [720, 70], [740, 15]].forEach(([sx, sy]) => {
    ctx.beginPath();
    ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawClouds(ctx: CanvasRenderingContext2D, clouds: Cloud[], score: number) {
  const alpha = 0.12 + Math.max(0, 1 - score / 600) * 0.3;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'hsl(220, 40%, 80%)';
  clouds.forEach(c => {
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, c.w, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(c.x - c.w * 0.3, c.y + 4, c.w * 0.55, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(c.x + c.w * 0.3, c.y + 6, c.w * 0.45, 11, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawGround(ctx: CanvasRenderingContext2D, pebbles: GroundPebble[], scrollX: number) {
  // Ground
  const groundGrad = ctx.createLinearGradient(0, GROUND_Y, 0, H);
  groundGrad.addColorStop(0, 'hsl(35, 40%, 32%)');
  groundGrad.addColorStop(0.15, 'hsl(32, 38%, 25%)');
  groundGrad.addColorStop(1, 'hsl(30, 35%, 18%)');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
  // Ground line
  ctx.fillStyle = 'hsl(38, 55%, 42%)';
  ctx.fillRect(0, GROUND_Y, W, 3);
  // Dashes
  ctx.fillStyle = 'hsl(38, 40%, 36%)';
  for (let i = 0; i < 12; i++) {
    const dx = ((i * 70) - (scrollX % 70));
    ctx.fillRect(dx, GROUND_Y + 1, 40, 2);
  }
  // Pebbles
  ctx.fillStyle = 'hsl(33, 30%, 40%)';
  pebbles.forEach(p => {
    const px = ((p.x - scrollX) % W + W) % W;
    ctx.beginPath();
    ctx.ellipse(px, p.y, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawDino(ctx: CanvasRenderingContext2D, dino: DinoState, dead: boolean) {
  const x = DINO_X;
  const color = dead ? 'hsl(0, 55%, 38%)' : 'hsl(128, 45%, 35%)';
  const dark  = dead ? 'hsl(0, 55%, 22%)' : 'hsl(128, 45%, 22%)';
  const light = dead ? 'hsl(0, 60%, 60%)' : 'hsl(128, 60%, 55%)';

  ctx.fillStyle = color;

  if (dino.ducking) {
    const by = GROUND_Y - 30;
    // Body
    ctx.beginPath(); ctx.roundRect(x, by, 64, 28, 8); ctx.fill();
    // Head
    ctx.beginPath(); ctx.roundRect(x + 40, by - 12, 30, 22, 6); ctx.fill();
    // Brow
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.roundRect(x + 42, by - 13, 26, 6, 3); ctx.fill();
    // Eye
    ctx.fillStyle = dead ? 'hsl(0, 90%, 70%)' : 'hsl(55, 100%, 88%)';
    ctx.beginPath(); ctx.arc(x + 64, by - 5, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'hsl(220, 60%, 10%)';
    ctx.beginPath(); ctx.arc(x + 65, by - 4, 2, 0, Math.PI * 2); ctx.fill();
    // Tail
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(x + 4, by); ctx.lineTo(x - 14, by + 10); ctx.lineTo(x + 4, by + 20);
    ctx.fill();
    // Legs tucked
    ctx.fillStyle = dark;
    ctx.fillRect(x + 12, by + 24, 13, 10);
    ctx.fillRect(x + 34, by + 24, 13, 10);
    // Feet
    ctx.fillStyle = color;
    ctx.fillRect(x + 9, by + 30, 19, 6);
    ctx.fillRect(x + 31, by + 30, 19, 6);
  } else {
    const by = dino.y; // top of body
    // Tail
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(x + 2, by + 28); ctx.lineTo(x - 16, by + 18); ctx.lineTo(x - 12, by + 36); ctx.lineTo(x + 2, by + 34);
    ctx.fill();
    // Body
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.roundRect(x, by + 18, 42, 34, 8); ctx.fill();
    // Underbelly lighter
    ctx.fillStyle = light;
    ctx.beginPath(); ctx.roundRect(x + 6, by + 28, 28, 18, 5); ctx.fill();
    // Neck
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.roundRect(x + 24, by + 4, 20, 22, 4); ctx.fill();
    // Head
    ctx.beginPath(); ctx.roundRect(x + 20, by, 36, 26, 7); ctx.fill();
    // Jaw
    ctx.beginPath(); ctx.roundRect(x + 28, by + 20, 24, 10, 4); ctx.fill();
    // Brow ridge
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.roundRect(x + 22, by - 2, 30, 7, 3); ctx.fill();
    // Nostril
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.arc(x + 52, by + 10, 3, 0, Math.PI * 2); ctx.fill();
    // Eye
    ctx.fillStyle = dead ? 'hsl(0, 90%, 65%)' : 'hsl(55, 100%, 88%)';
    ctx.beginPath(); ctx.arc(x + 36, by + 8, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'hsl(220, 70%, 10%)';
    ctx.beginPath(); ctx.arc(x + 37, by + 9, 3, 0, Math.PI * 2); ctx.fill();
    // Tiny arm
    ctx.fillStyle = dark;
    ctx.fillRect(x + 28, by + 26, 8, 5);
    ctx.fillRect(x + 34, by + 29, 5, 7);

    // Legs
    const l1 = dino.onGround ? Math.sin(dino.legPhase) * 7 : -6;
    const l2 = dino.onGround ? Math.sin(dino.legPhase + Math.PI) * 7 : 4;
    ctx.fillStyle = color;
    ctx.fillRect(x + 6,  by + 48, 14, 18 + l1);
    ctx.fillRect(x + 24, by + 48, 14, 18 + l2);
    // Feet
    ctx.fillStyle = dark;
    ctx.fillRect(x + 2,  by + 63 + l1, 22, 7);
    ctx.fillRect(x + 20, by + 63 + l2, 22, 7);
  }
}

function drawCactus(ctx: CanvasRenderingContext2D, obs: Obstacle) {
  const x = obs.x;
  const groundBase = GROUND_Y;
  const color = 'hsl(128, 50%, 30%)';
  const dark  = 'hsl(128, 50%, 18%)';
  ctx.fillStyle = color;

  if (obs.type === 'cactus-sm') {
    const base = groundBase - obs.h;
    // Trunk
    ctx.fillRect(x + 8, base, 12, obs.h);
    // Left arm
    ctx.fillRect(x, base + 14, 10, 8);
    ctx.fillRect(x, base + 8, 8, 16);
    // Right arm
    ctx.fillRect(x + 18, base + 18, 10, 8);
    ctx.fillRect(x + 20, base + 12, 8, 16);
    // Spines
    ctx.fillStyle = dark;
    ctx.fillRect(x + 10, base - 2, 8, 4);
  } else if (obs.type === 'cactus-lg') {
    const base = groundBase - obs.h;
    ctx.fillRect(x + 10, base, 16, obs.h);
    ctx.fillRect(x, base + 18, 12, 9);
    ctx.fillRect(x, base + 10, 10, 20);
    ctx.fillRect(x + 24, base + 24, 12, 9);
    ctx.fillRect(x + 26, base + 14, 10, 22);
    // Tip
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(x + 10, base); ctx.lineTo(x + 18, base - 6); ctx.lineTo(x + 26, base);
    ctx.fill();
  } else if (obs.type === 'cactus-dbl') {
    // Two cacti side by side
    const base = groundBase - obs.h;
    const b2 = groundBase - obs.h + 10;
    ctx.fillRect(x + 8, base, 12, obs.h);
    ctx.fillRect(x, base + 12, 10, 8);
    ctx.fillRect(x, base + 6, 8, 16);
    ctx.fillRect(x + 18, base + 16, 10, 8);
    ctx.fillRect(x + 20, base + 10, 8, 16);
    ctx.fillRect(x + 34, b2, 12, obs.h - 10);
    ctx.fillRect(x + 26, b2 + 14, 10, 8);
    ctx.fillRect(x + 26, b2 + 8, 8, 16);
    ctx.fillRect(x + 44, b2 + 18, 10, 8);
    ctx.fillRect(x + 46, b2 + 12, 8, 16);
  }
}

function drawPtero(ctx: CanvasRenderingContext2D, obs: Obstacle) {
  const x = obs.x;
  const cy = GROUND_Y - obs.oy - obs.h / 2;
  const wingUp = Math.sin((obs.wingPhase ?? 0)) > 0;
  const color = 'hsl(270, 45%, 40%)';
  const dark  = 'hsl(270, 45%, 25%)';

  ctx.fillStyle = color;

  // Body
  ctx.beginPath();
  ctx.ellipse(x + 24, cy, 18, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head beak
  ctx.beginPath();
  ctx.moveTo(x + 38, cy - 2);
  ctx.lineTo(x + 52, cy - 5);
  ctx.lineTo(x + 38, cy + 3);
  ctx.fill();

  // Crest
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(x + 30, cy - 10);
  ctx.lineTo(x + 42, cy - 20);
  ctx.lineTo(x + 44, cy - 10);
  ctx.fill();

  // Wings
  ctx.fillStyle = color;
  const wingY = wingUp ? -14 : 12;
  // Left wing
  ctx.beginPath();
  ctx.moveTo(x + 12, cy);
  ctx.lineTo(x - 6, cy + wingY);
  ctx.lineTo(x + 4, cy + 4);
  ctx.fill();
  // Right (actually same side going left)
  ctx.beginPath();
  ctx.moveTo(x + 10, cy);
  ctx.lineTo(x - 22, cy + wingY * 0.8);
  ctx.lineTo(x - 2, cy + 5);
  ctx.fill();

  // Eye
  ctx.fillStyle = 'hsl(55, 100%, 85%)';
  ctx.beginPath(); ctx.arc(x + 40, cy - 3, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'hsl(0, 0%, 5%)';
  ctx.beginPath(); ctx.arc(x + 41, cy - 3, 1.5, 0, Math.PI * 2); ctx.fill();

  // Tail
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(x + 6, cy);
  ctx.lineTo(x - 10, cy + 8);
  ctx.lineTo(x + 2, cy + 4);
  ctx.fill();
}

function drawHUD(ctx: CanvasRenderingContext2D, score: number, highScore: number, gameState: GameState) {
  ctx.save();
  ctx.font = 'bold 20px "Barlow Condensed", monospace';
  ctx.textAlign = 'right';
  ctx.fillStyle = 'hsl(40, 80%, 80%)';
  ctx.fillText(`HI ${String(Math.floor(highScore)).padStart(5, '0')}`, W - 12, 32);
  ctx.fillStyle = 'hsl(40, 60%, 65%)';
  ctx.fillText(String(Math.floor(score)).padStart(5, '0'), W - 90, 32);

  if (gameState === 'idle') {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'hsl(40, 90%, 75%)';
    ctx.font = 'bold 32px "Barlow Condensed", sans-serif';
    ctx.fillText('PRESS SPACE / TAP TO START', W / 2, H / 2 - 10);
    ctx.font = '18px "Barlow Condensed", sans-serif';
    ctx.fillStyle = 'hsl(40, 60%, 55%)';
    ctx.fillText('↑ SPACE = JUMP   ↓ DUCK', W / 2, H / 2 + 18);
  }

  if (gameState === 'gameover') {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'hsl(0, 80%, 65%)';
    ctx.font = 'bold 42px "Barlow Condensed", sans-serif';
    ctx.fillText('GAME OVER', W / 2, H / 2 - 16);
    ctx.font = '22px "Barlow Condensed", sans-serif';
    ctx.fillStyle = 'hsl(40, 80%, 70%)';
    ctx.fillText('SPACE / TAP TO RESTART', W / 2, H / 2 + 16);
  }
  ctx.restore();
}

// ─── Component ────────────────────────────────────────────────────────────────
const DinoGame: React.FC = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();

  // All mutable game state lives in refs — no setState during game loop
  const gState = useRef<GameState>('idle');
  const dino = useRef<DinoState>({ y: GROUND_Y - 70, vy: 0, ducking: false, onGround: true, legPhase: 0 });
  const obstacles = useRef<Obstacle[]>([]);
  const clouds = useRef<Cloud[]>([]);
  const pebbles = useRef<GroundPebble[]>([]);
  const score = useRef(0);
  const highScore = useRef(Number(localStorage.getItem('dino-hi') ?? 0));
  const speed = useRef(INITIAL_SPEED);
  const scrollX = useRef(0);
  const nextObstacleIn = useRef(120);
  const jumpQueued = useRef(false);
  const duckHeld = useRef(false);
  const lastTime = useRef(0);
  const deathFlash = useRef(0);
  const scoreFlash = useRef(0); // milestone flash

  // React display state
  const [displayScore, setDisplayScore] = useState(0);
  const [displayHi, setDisplayHi] = useState(highScore.current);
  const [gameStateDisplay, setGameStateDisplay] = useState<GameState>('idle');

  // ── Init ─────────────────────────────────────────────────────────────────
  const initPebbles = () => {
    pebbles.current = Array.from({ length: 30 }, (_, i) => ({
      x: i * 28 + Math.random() * 20,
      y: GROUND_Y + 8 + Math.random() * 20,
      size: 2 + Math.random() * 4,
    }));
  };

  const initClouds = () => {
    clouds.current = Array.from({ length: 5 }, (_, i) => ({
      x: i * 180 + 60,
      y: 40 + Math.random() * 60,
      w: 60 + Math.random() * 60,
      speed: 0.4 + Math.random() * 0.3,
    }));
  };

  const resetGame = useCallback(() => {
    dino.current = { y: GROUND_Y - 70, vy: 0, ducking: false, onGround: true, legPhase: 0 };
    obstacles.current = [];
    score.current = 0;
    speed.current = INITIAL_SPEED;
    scrollX.current = 0;
    nextObstacleIn.current = 120;
    jumpQueued.current = false;
    duckHeld.current = false;
    deathFlash.current = 0;
    gState.current = 'playing';
    setDisplayScore(0);
    setGameStateDisplay('playing');
    initClouds();
    initPebbles();
  }, []);

  // ── Input ─────────────────────────────────────────────────────────────────
  const handleJump = useCallback(() => {
    if (gState.current === 'idle' || gState.current === 'gameover') {
      resetGame();
      return;
    }
    jumpQueued.current = true;
  }, [resetGame]);

  const handleDuckStart = useCallback(() => { duckHeld.current = true; }, []);
  const handleDuckEnd   = useCallback(() => { duckHeld.current = false; }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); handleJump(); }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') { e.preventDefault(); duckHeld.current = true; }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowDown' || e.code === 'KeyS') duckHeld.current = false;
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKeyUp); };
  }, [handleJump]);

  // ── Game Loop ─────────────────────────────────────────────────────────────
  useEffect(() => {
    initClouds();
    initPebbles();

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime.current) / 16.67, 3);
      lastTime.current = now;

      const gs = gState.current;
      const d  = dino.current;
      const sp = speed.current;

      // ── Update ───────────────────────────────────────────────────────────
      if (gs === 'playing') {
        // Speed ramp
        speed.current = Math.min(MAX_SPEED, speed.current + SPEED_RAMP * dt);
        score.current += sp * dt * 0.06;

        // Score milestone flash
        const s = Math.floor(score.current);
        if (s > 0 && s % 100 === 0 && scoreFlash.current !== s) {
          scoreFlash.current = s;
        }

        // Dino physics
        if (duckHeld.current && d.onGround) {
          d.ducking = true;
          jumpQueued.current = false;
        } else {
          d.ducking = false;
        }

        if (jumpQueued.current && d.onGround) {
          d.vy = JUMP_FORCE;
          d.onGround = false;
          jumpQueued.current = false;
        }

        if (!d.onGround || !d.ducking) {
          d.vy += GRAVITY * dt;
          d.y  += d.vy * dt;
        }

        const groundedY = GROUND_Y - 70;
        if (d.y >= groundedY) {
          d.y = groundedY;
          d.vy = 0;
          d.onGround = true;
        }

        // Leg animation
        if (d.onGround && !d.ducking) {
          d.legPhase += sp * dt * 0.14;
        }

        // Clouds
        clouds.current.forEach(c => {
          c.x -= c.speed * dt;
          if (c.x < -100) { c.x = W + 80; c.y = 30 + Math.random() * 70; }
        });

        // Ground scroll
        scrollX.current += sp * dt;

        // Obstacle spawn
        nextObstacleIn.current -= sp * dt;
        if (nextObstacleIn.current <= 0) {
          obstacles.current.push(makeObstacle(W + 20, sp));
          const minGap = Math.max(220, 600 - sp * 20);
          const maxGap = minGap + 220;
          nextObstacleIn.current = minGap + Math.random() * (maxGap - minGap);
        }

        // Move obstacles + wing flap
        obstacles.current.forEach(o => {
          o.x -= sp * dt;
          if (o.wingPhase !== undefined) o.wingPhase += 0.15 * dt;
        });
        obstacles.current = obstacles.current.filter(o => o.x > -80);

        // Collision
        const db = dinoBox(d);
        for (const obs of obstacles.current) {
          if (boxesOverlap(db, obstacleBox(obs))) {
            gState.current = 'gameover';
            deathFlash.current = 8;
            if (score.current > highScore.current) {
              highScore.current = score.current;
              localStorage.setItem('dino-hi', String(score.current));
              setDisplayHi(score.current);
            }
            setGameStateDisplay('gameover');
            break;
          }
        }

        setDisplayScore(Math.floor(score.current));
      }

      // ── Draw ─────────────────────────────────────────────────────────────
      const sc = score.current;

      // Death flash
      if (deathFlash.current > 0) {
        ctx.fillStyle = 'hsl(0, 80%, 55%, 0.35)';
        ctx.fillRect(0, 0, W, H);
        deathFlash.current -= dt;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      drawSky(ctx, sc);
      drawMoon(ctx, sc);
      drawClouds(ctx, clouds.current, sc);
      drawGround(ctx, pebbles.current, scrollX.current);
      obstacles.current.forEach(obs => {
        if (obs.type.startsWith('ptero')) drawPtero(ctx, obs);
        else drawCactus(ctx, obs);
      });
      drawDino(ctx, d, gs === 'gameover');

      // Score milestone flash overlay
      if (scoreFlash.current > 0 && Math.floor(sc) === scoreFlash.current) {
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = 'hsl(45, 100%, 70%)';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
        ctx.save();
        ctx.font = 'bold 28px "Barlow Condensed", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'hsl(45, 100%, 80%)';
        ctx.fillText(`${scoreFlash.current}!`, W / 2, 50);
        ctx.restore();
      }

      drawHUD(ctx, sc, highScore.current, gs);

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current!);
  }, []);

  // ── Touch controls ────────────────────────────────────────────────────────
  let touchStartY = 0;
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY = e.touches[0].clientY;
    handleJump();
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const dy = e.touches[0].clientY - touchStartY;
    if (dy > 30) handleDuckStart();
  };
  const onTouchEnd = () => handleDuckEnd();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <h1 className="font-display text-2xl text-accent">🦕 DINO RUN</h1>
        <div className="hidden sm:flex items-center gap-4 text-muted-foreground text-xs font-display">
          <span>↑ SPACE = JUMP</span>
          <span>↓ = DUCK</span>
        </div>
        <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground text-sm font-display transition-colors">QUIT</button>
      </div>

      {/* Score bar */}
      <div className="flex justify-between items-center px-4 py-2 bg-card border-b border-border">
        <div className="flex gap-6">
          <div>
            <p className="text-xs font-display text-muted-foreground">SCORE</p>
            <p className="font-display text-xl text-accent">{String(displayScore).padStart(5, '0')}</p>
          </div>
          <div>
            <p className="text-xs font-display text-muted-foreground">BEST</p>
            <p className="font-display text-xl text-foreground">{String(Math.floor(displayHi)).padStart(5, '0')}</p>
          </div>
        </div>
        <div className="text-xs text-muted-foreground font-display sm:hidden">TAP = JUMP · SWIPE ↓ = DUCK</div>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="w-full rounded-2xl border border-border cursor-pointer"
            style={{ imageRendering: 'crisp-edges' }}
            onClick={handleJump}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          />
          {/* Controls hint */}
          <div className="mt-3 flex justify-center gap-6 text-xs text-muted-foreground font-display">
            <span className="flex items-center gap-1.5">
              <kbd className="bg-muted border border-border px-2 py-0.5 rounded text-xs">SPACE</kbd> / <kbd className="bg-muted border border-border px-2 py-0.5 rounded text-xs">↑</kbd> Jump
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="bg-muted border border-border px-2 py-0.5 rounded text-xs">↓</kbd> Duck
            </span>
            <span className="flex items-center gap-1.5">📱 Tap jump · Swipe ↓ duck</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DinoGame;
