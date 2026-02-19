import { GameState, Tone } from './types';

const PLAYER_W = 18;
const PLAYER_H = 28;

const TONE_COLORS: Record<string, string> = {
  low: '#c68642',
  high: '#87ceeb',
  whisper: '#dda0dd',
  silence: '#e8e8e8',
};

// Persistent star data
const STARS = Array.from({ length: 80 }, (_, i) => ({
  x: Math.abs(Math.sin(i * 127.1) * 900),
  y: Math.abs(Math.sin(i * 311.7) * 320),
  r: 0.3 + Math.abs(Math.sin(i * 73.3)) * 1.2,
  twinkle: Math.random() * Math.PI * 2,
  speed: 0.01 + Math.random() * 0.02,
}));

const DUST = Array.from({ length: 30 }, (_, i) => ({
  x: Math.abs(Math.sin(i * 213.3) * 900),
  y: 100 + Math.abs(Math.sin(i * 149.7) * 400),
  r: 0.5 + Math.abs(Math.sin(i * 88.1)),
  phase: Math.random() * Math.PI * 2,
}));

export function render(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number) {
  ctx.save();
  ctx.filter = 'none';

  const camX = Math.round(state.camera.x);
  const camY = Math.round(state.camera.y);

  // === BACKGROUND (screen-space) ===
  if (state.level === 2) {
    drawLevel2Background(ctx, W, H, state);
  } else {
    drawBackground(ctx, W, H);
  }

  // ── World-space layer ──────────────────────
  ctx.save();
  ctx.translate(-camX, -camY);

  // === ATMOSPHERIC LAYERS ===
  drawAtmosphere(ctx, state, W, H, camX);

  // === LIGHT HALOS ===
  drawLightHalos(ctx, state, W, H);

  if (state.level === 2) {
    drawWindowShafts(ctx, state);
  }

  // === SHADOW PLATFORMS ===
  drawShadowPlatforms(ctx, state);

  // === STATIC PLATFORMS ===
  drawPlatforms(ctx, state);

  // === GOAL ===
  const goalPlat = state.platforms[state.platforms.length - 1];
  drawGoal(ctx, goalPlat.x + goalPlat.w / 2, goalPlat.y - 22);

  // === CANDLES ===
  for (const light of state.lights) {
    if (light.id === 'moon') continue;
    drawCandle(ctx, light.pos.x, light.pos.y, light.held, state);
  }

  // === RIPPLES ===
  drawRipples(ctx, state);

  // === PARTICLES ===
  drawParticles(ctx, state);

  // === PLAYER ===
  drawPlayer(ctx, state);

  ctx.restore();
  // ── End world-space ───────────────────────

  // === FOG OVERLAY (screen-space) ===
  drawFog(ctx, W, H, state);

  // === UI (screen-space) ===
  drawUI(ctx, state, W, H);

  if (state.levelComplete) drawLevelComplete(ctx, W, H);

  ctx.restore();
}

// ─────────────────────────────────────────────
// BACKGROUND — Level 1
// ─────────────────────────────────────────────
function drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#04040f');
  bg.addColorStop(0.4, '#080820');
  bg.addColorStop(0.75, '#0d0d1a');
  bg.addColorStop(1, '#131320');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Stars
  const t = Date.now() * 0.001;
  for (const s of STARS) {
    const alpha = 0.3 + 0.5 * Math.abs(Math.sin(t * s.speed + s.twinkle));
    ctx.save();
    ctx.filter = `blur(${s.r > 1 ? '0.5px' : '0px'})`;
    ctx.fillStyle = `rgba(200,215,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Moon glow in sky
  const moonG = ctx.createRadialGradient(720, 0, 0, 720, 0, 300);
  moonG.addColorStop(0, 'rgba(180,200,240,0.12)');
  moonG.addColorStop(1, 'rgba(180,200,240,0)');
  ctx.fillStyle = moonG;
  ctx.fillRect(0, 0, W, H * 0.6);
}

// ─────────────────────────────────────────────
// BACKGROUND — Level 2: The Window Harp
// ─────────────────────────────────────────────
function drawLevel2Background(ctx: CanvasRenderingContext2D, W: number, H: number, state: GameState) {
  // Deep stone chamber
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#06060f');
  bg.addColorStop(0.5, '#0a0a18');
  bg.addColorStop(1, '#0e0e20');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Faint stone texture lines
  ctx.strokeStyle = 'rgba(100,100,160,0.04)';
  ctx.lineWidth = 1;
  for (let y = 0; y < H; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // Stars near the top of the chamber (visible through the opening)
  const t = Date.now() * 0.001;
  for (const s of STARS) {
    if (s.y > H * 0.25) continue; // only top stars visible
    const alpha = 0.2 + 0.4 * Math.abs(Math.sin(t * s.speed + s.twinkle));
    ctx.save();
    ctx.filter = `blur(${s.r > 1 ? '0.5px' : '0px'})`;
    ctx.fillStyle = `rgba(200,215,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Left & right wall silhouette in screen space
  const wallG_L = ctx.createLinearGradient(0, 0, 50, 0);
  wallG_L.addColorStop(0, 'rgba(8,8,20,0.95)');
  wallG_L.addColorStop(1, 'rgba(8,8,20,0)');
  ctx.fillStyle = wallG_L;
  ctx.fillRect(0, 0, 50, H);

  const wallG_R = ctx.createLinearGradient(W - 50, 0, W, 0);
  wallG_R.addColorStop(0, 'rgba(8,8,20,0)');
  wallG_R.addColorStop(1, 'rgba(8,8,20,0.95)');
  ctx.fillStyle = wallG_R;
  ctx.fillRect(W - 50, 0, 50, H);

  // Echo indicator — pulse ring when echoTone active
  if (state.echoTone && state.echoTimer > 0) {
    const echoColors: Record<string, string> = {
      low: '#c68642', high: '#87ceeb', whisper: '#dda0dd', silence: '#ffffff',
    };
    const col = echoColors[state.echoTone as string] || '#ffffff';
    const alpha = state.echoTimer / 35;
    ctx.save();
    ctx.filter = 'blur(3px)';
    ctx.strokeStyle = col + Math.floor(alpha * 180).toString(16).padStart(2, '0');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(4, 4, W - 8, H - 8, 4);
    ctx.stroke();
    ctx.restore();
  }
}

// ─────────────────────────────────────────────
// WINDOW SHAFTS — Level 2 (world-space)
// ─────────────────────────────────────────────
function drawWindowShafts(ctx: CanvasRenderingContext2D, state: GameState) {
  const t = Date.now() * 0.0004;
  for (const plat of state.platforms) {
    if (!plat.isWindow) continue;
    const isLeft = plat.x < state.worldW / 2;

    // Moonlight shaft streaming through the window
    const shaftX = isLeft ? plat.x + plat.w : 30;
    const shaftW = isLeft ? state.worldW - plat.x - plat.w - 30 : plat.x - 30;
    const shaftH = 180 + Math.sin(t + plat.y * 0.01) * 10;

    ctx.save();
    ctx.globalAlpha = 0.045 + 0.012 * Math.sin(t * 1.3 + plat.y * 0.005);
    const shaftG = ctx.createLinearGradient(shaftX, plat.y, shaftX, plat.y + shaftH);
    shaftG.addColorStop(0, '#c0d8ff');
    shaftG.addColorStop(1, 'rgba(192,216,255,0)');
    ctx.fillStyle = shaftG;
    ctx.fillRect(shaftX, plat.y, shaftW, shaftH);

    // Bright window sill edge
    ctx.globalAlpha = 0.35 + 0.1 * Math.sin(t + plat.y * 0.01);
    ctx.fillStyle = '#d0e8ff';
    ctx.fillRect(plat.x, plat.y, plat.w, 2);
    ctx.restore();
  }
}

// ─────────────────────────────────────────────
// ATMOSPHERE
// ─────────────────────────────────────────────
function drawAtmosphere(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number, camX: number = 0) {
  // Floating dust motes
  const t = Date.now() * 0.0005;
  for (const d of DUST) {
    const x = (d.x + Math.sin(t + d.phase) * 12) % W;
    const y = d.y + Math.sin(t * 0.7 + d.phase) * 8;
    const alpha = 0.05 + 0.08 * Math.abs(Math.sin(t + d.phase));

    // Only show motes near light
    for (const light of state.lights) {
      const dx = x - light.pos.x;
      const dy = y - light.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < light.radius * 0.7) {
        const fade = 1 - dist / (light.radius * 0.7);
        ctx.fillStyle = `rgba(255,220,150,${alpha * fade * 0.8})`;
        ctx.beginPath();
        ctx.arc(x, y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

// ─────────────────────────────────────────────
// LIGHT HALOS
// ─────────────────────────────────────────────
function drawLightHalos(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number) {
  for (const light of state.lights) {
    const flicker = light.id === 'candle1' ? 0.04 * Math.sin(Date.now() * 0.007) : 0;
    const r = light.radius * (1 + flicker);

    // Outer ambient
    const outer = ctx.createRadialGradient(light.pos.x, light.pos.y, 0, light.pos.x, light.pos.y, r);
    if (light.id === 'moon') {
      outer.addColorStop(0, `rgba(176,200,255,${0.06 + flicker})`);
      outer.addColorStop(0.5, `rgba(140,170,220,0.03)`);
      outer.addColorStop(1, 'rgba(100,130,180,0)');
    } else {
      outer.addColorStop(0, `rgba(255,210,80,${0.25 + flicker})`);
      outer.addColorStop(0.3, `rgba(255,150,30,${0.12 + flicker})`);
      outer.addColorStop(0.7, `rgba(200,80,20,0.04)`);
      outer.addColorStop(1, 'rgba(150,40,0,0)');
    }
    ctx.fillStyle = outer;
    ctx.beginPath();
    ctx.arc(light.pos.x, light.pos.y, r, 0, Math.PI * 2);
    ctx.fill();

    // Inner bright core (candle only)
    if (light.id !== 'moon') {
      const inner = ctx.createRadialGradient(light.pos.x, light.pos.y, 0, light.pos.x, light.pos.y, 40);
      inner.addColorStop(0, `rgba(255,255,200,${0.5 + flicker})`);
      inner.addColorStop(1, 'rgba(255,200,50,0)');
      ctx.fillStyle = inner;
      ctx.beginPath();
      ctx.arc(light.pos.x, light.pos.y, 40, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ─────────────────────────────────────────────
// SHADOW PLATFORMS
// ─────────────────────────────────────────────
function drawShadowPlatforms(ctx: CanvasRenderingContext2D, state: GameState) {
  const sway = state.shadowCrystallized ? 0 : Math.sin(state.shadowSway) * 3;
  const tone = state.currentTone;

  for (const sp of state.shadowPlatforms) {
    const alpha = sp.opacity || 0.85;
    const sx = sp.x + sway;

    ctx.save();

    // Soft glow under shadow
    if (tone) {
      const glowColor = TONE_COLORS[tone] || '#8888ff';
      ctx.save();
      ctx.filter = 'blur(8px)';
      ctx.fillStyle = glowColor + '22';
      ctx.fillRect(sx - 6, sp.y - 4, sp.w + 12, sp.h + 8);
      ctx.restore();
    }

    // Main shadow body — inklike gradient
    const g = ctx.createLinearGradient(sx, sp.y, sx, sp.y + sp.h);
    g.addColorStop(0, `rgba(5,5,18,${alpha})`);
    g.addColorStop(0.5, `rgba(12,12,30,${alpha * 0.9})`);
    g.addColorStop(1, `rgba(20,20,50,${alpha * 0.6})`);
    ctx.fillStyle = g;

    ctx.beginPath();
    ctx.roundRect(sx, sp.y, sp.w, sp.h, 4);
    ctx.fill();

    // Top edge shimmer
    if (tone || state.silenceActive) {
      const edgeColor = state.silenceActive ? 'rgba(200,220,255,0.35)'
        : tone === 'low' ? 'rgba(198,134,66,0.4)'
        : tone === 'high' ? 'rgba(135,206,235,0.4)'
        : 'rgba(221,160,221,0.35)';

      ctx.strokeStyle = edgeColor;
      ctx.lineWidth = state.shadowCrystallized ? 2 : 1.2;
      ctx.beginPath();
      ctx.moveTo(sx + 4, sp.y + 1);
      ctx.lineTo(sx + sp.w - 4, sp.y + 1);
      ctx.stroke();
    }

    // Crystallized sparkles
    if (state.shadowCrystallized && Math.random() < 0.05) {
      ctx.fillStyle = 'rgba(200,230,255,0.6)';
      ctx.beginPath();
      ctx.arc(sx + Math.random() * sp.w, sp.y + Math.random() * sp.h, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

// ─────────────────────────────────────────────
// STATIC PLATFORMS
// ─────────────────────────────────────────────
function drawPlatforms(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const plat of state.platforms) {
    if (plat.y >= 520) {
      drawGround(ctx, plat.x, plat.y, plat.w, plat.h);
    } else {
      drawLedge(ctx, plat.x, plat.y, plat.w, plat.h);
    }
  }
}

function drawGround(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Main ground
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, '#1a1a2a');
  g.addColorStop(0.15, '#131320');
  g.addColorStop(1, '#080812');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);

  // Surface rim glow
  ctx.save();
  ctx.filter = 'blur(2px)';
  const rimG = ctx.createLinearGradient(x, y, x + w, y);
  rimG.addColorStop(0, 'rgba(80,80,140,0)');
  rimG.addColorStop(0.3, 'rgba(80,80,160,0.15)');
  rimG.addColorStop(0.7, 'rgba(80,80,160,0.15)');
  rimG.addColorStop(1, 'rgba(80,80,140,0)');
  ctx.fillStyle = rimG;
  ctx.fillRect(x, y, w, 3);
  ctx.restore();

  // Subtle texture lines
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let tx = 0; tx < w; tx += 40) {
    ctx.beginPath();
    ctx.moveTo(x + tx, y);
    ctx.lineTo(x + tx, y + h);
    ctx.stroke();
  }
}

function drawLedge(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Stone ledge
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, '#2e2e48');
  g.addColorStop(0.4, '#1e1e32');
  g.addColorStop(1, '#14142a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 3);
  ctx.fill();

  // Top highlight
  ctx.strokeStyle = 'rgba(120,120,200,0.25)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + 3, y + 1);
  ctx.lineTo(x + w - 3, y + 1);
  ctx.stroke();

  // Bottom shadow
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 2, y + h - 1);
  ctx.lineTo(x + w - 2, y + h - 1);
  ctx.stroke();
}

// ─────────────────────────────────────────────
// GOAL STAR
// ─────────────────────────────────────────────
function drawGoal(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const t = Date.now() * 0.002;
  const pulse = 1 + 0.12 * Math.sin(t * 2.5);
  const rot = t * 0.4;

  ctx.save();
  ctx.translate(x, y);

  // Layered glow
  for (let i = 3; i >= 1; i--) {
    ctx.save();
    ctx.filter = `blur(${i * 5}px)`;
    ctx.fillStyle = `rgba(255,220,80,${0.15 / i})`;
    ctx.beginPath();
    ctx.arc(0, 0, 28 * pulse * i * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Rotating rays
  ctx.save();
  ctx.rotate(rot);
  for (let i = 0; i < 8; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI * 2) / 8);
    const rayG = ctx.createLinearGradient(0, 0, 0, -30 * pulse);
    rayG.addColorStop(0, 'rgba(255,220,80,0.6)');
    rayG.addColorStop(1, 'rgba(255,220,80,0)');
    ctx.fillStyle = rayG;
    ctx.beginPath();
    ctx.moveTo(-1.5, 0);
    ctx.lineTo(1.5, 0);
    ctx.lineTo(0, -30 * pulse);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // Star body
  drawStar(ctx, 0, 0, 5, 12 * pulse, 5 * pulse, '#ffd700');
  // Inner highlight
  drawStar(ctx, 0, 0, 5, 7 * pulse, 3 * pulse, '#fff8d0');

  ctx.restore();
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerR: number, innerR: number, color: string) {
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerR);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
    rot += step;
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

// ─────────────────────────────────────────────
// CANDLE
// ─────────────────────────────────────────────
function drawCandle(ctx: CanvasRenderingContext2D, x: number, y: number, held: boolean, state: GameState) {
  const t = Date.now() * 0.008;
  const flickerX = Math.sin(t * 1.7) * 1.5;
  const flickerY = Math.cos(t * 2.3) * 1;
  const flameH = 14 + Math.sin(t) * 3;

  ctx.save();
  ctx.translate(x, y);

  // Candle wax body
  const waxG = ctx.createLinearGradient(-5, -14, 5, 12);
  waxG.addColorStop(0, '#f0e4c0');
  waxG.addColorStop(0.5, '#e0d0a0');
  waxG.addColorStop(1, '#c8b878');
  ctx.fillStyle = waxG;
  ctx.beginPath();
  ctx.roundRect(-5, -14, 10, 22, 2);
  ctx.fill();

  // Wax highlight
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.roundRect(-4, -12, 3, 16, 1);
  ctx.fill();

  // Melted wax drips
  ctx.fillStyle = 'rgba(230,210,150,0.7)';
  ctx.beginPath();
  ctx.ellipse(-2, -12, 2, 3, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Wick
  ctx.strokeStyle = '#3a2a10';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(flickerX * 0.3, -20);
  ctx.stroke();

  // Flame layers
  const flameColors = [
    { r: flameH * 0.4, col: 'rgba(255,255,220,', alpha: 0.9 },
    { r: flameH * 0.7, col: 'rgba(255,180,30,', alpha: 0.7 },
    { r: flameH, col: 'rgba(255,80,10,', alpha: 0.4 },
    { r: flameH * 1.3, col: 'rgba(180,40,0,', alpha: 0.15 },
  ];

  for (const fl of flameColors) {
    const fg = ctx.createRadialGradient(flickerX, -20 + flickerY, 0, flickerX, -20 + flickerY, fl.r);
    fg.addColorStop(0, fl.col + fl.alpha + ')');
    fg.addColorStop(1, fl.col + '0)');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.ellipse(flickerX, -20 + flickerY, fl.r * 0.5, fl.r, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // [E] hint above
  if (!held) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('[E]', 0, -38);

    // small diamond
    ctx.fillStyle = 'rgba(255,220,100,0.4)';
    ctx.beginPath();
    ctx.moveTo(0, -32); ctx.lineTo(3, -29); ctx.lineTo(0, -26); ctx.lineTo(-3, -29);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

// ─────────────────────────────────────────────
// RIPPLES
// ─────────────────────────────────────────────
function drawRipples(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const r of state.noteRipples) {
    const alpha = (r.life / 30) * 0.5;
    ctx.save();
    ctx.filter = 'blur(1px)';
    ctx.strokeStyle = r.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
    ctx.stroke();

    // Inner ripple
    if (r.r > 20) {
      ctx.strokeStyle = r.color + Math.floor(alpha * 0.4 * 255).toString(16).padStart(2, '0');
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r * 0.6, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ─────────────────────────────────────────────
// PARTICLES
// ─────────────────────────────────────────────
function drawParticles(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const pt of state.particles) {
    const alpha = pt.life / pt.maxLife;
    ctx.save();
    ctx.filter = `blur(${1 - alpha}px)`;
    const pg = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, pt.size * alpha * 2);
    pg.addColorStop(0, pt.color + Math.floor(alpha * 255).toString(16).padStart(2, '0'));
    pg.addColorStop(1, pt.color + '00');
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size * alpha * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ─────────────────────────────────────────────
// PLAYER — spirit form
// ─────────────────────────────────────────────
function drawPlayer(ctx: CanvasRenderingContext2D, state: GameState) {
  const { pos, facing, glowPulse } = state.player;
  const tone = state.currentTone;
  const x = pos.x;
  const y = pos.y;
  const t = Date.now() * 0.003;

  let glowCol: [number, number, number] = [160, 200, 255];
  if (tone === 'low') glowCol = [198, 134, 66];
  else if (tone === 'high') glowCol = [135, 206, 235];
  else if (tone === 'whisper') glowCol = [221, 160, 221];
  else if (state.silenceActive) glowCol = [240, 240, 255];

  const [gr, gg, gb] = glowCol;
  const pulse = Math.sin(glowPulse);
  const coreR = 7 + 1.5 * pulse;

  // ── Far outer nebula glow ──
  ctx.save();
  ctx.filter = 'blur(18px)';
  const nebulaG = ctx.createRadialGradient(x, y - PLAYER_H * 0.55, 0, x, y - PLAYER_H * 0.55, 50);
  nebulaG.addColorStop(0, `rgba(${gr},${gg},${gb},0.35)`);
  nebulaG.addColorStop(0.5, `rgba(${gr},${gg},${gb},0.1)`);
  nebulaG.addColorStop(1, `rgba(${gr},${gg},${gb},0)`);
  ctx.fillStyle = nebulaG;
  ctx.beginPath();
  ctx.arc(x, y - PLAYER_H * 0.55, 50, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(x, y);

  // ── Ground mist beneath spirit ──
  ctx.save();
  ctx.filter = 'blur(6px)';
  const mistG = ctx.createRadialGradient(0, 0, 0, 0, 0, 14);
  mistG.addColorStop(0, `rgba(${gr},${gg},${gb},0.18)`);
  mistG.addColorStop(1, `rgba(${gr},${gg},${gb},0)`);
  ctx.fillStyle = mistG;
  ctx.beginPath();
  ctx.ellipse(0, -1, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ── Wispy tendrils (bottom trails) ──
  ctx.save();
  ctx.globalAlpha = 0.55;
  const tendrilCount = 5;
  for (let i = 0; i < tendrilCount; i++) {
    const phase = (i / tendrilCount) * Math.PI * 2;
    const sway = Math.sin(t * 1.4 + phase) * 4 * facing;
    const tw = 2.5 - i * 0.3;
    const th = 10 + i * 3;
    const tx0 = (i - 2) * 4;

    const tg = ctx.createLinearGradient(tx0, -PLAYER_H * 0.25, tx0 + sway, 2);
    tg.addColorStop(0, `rgba(${gr},${gg},${gb},0.5)`);
    tg.addColorStop(1, `rgba(${gr},${gg},${gb},0)`);
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.moveTo(tx0 - tw, -PLAYER_H * 0.25);
    ctx.quadraticCurveTo(tx0 + sway * 0.5, -PLAYER_H * 0.1, tx0 + sway - tw * 0.5, 2);
    ctx.quadraticCurveTo(tx0 + sway + tw * 0.5, -PLAYER_H * 0.1, tx0 + tw, -PLAYER_H * 0.25);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // ── Translucent spirit body (teardrop shape) ──
  ctx.save();
  const bodyG = ctx.createRadialGradient(0, -PLAYER_H * 0.45, 2, 0, -PLAYER_H * 0.45, PLAYER_H * 0.55);
  bodyG.addColorStop(0, `rgba(${gr},${gg},${gb},0.55)`);
  bodyG.addColorStop(0.45, `rgba(${gr},${gg},${gb},0.2)`);
  bodyG.addColorStop(1, `rgba(${gr},${gg},${gb},0)`);
  ctx.fillStyle = bodyG;
  ctx.beginPath();
  // Teardrop: narrow at bottom, wider at top
  ctx.moveTo(0, -2);
  ctx.bezierCurveTo(-9, -PLAYER_H * 0.3, -10, -PLAYER_H * 0.6, -5, -PLAYER_H * 0.85);
  ctx.bezierCurveTo(-2, -PLAYER_H * 0.98, 2, -PLAYER_H * 0.98, 5, -PLAYER_H * 0.85);
  ctx.bezierCurveTo(10, -PLAYER_H * 0.6, 9, -PLAYER_H * 0.3, 0, -2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // ── Inner shimmer line (vertical energy) ──
  ctx.save();
  ctx.globalAlpha = 0.3 + 0.2 * pulse;
  const shimG = ctx.createLinearGradient(0, -PLAYER_H * 0.85, 0, -PLAYER_H * 0.2);
  shimG.addColorStop(0, `rgba(255,255,255,0)`);
  shimG.addColorStop(0.4, `rgba(255,255,255,0.8)`);
  shimG.addColorStop(1, `rgba(255,255,255,0)`);
  ctx.strokeStyle = shimG;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-1, -PLAYER_H * 0.85);
  ctx.lineTo(-1, -PLAYER_H * 0.2);
  ctx.stroke();
  ctx.restore();

  // ── Core orb (soul center) ──
  const coreY = -PLAYER_H * 0.72;
  ctx.save();
  ctx.filter = `blur(${2 + pulse}px)`;
  const coreGlowG = ctx.createRadialGradient(0, coreY, 0, 0, coreY, coreR * 2.8);
  coreGlowG.addColorStop(0, `rgba(${gr},${gg},${gb},0.7)`);
  coreGlowG.addColorStop(1, `rgba(${gr},${gg},${gb},0)`);
  ctx.fillStyle = coreGlowG;
  ctx.beginPath();
  ctx.arc(0, coreY, coreR * 2.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Solid orb center
  const orbG = ctx.createRadialGradient(-coreR * 0.3, coreY - coreR * 0.3, 0, 0, coreY, coreR);
  orbG.addColorStop(0, 'rgba(255,255,255,0.95)');
  orbG.addColorStop(0.4, `rgba(${gr},${gg},${gb},0.9)`);
  orbG.addColorStop(1, `rgba(${Math.floor(gr*0.6)},${Math.floor(gg*0.6)},${Math.floor(gb*0.6)},0.7)`);
  ctx.fillStyle = orbG;
  ctx.beginPath();
  ctx.arc(0, coreY, coreR, 0, Math.PI * 2);
  ctx.fill();

  // Orb specular highlight
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.arc(-coreR * 0.3, coreY - coreR * 0.35, coreR * 0.3, 0, Math.PI * 2);
  ctx.fill();

  // ── Spirit eyes — two soft glowing wisps ──
  const eyeY = coreY + 1;
  const eyeSpread = 3.2;
  ctx.save();
  ctx.filter = 'blur(1px)';
  for (const ex of [-eyeSpread, eyeSpread]) {
    const eyeG = ctx.createRadialGradient(ex, eyeY, 0, ex, eyeY, 2.8);
    eyeG.addColorStop(0, 'rgba(255,255,255,1)');
    eyeG.addColorStop(0.5, `rgba(${gr},${gg},${gb},0.8)`);
    eyeG.addColorStop(1, `rgba(${gr},${gg},${gb},0)`);
    ctx.fillStyle = eyeG;
    ctx.beginPath();
    ctx.arc(ex, eyeY, 2.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // ── Orbiting spirit particles ──
  const orbitCount = 3;
  for (let i = 0; i < orbitCount; i++) {
    const angle = t * 1.8 + (i / orbitCount) * Math.PI * 2;
    const orbitR = 11 + 2 * Math.sin(t + i);
    const ox = Math.cos(angle) * orbitR;
    const oy = Math.sin(angle) * orbitR * 0.45 + coreY;
    const ps = 1.2 + 0.6 * Math.sin(t * 2 + i);

    ctx.save();
    ctx.filter = 'blur(1.5px)';
    const pg = ctx.createRadialGradient(ox, oy, 0, ox, oy, ps * 2.5);
    pg.addColorStop(0, `rgba(255,255,255,0.9)`);
    pg.addColorStop(1, `rgba(${gr},${gg},${gb},0)`);
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.arc(ox, oy, ps * 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Singing note
  if (tone) {
    const noteY = -PLAYER_H - 12 + Math.sin(t * 2) * 5;
    const nc = TONE_COLORS[tone];

    ctx.save();
    ctx.filter = 'blur(2px)';
    ctx.fillStyle = nc + '66';
    ctx.font = '16px serif';
    ctx.textAlign = 'center';
    ctx.fillText('♪', 0, noteY);
    ctx.restore();

    ctx.fillStyle = nc;
    ctx.font = 'bold 13px serif';
    ctx.textAlign = 'center';
    ctx.fillText('♪', 0, noteY);

    // Second note offset
    ctx.fillStyle = nc + '88';
    ctx.font = '10px serif';
    ctx.fillText('♫', 10, noteY - 8 + Math.sin(t * 2 + 1) * 3);
  }

  if (state.silenceActive) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('◼', 0, -PLAYER_H - 14 + Math.sin(t * 2) * 3);
  }

  ctx.restore();
}

// ─────────────────────────────────────────────
// FOG
// ─────────────────────────────────────────────
function drawFog(ctx: CanvasRenderingContext2D, W: number, H: number, state: GameState) {
  const t = Date.now() * 0.0003;

  // Ground mist
  const mistG = ctx.createLinearGradient(0, 490, 0, H);
  mistG.addColorStop(0, 'rgba(15,15,35,0)');
  mistG.addColorStop(0.4, 'rgba(15,15,35,0.15)');
  mistG.addColorStop(1, 'rgba(10,10,25,0.4)');
  ctx.fillStyle = mistG;
  ctx.fillRect(0, 490, W, H - 490);

  // Subtle top vignette
  const topG = ctx.createLinearGradient(0, 0, 0, 80);
  topG.addColorStop(0, 'rgba(4,4,15,0.5)');
  topG.addColorStop(1, 'rgba(4,4,15,0)');
  ctx.fillStyle = topG;
  ctx.fillRect(0, 0, W, 80);

  // Edge vignette
  const edgeL = ctx.createLinearGradient(0, 0, 60, 0);
  edgeL.addColorStop(0, 'rgba(4,4,15,0.5)');
  edgeL.addColorStop(1, 'rgba(4,4,15,0)');
  ctx.fillStyle = edgeL;
  ctx.fillRect(0, 0, 60, H);

  const edgeR = ctx.createLinearGradient(W - 60, 0, W, 0);
  edgeR.addColorStop(0, 'rgba(4,4,15,0)');
  edgeR.addColorStop(1, 'rgba(4,4,15,0.5)');
  ctx.fillStyle = edgeR;
  ctx.fillRect(W - 60, 0, 60, H);
}

// ─────────────────────────────────────────────
// UI
// ─────────────────────────────────────────────
function drawUI(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number) {
  const hudY = H - 68;

  const tones = [
    { key: 'Z', tone: 'low', label: 'Low Hum', color: '#c68642', icon: '♩' },
    { key: 'X', tone: 'high', label: 'High Note', color: '#87ceeb', icon: '♪' },
    { key: 'C', tone: 'whisper', label: 'Whisper', color: '#dda0dd', icon: '♫' },
    { key: 'Space', tone: 'silence', label: 'Silence', color: '#c8d8f8', icon: '◼' },
  ];

  tones.forEach((t, i) => {
    const bx = 16 + i * 102;
    const by = hudY;
    const active = t.tone === 'silence' ? state.silenceActive : state.currentTone === t.tone;

    // BG blur layer
    ctx.save();
    ctx.filter = 'blur(6px)';
    ctx.fillStyle = active ? t.color + '20' : 'rgba(5,5,20,0.8)';
    ctx.beginPath();
    ctx.roundRect(bx, by, 94, 56, 10);
    ctx.fill();
    ctx.restore();

    // BG solid
    ctx.fillStyle = active ? t.color + '18' : 'rgba(8,8,22,0.85)';
    ctx.beginPath();
    ctx.roundRect(bx, by, 94, 56, 10);
    ctx.fill();

    // Border
    ctx.strokeStyle = active ? t.color + 'cc' : 'rgba(255,255,255,0.1)';
    ctx.lineWidth = active ? 1.5 : 1;
    ctx.stroke();

    // Icon
    ctx.fillStyle = active ? t.color : 'rgba(255,255,255,0.3)';
    ctx.font = `${active ? 'bold ' : ''}16px serif`;
    ctx.textAlign = 'left';
    ctx.fillText(t.icon, bx + 10, by + 22);

    // Key
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = active ? t.color : 'rgba(255,255,255,0.4)';
    ctx.fillText(`[${t.key}]`, bx + 32, by + 20);

    // Label
    ctx.font = '9px sans-serif';
    ctx.fillStyle = active ? t.color + 'cc' : 'rgba(255,255,255,0.3)';
    ctx.fillText(t.label, bx + 32, by + 34);

    // Active pulse line
    if (active) {
      const pw = (94 - 16) * (0.5 + 0.5 * Math.sin(Date.now() * 0.01));
      const g = ctx.createLinearGradient(bx + 8, 0, bx + 8 + pw, 0);
      g.addColorStop(0, t.color);
      g.addColorStop(1, t.color + '00');
      ctx.fillStyle = g;
      ctx.fillRect(bx + 8, by + 44, pw, 2);
    }
  });

  // Controls hint
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.font = '10px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('← → Move  ↑ Jump  [E] Grab candle', 430, hudY + 22);

  // Level label
  ctx.save();
  ctx.filter = 'blur(6px)';
  ctx.fillStyle = 'rgba(255,220,80,0.15)';
  ctx.fillRect(W - 210, 8, 200, 26);
  ctx.restore();
  ctx.fillStyle = 'rgba(200,180,100,0.6)';
  ctx.font = 'italic 12px serif';
  ctx.textAlign = 'right';
  const levelLabel = state.level === 2
    ? '✦ Level II · The Window Harp ✦'
    : '✦ Level I · The Candle Room ✦';
  ctx.fillText(levelLabel, W - 14, 26);

  // Progress bar
  const progress = state.level === 2
    ? Math.min(1, 1 - (state.player.pos.y / state.worldHeight))
    : Math.min(1, state.player.pos.x / state.worldW);
  const barW = W - 32;
  const barX = 16;
  const barY = H - 4;

  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, 3, 1.5);
  ctx.fill();

  const pBarG = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  pBarG.addColorStop(0, '#4060c0');
  pBarG.addColorStop(0.5, '#8090e0');
  pBarG.addColorStop(1, '#ffd700');
  ctx.fillStyle = pBarG;
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW * progress, 3, 1.5);
  ctx.fill();

  drawTutorial(ctx, state, W);
}

function drawTutorial(ctx: CanvasRenderingContext2D, state: GameState, W: number) {
  const messages: Record<number, string> = {
    0: '← → move through the darkness. Find the candle.',
    1: '↑ Jump to reach higher ledges.',
    2: 'Walk near the candle and press [E] to hold it.',
    3: 'Sing! Hold Z, X or C to cast shadow platforms.',
    4: 'Shadows become solid when you sing. Climb to the star!',
  };

  const msg = messages[state.tutorialStep];
  if (!msg || state.levelComplete) return;

  const cx = W / 2;

  ctx.save();
  ctx.filter = 'blur(8px)';
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.beginPath();
  ctx.roundRect(cx - 210, 12, 420, 38, 10);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.roundRect(cx - 210, 12, 420, 38, 10);
  ctx.fill();

  ctx.strokeStyle = 'rgba(150,180,255,0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = 'rgba(200,220,255,0.9)';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(msg, cx, 36);
}

function drawLevelComplete(ctx: CanvasRenderingContext2D, W: number, H: number) {
  // Dark overlay
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, W, H);

  const cx = W / 2;
  const cy = H / 2;

  // Radial glow
  ctx.save();
  ctx.filter = 'blur(30px)';
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 220);
  glow.addColorStop(0, 'rgba(255,220,80,0.3)');
  glow.addColorStop(1, 'rgba(255,180,40,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // Golden line
  const lineG = ctx.createLinearGradient(cx - 180, 0, cx + 180, 0);
  lineG.addColorStop(0, 'rgba(255,200,50,0)');
  lineG.addColorStop(0.5, 'rgba(255,200,50,0.6)');
  lineG.addColorStop(1, 'rgba(255,200,50,0)');
  ctx.fillStyle = lineG;
  ctx.fillRect(cx - 180, cy - 45, 360, 1);

  ctx.fillStyle = '#ffd700';
  ctx.font = 'italic bold 34px serif';
  ctx.textAlign = 'center';
  ctx.fillText('✦ The shadows remember ✦', cx, cy - 10);

  ctx.fillStyle = 'rgba(180,200,240,0.85)';
  ctx.font = 'italic 15px serif';
  ctx.fillText('"Light needs darkness. Music teaches it to sway."', cx, cy + 22);

  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = '11px monospace';
  ctx.fillText('— Level I: The Candle Room — complete —', cx, cy + 52);
}
