import { GameState, Keys, Tone, Platform, VIEW_W, VIEW_H } from './types';

const GRAVITY = 0.45;
const PLAYER_SPEED = 3.5;
const JUMP_FORCE = -10.5;
const PLAYER_W = 18;
const PLAYER_H = 28;

// ─── Level 1 ────────────────────────────────────────────────────────────────
const L1_GROUND_Y = 530;
const L1_WORLD_W  = 2600;
const L1_WORLD_H  = 600;

// ─── Level 2 ────────────────────────────────────────────────────────────────
const L2_GROUND_Y  = 1720;
const L2_WORLD_W   = 900;
const L2_WORLD_H   = 1800;

// ─────────────────────────────────────────────────────────────────────────────
function baseState(): Omit<
  GameState,
  'player'|'camera'|'lights'|'platforms'|'level'|'groundY'|'worldW'|'worldHeight'
> {
  return {
    shadowPlatforms: [],
    currentTone: null,
    silenceActive: false,
    toneTimer: 0,
    particles: [],
    levelComplete: false,
    noteRipples: [],
    tutorialStep: 0,
    goalReached: false,
    shadowSway: 0,
    shadowCrystallized: false,
    echoQueue: [],
    echoTone: null,
    echoTimer: 0,
  };
}

export function createInitialState(): GameState {
  const G = L1_GROUND_Y;
  return {
    ...baseState(),
    level: 1,
    groundY: G,
    worldW: L1_WORLD_W,
    worldHeight: L1_WORLD_H,
    player: {
      pos: { x: 120, y: G - 2 },
      vel: { x: 0, y: 0 },
      onGround: false,
      facing: 1,
      glowPulse: 0,
      holdingLight: null,
    },
    camera: { x: 0, y: 0 },
    lights: [
      { id: 'candle1', pos: { x: 320, y: G - 2 },   radius: 200, intensity: 1.0,  color: '#f9a825', held: false },
      { id: 'candle2', pos: { x: 1050, y: 350 },     radius: 210, intensity: 1.0,  color: '#f9a825', held: false },
      { id: 'candle3', pos: { x: 1860, y: 200 },     radius: 220, intensity: 1.05, color: '#ffc107', held: false },
      { id: 'moon',    pos: { x: 2000, y: -200 },    radius: 900, intensity: 0.35, color: '#b0c4de', held: false },
    ],
    platforms: [
      { x: 0, y: G, w: L1_WORLD_W, h: 80 },
      // Zone 1: Intro
      { x: 280, y: 440, w: 110, h: 14 },
      { x: 460, y: 360, w: 100, h: 14 },
      { x: 620, y: 440, w: 80,  h: 14 },
      { x: 760, y: 350, w: 100, h: 14 },
      // Zone 2: Mid
      { x: 950,  y: 370, w: 120, h: 14 },
      { x: 1120, y: 280, w: 100, h: 14 },
      { x: 1300, y: 360, w: 90,  h: 14 },
      { x: 1460, y: 260, w: 110, h: 14 },
      // Zone 3: High
      { x: 1640, y: 340, w: 90,  h: 14 },
      { x: 1800, y: 240, w: 120, h: 14 },
      { x: 1980, y: 160, w: 100, h: 14 },
      { x: 2160, y: 240, w: 90,  h: 14 },
      { x: 2330, y: 140, w: 110, h: 14 },
      // Goal
      { x: 2470, y: 80, w: 100, h: 14 },
    ],
  };
}

export function createLevel2State(): GameState {
  const G  = L2_GROUND_Y;
  const WW = L2_WORLD_W;
  return {
    ...baseState(),
    level: 2,
    groundY: G,
    worldW: WW,
    worldHeight: L2_WORLD_H,
    tutorialStep: 5, // skip tutorial — player knows controls
    player: {
      pos: { x: 200, y: G - 2 },
      vel: { x: 0, y: 0 },
      onGround: false,
      facing: 1,
      glowPulse: 0,
      holdingLight: null,
    },
    camera: { x: 0, y: L2_WORLD_H - VIEW_H },
    lights: [
      // Candle on the ground near start
      { id: 'candle1', pos: { x: 500, y: G - 2 }, radius: 200, intensity: 1.0, color: '#f9a825', held: false },
      // Candle mid-climb
      { id: 'candle2', pos: { x: 600, y: 745 },   radius: 210, intensity: 1.0, color: '#ffc107', held: false },
      // Moon — far top-left, creates strong diagonal light through windows
      { id: 'moon', pos: { x: -1200, y: -600 }, radius: 2200, intensity: 0.5, color: '#c0d8ff', held: false },
    ],
    platforms: [
      // Ground
      { x: 0, y: G, w: WW, h: 100 },
      // Left wall (solid)
      { x: 0, y: 0, w: 30, h: G },
      // Right wall (solid)
      { x: WW - 30, y: 0, w: 30, h: G },

      // ── Window sills (isWindow: true) ─────────────────────────
      // Left wall windows — cast ribs rightward
      { x: 30, y: 1540, w: 90, h: 12, isWindow: true },
      { x: 30, y: 1230, w: 90, h: 12, isWindow: true },
      { x: 30, y: 920,  w: 90, h: 12, isWindow: true },
      { x: 30, y: 610,  w: 90, h: 12, isWindow: true },
      { x: 30, y: 320,  w: 90, h: 12, isWindow: true },
      { x: 30, y: 140,  w: 90, h: 12, isWindow: true },
      // Right wall windows — cast ribs leftward
      { x: WW - 120, y: 1385, w: 90, h: 12, isWindow: true },
      { x: WW - 120, y: 1075, w: 90, h: 12, isWindow: true },
      { x: WW - 120, y: 765,  w: 90, h: 12, isWindow: true },
      { x: WW - 120, y: 465,  w: 90, h: 12, isWindow: true },
      { x: WW - 120, y: 230,  w: 90, h: 12, isWindow: true },

      // ── Climbing platforms (the path up) ──────────────────────
      { x: 200, y: 1610, w: 120, h: 14 },
      { x: 540, y: 1460, w: 120, h: 14 },
      { x: 240, y: 1310, w: 120, h: 14 },
      { x: 560, y: 1160, w: 120, h: 14 },
      { x: 240, y: 1010, w: 120, h: 14 },
      { x: 560, y: 860,  w: 120, h: 14 },
      { x: 240, y: 710,  w: 120, h: 14 },
      { x: 560, y: 560,  w: 120, h: 14 },
      { x: 240, y: 420,  w: 120, h: 14 },
      { x: 550, y: 290,  w: 120, h: 14 },
      { x: 240, y: 175,  w: 120, h: 14 },
      // Goal — top of the chamber
      { x: 380, y: 60,   w: 140, h: 14 },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
function rectOverlap(ax: number, ay: number, aw: number, ah: number,
                     bx: number, by: number, bw: number, bh: number) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function resolveCollision(state: GameState, platforms: Platform[]) {
  const p = state.player;
  for (const plat of platforms) {
    if (plat.isWindow) continue; // window sills handled as collision (they're ledges)
    if (rectOverlap(p.pos.x - PLAYER_W / 2, p.pos.y - PLAYER_H, PLAYER_W, PLAYER_H,
      plat.x, plat.y, plat.w, plat.h)) {
      const overlapLeft   = (p.pos.x - PLAYER_W / 2 + PLAYER_W) - plat.x;
      const overlapRight  = (plat.x + plat.w) - (p.pos.x - PLAYER_W / 2);
      const overlapTop    = (p.pos.y) - plat.y;
      const overlapBottom = (plat.y + plat.h) - (p.pos.y - PLAYER_H);
      const minH = Math.min(overlapLeft, overlapRight);
      const minV = Math.min(overlapTop, overlapBottom);
      if (minV < minH) {
        if (overlapTop < overlapBottom) {
          p.pos.y = plat.y;
          if (p.vel.y > 0) p.vel.y = 0;
          p.onGround = true;
        } else {
          p.pos.y = plat.y + plat.h + PLAYER_H;
          if (p.vel.y < 0) p.vel.y = 0;
        }
      } else {
        if (overlapLeft < overlapRight) {
          p.pos.x = plat.x - PLAYER_W / 2;
        } else {
          p.pos.x = plat.x + plat.w + PLAYER_W / 2;
        }
      }
    }
  }
}

// ─── Shadow Casting: Level 1 ─────────────────────────────────────────────────
function castLevel1Shadows(state: GameState): Platform[] {
  const shadowPlats: Platform[] = [];
  const tone = state.currentTone;
  const G = state.groundY;

  if (tone === null && !state.silenceActive) return shadowPlats;

  const sway = Math.sin(state.shadowSway) * (state.shadowCrystallized ? 0 : 6);

  for (const light of state.lights) {
    if (light.id === 'moon') continue;
    const lightX = light.pos.x;
    const lightY = light.pos.y;

    for (const plat of state.platforms) {
      if (plat.y >= G) continue;
      if (plat.isWindow) continue;

      const dyL = plat.y - lightY;
      if (Math.abs(dyL) < 1) continue;

      const scaleL = (G - lightY) / dyL;
      const shadowL = lightX + (plat.x - lightX) * scaleL + sway;
      const shadowR = lightX + (plat.x + plat.w - lightX) * scaleL + sway;

      const sw = Math.abs(shadowR - shadowL);
      const sx = Math.min(shadowL, shadowR);
      if (sw < 5) continue;

      let shadowH = 14;
      let shadowYOffset = 0;
      let opacity = 0.85;

      if (state.silenceActive)       { shadowH = 20; opacity = 1.0; }
      else if (tone === 'low')       { shadowH = 24; opacity = 0.95; }
      else if (tone === 'high')      { shadowH = 12; shadowYOffset = -55; opacity = 0.8; }
      else if (tone === 'whisper')   { shadowH = 9;  opacity = 0.65; }

      shadowPlats.push({
        x: sx,
        y: G - shadowH + shadowYOffset,
        w: sw,
        h: shadowH,
        isShadow: true,
        opacity,
      });
    }
  }
  return shadowPlats;
}

// ─── Shadow Casting: Level 2 — Window Harp ───────────────────────────────────
function castLevel2Shadows(state: GameState): Platform[] {
  const ribs: Platform[] = [];
  const tone      = state.currentTone;
  const silence   = state.silenceActive;
  const echoTone  = state.echoTone;
  const activeTone: Tone | 'silence' | null = silence ? 'silence' : (tone ?? null);

  if (!activeTone && !echoTone) return ribs;

  const makeRib = (
    plat: Platform,
    useTone: Tone | 'silence',
    isEcho: boolean,
  ): Platform | null => {
    if (!useTone) return null;
    let shadowH = 12;
    let yOff    = 0;
    let opacity = isEcho ? 0.45 : 0.88;

    if (useTone === 'silence')    { shadowH = 22; opacity = isEcho ? 0.45 : 1.0; }
    else if (useTone === 'low')   { shadowH = 26; opacity = isEcho ? 0.45 : 0.95; }
    else if (useTone === 'high')  { shadowH = 11; yOff = -52; opacity = isEcho ? 0.4 : 0.82; }
    else if (useTone === 'whisper') { shadowH = 9; opacity = isEcho ? 0.28 : 0.65; }

    const isLeft = plat.x < state.worldW / 2;
    const ribX   = isLeft ? plat.x + plat.w : 30;
    const ribW   = isLeft
      ? state.worldW - plat.x - plat.w - 30
      : plat.x - 30;

    if (ribW < 30) return null;
    return { x: ribX, y: plat.y + yOff, w: ribW, h: shadowH, isShadow: true, opacity };
  };

  for (const plat of state.platforms) {
    if (!plat.isWindow) continue;
    if (activeTone) {
      const r = makeRib(plat, activeTone, false);
      if (r) ribs.push(r);
    }
    // Echo tone adds ghost ribs
    if (echoTone && echoTone !== activeTone) {
      const r = makeRib(plat, echoTone, true);
      if (r) ribs.push(r);
    }
  }
  return ribs;
}

export function castShadowPlatforms(state: GameState): void {
  if (state.level === 2) {
    state.shadowPlatforms = castLevel2Shadows(state);
    return;
  }
  state.shadowPlatforms = castLevel1Shadows(state);
}

// ─────────────────────────────────────────────────────────────────────────────
function spawnParticle(state: GameState, x: number, y: number, color: string) {
  state.particles.push({
    x, y,
    vx: (Math.random() - 0.5) * 2,
    vy: -Math.random() * 2,
    life: 40, maxLife: 40,
    color, size: 2 + Math.random() * 3,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
export function updateGame(state: GameState, keys: Keys, dt: number): GameState {
  const s = { ...state };
  const p = s.player;

  // ── Tone input ──────────────────────────────────────────────────────────────
  let newTone: Tone = null;
  if (keys.z) newTone = 'low';
  else if (keys.x) newTone = 'high';
  else if (keys.c) newTone = 'whisper';

  const wasSilent = s.silenceActive;
  s.silenceActive = keys.space;

  if (newTone !== s.currentTone || s.silenceActive !== wasSilent) {
    // Enqueue echo when player starts a new tone
    if (newTone && newTone !== s.currentTone) {
      s.echoQueue = [...s.echoQueue, { tone: newTone, delay: 90 }];
    }
    s.currentTone = newTone;
    s.shadowCrystallized = s.silenceActive;

    if (newTone || s.silenceActive) {
      const colors: Record<string, string> = {
        low: '#c68642', high: '#87ceeb', whisper: '#dda0dd', silence: '#ffffff',
      };
      const key = s.silenceActive ? 'silence' : newTone!;
      s.noteRipples.push({ x: p.pos.x, y: p.pos.y - 14, r: 5, maxR: 90, color: colors[key], life: 32 });
    }
  }

  // ── Echo system ─────────────────────────────────────────────────────────────
  const firedEchoes: Array<{ tone: Tone; delay: number }> = [];
  s.echoQueue = s.echoQueue
    .map(e => ({ ...e, delay: e.delay - 1 }))
    .filter(e => { if (e.delay <= 0) { firedEchoes.push(e); return false; } return true; });

  for (const echo of firedEchoes) {
    if (echo.tone) {
      const echoColors: Record<string, string> = {
        low: '#c68642', high: '#87ceeb', whisper: '#dda0dd', silence: '#ffffff',
      };
      // Echo ripple is slightly larger radius & shorter life to distinguish
      s.noteRipples.push({
        x: p.pos.x, y: p.pos.y - 20,
        r: 12, maxR: 60,
        color: echoColors[echo.tone as string] || '#ffffff',
        life: 20,
      });
      s.echoTone  = echo.tone;
      s.echoTimer = 35;
    }
  }

  if (s.echoTimer > 0) {
    s.echoTimer--;
    if (s.echoTimer === 0) s.echoTone = null;
  }

  // ── Shadow sway ─────────────────────────────────────────────────────────────
  if (!s.shadowCrystallized && (s.currentTone || s.silenceActive)) {
    s.shadowSway += 0.04;
  }

  castShadowPlatforms(s);

  // ── Physics ─────────────────────────────────────────────────────────────────
  p.vel.y += GRAVITY;

  let moveX = 0;
  if (keys.left)  { moveX = -1; p.facing = -1; }
  if (keys.right) { moveX =  1; p.facing =  1; }
  p.vel.x = moveX * PLAYER_SPEED;

  if (keys.up && p.onGround) { p.vel.y = JUMP_FORCE; p.onGround = false; }

  p.pos.x += p.vel.x;
  p.pos.y += p.vel.y;

  // World bounds
  p.pos.x = Math.max(PLAYER_W / 2, Math.min(s.worldW - PLAYER_W / 2, p.pos.x));

  p.onGround = false;
  resolveCollision(s, s.platforms);
  resolveCollision(s, s.shadowPlatforms);

  // Respawn if fallen below world
  if (p.pos.y > s.groundY + 200) {
    p.pos.y = s.groundY - 2;
    p.vel.y = 0;
  }

  // ── Pick up / drop light ─────────────────────────────────────────────────────
  if (keys.e) {
    if (p.holdingLight === null) {
      for (const light of s.lights) {
        if (light.id === 'moon') continue;
        const dx = light.pos.x - p.pos.x;
        const dy = light.pos.y - (p.pos.y - 14);
        if (Math.sqrt(dx * dx + dy * dy) < 55) {
          p.holdingLight = light.id;
          light.held = true;
          break;
        }
      }
    } else {
      for (const light of s.lights) {
        if (light.id === p.holdingLight) light.held = false;
      }
      p.holdingLight = null;
    }
  }

  for (const light of s.lights) {
    if (light.held && p.holdingLight === light.id) {
      light.pos.x = p.pos.x + p.facing * 22;
      light.pos.y = p.pos.y - 22;
    }
  }

  // ── Particles ───────────────────────────────────────────────────────────────
  if ((s.currentTone || s.silenceActive) && Math.random() < 0.3) {
    const c = s.currentTone === 'low'     ? '#c68642'
            : s.currentTone === 'high'    ? '#87ceeb'
            : s.currentTone === 'whisper' ? '#dda0dd' : '#ffffff';
    spawnParticle(s, p.pos.x + (Math.random() - 0.5) * 20, p.pos.y - 10, c);
  }

  s.particles = s.particles.filter(pt => pt.life > 0).map(pt => ({
    ...pt, x: pt.x + pt.vx, y: pt.y + pt.vy, life: pt.life - 1,
  }));

  s.noteRipples = s.noteRipples.filter(r => r.life > 0).map(r => ({
    ...r, r: r.r + (r.maxR - r.r) * 0.1, life: r.life - 1,
  }));

  p.glowPulse = (p.glowPulse + 0.05) % (Math.PI * 2);

  // ── Camera ─────────────────────────────────────────────────────────────────
  // Horizontal
  const targetCamX = p.pos.x - VIEW_W / 2;
  s.camera.x += (targetCamX - s.camera.x) * 0.1;
  s.camera.x = Math.max(0, Math.min(s.worldW - VIEW_W, s.camera.x));

  // Vertical (mainly for Level 2)
  const targetCamY = p.pos.y - VIEW_H * 0.62;
  s.camera.y += (targetCamY - s.camera.y) * 0.08;
  s.camera.y = Math.max(0, Math.min(s.worldHeight - VIEW_H, s.camera.y));

  // ── Tutorial ────────────────────────────────────────────────────────────────
  if (s.tutorialStep === 0 && (keys.left || keys.right)) s.tutorialStep = 1;
  if (s.tutorialStep === 1 && keys.up)                   s.tutorialStep = 2;
  if (s.tutorialStep === 2 && keys.e)                    s.tutorialStep = 3;
  if (s.tutorialStep === 3 && s.currentTone)             s.tutorialStep = 4;
  if (s.tutorialStep === 4 && s.shadowPlatforms.length > 0 && p.pos.y < s.groundY - 50) s.tutorialStep = 5;

  // ── Goal ────────────────────────────────────────────────────────────────────
  const goal = s.platforms[s.platforms.length - 1];
  if (
    p.pos.x > goal.x && p.pos.x < goal.x + goal.w &&
    Math.abs(p.pos.y - goal.y) < 30
  ) {
    s.goalReached   = true;
    s.levelComplete = true;
  }

  return s;
}
