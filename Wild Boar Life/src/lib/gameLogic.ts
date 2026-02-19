import {
  TILE_SIZE,
  WORLD_W,
  WORLD_H,
  BOAR_SPEED,
  HUNGER_RATE,
  THIRST_RATE,
  STAMINA_REGEN,
  SPRINT_DRAIN,
  MAX_STAT,
  type GameState,
  type FoodItem,
  type Hunter,
  type Particle,
  type Piglet,
} from "./gameTypes";

const CANVAS_W = 960;
const CANVAS_H = 600;
const DAY_DURATION = 90; // seconds per full day cycle
const HUNTER_SPAWN_INTERVAL = 45;
const HUNTER_DESPAWN_DIST = 600;
const EAT_RANGE = 40;
const WATER_RANGE = 48;
const PIGLET_SPAWN_DAY = 3; // day threshold to unlock piglets
const PIGLET_COUNT = 3;
const PIGLET_FOLLOW_SPEED = 130; // px/s
const PIGLET_FOLLOW_DIST = 60; // desired gap behind boar
const SCORE_MULTIPLIER_PER_PIGLET = 0.5; // +50% score per piglet

let pigletId = 0;

let particleId = 0;
let hunterId = 0;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

function addParticle(
  state: GameState,
  x: number,
  y: number,
  text: string,
  color: string
) {
  state.world.particles.push({
    id: `p_${particleId++}`,
    x,
    y,
    vx: (Math.random() - 0.5) * 40,
    vy: -60 - Math.random() * 40,
    life: 1.8,
    maxLife: 1.8,
    color,
    size: 14,
    text,
  });
}

export function updateGame(
  state: GameState,
  dt: number,
  keys: Set<string>
): GameState {
  if (state.phase !== "playing") return state;

  const s = structuredClone(state) as GameState;

  // ── Time ──────────────────────────────────────────────────────────────
  s.time.dayProgress += dt / DAY_DURATION;
  if (s.time.dayProgress >= 1) {
    s.time.dayProgress = 0;
    s.time.day++;
    s.stats.age = s.time.day;
    addParticle(s, s.boar.x, s.boar.y - 40, `Day ${s.time.day}!`, "#f5d67a");
  }
  s.time.isNight = s.time.dayProgress > 0.6 || s.time.dayProgress < 0.05;

  // ── Movement ──────────────────────────────────────────────────────────
  const sprinting =
    (keys.has("ShiftLeft") || keys.has("ShiftRight")) &&
    s.stats.stamina > 5;
  s.boar.sprinting = sprinting;
  const speed = sprinting ? BOAR_SPEED * 1.8 : BOAR_SPEED;

  let dx = 0,
    dy = 0;
  if (keys.has("ArrowLeft") || keys.has("KeyA")) { dx -= 1; s.boar.facing = "left"; }
  if (keys.has("ArrowRight") || keys.has("KeyD")) { dx += 1; s.boar.facing = "right"; }
  if (keys.has("ArrowUp") || keys.has("KeyW")) dy -= 1;
  if (keys.has("ArrowDown") || keys.has("KeyS")) dy += 1;

  if (dx !== 0 && dy !== 0) {
    dx *= 0.707;
    dy *= 0.707;
  }

  s.boar.vx = dx * speed;
  s.boar.vy = dy * speed;

  let nx = s.boar.x + s.boar.vx * dt;
  let ny = s.boar.y + s.boar.vy * dt;

  // World bounds
  nx = clamp(nx, 16, WORLD_W * TILE_SIZE - 16);
  ny = clamp(ny, 16, WORLD_H * TILE_SIZE - 16);

  // Check tile under boar
  const tileX = Math.floor(nx / TILE_SIZE);
  const tileY = Math.floor(ny / TILE_SIZE);
  const tile =
    tileX >= 0 && tileX < WORLD_W && tileY >= 0 && tileY < WORLD_H
      ? s.world.tiles[tileY][tileX]
      : null;

  if (tile?.type === "deepWater") {
    // Can't enter deep water, slow at edge
    nx = s.boar.x;
    ny = s.boar.y;
  } else {
    // Mud slows
    const slowFactor = tile?.type === "mud" ? 0.5 : 1;
    nx = s.boar.x + s.boar.vx * dt * slowFactor;
    ny = s.boar.y + s.boar.vy * dt * slowFactor;
    nx = clamp(nx, 16, WORLD_W * TILE_SIZE - 16);
    ny = clamp(ny, 16, WORLD_H * TILE_SIZE - 16);
  }

  s.boar.x = nx;
  s.boar.y = ny;

  // Mud wallowing
  if (tile?.type === "mud") {
    s.boar.muddy = true;
    s.boar.muddyTimer = 8;
  }
  if (s.boar.muddy) {
    s.boar.muddyTimer -= dt;
    if (s.boar.muddyTimer <= 0) s.boar.muddy = false;
  }

  // ── Stamina ───────────────────────────────────────────────────────────
  if (sprinting && (dx !== 0 || dy !== 0)) {
    s.stats.stamina = clamp(s.stats.stamina - SPRINT_DRAIN * dt, 0, MAX_STAT);
  } else {
    s.stats.stamina = clamp(
      s.stats.stamina + STAMINA_REGEN * dt,
      0,
      MAX_STAT
    );
  }

  // ── Hunger & Thirst ───────────────────────────────────────────────────
  s.stats.hunger = clamp(s.stats.hunger - HUNGER_RATE * dt, 0, MAX_STAT);
  s.stats.thirst = clamp(s.stats.thirst - THIRST_RATE * dt, 0, MAX_STAT);

  // Drinking from water
  if (tile?.type === "water" || tile?.type === "deepWater") {
    if (s.stats.thirst < MAX_STAT) {
      s.stats.thirst = clamp(s.stats.thirst + 30 * dt, 0, MAX_STAT);
      if (s.stats.thirst > 98) s.stats.thirst = MAX_STAT;
    }
  }

  // Health: damage from starvation/dehydration
  if (s.stats.hunger <= 0 || s.stats.thirst <= 0) {
    s.stats.health = clamp(s.stats.health - 3 * dt, 0, MAX_STAT);
  } else if (s.stats.hunger > 50 && s.stats.thirst > 50) {
    s.stats.health = clamp(s.stats.health + 1.5 * dt, 0, MAX_STAT);
  }

  // ── Eating food ───────────────────────────────────────────────────────
  for (const food of s.world.foods) {
    if (!food.visible) {
      food.respawnTimer -= dt;
      if (food.respawnTimer <= 0) food.visible = true;
      continue;
    }
    const d = dist(s.boar.x, s.boar.y, food.x, food.y);
    if (d < EAT_RANGE) {
      s.stats.hunger = clamp(s.stats.hunger + food.value, 0, MAX_STAT);
      s.stats.score += food.value;
      const emojis = { acorn: "🌰 +Hunger", mushroom: "🍄 +Hunger", berry: "🫐 +Hunger", root: "🌿 +Hunger" };
      addParticle(s, food.x, food.y - 20, emojis[food.type], "#f5d67a");
      food.visible = false;
      food.respawnTimer = 15 + Math.random() * 20;
    }
  }

  // ── Hunter logic ──────────────────────────────────────────────────────
  // Spawn hunters randomly during the day
  const pigletMultiplier = 1 + s.world.piglets.length * SCORE_MULTIPLIER_PER_PIGLET;
  s.stats.score += dt * 2 * pigletMultiplier; // time-based score, boosted by piglets

  // Update existing hunters
  for (const hunter of s.world.hunters) {
    if (!hunter.active) continue;
    const d = dist(hunter.x, hunter.y, s.boar.x, s.boar.y);

    if (d > HUNTER_DESPAWN_DIST) {
      hunter.active = false;
      continue;
    }

    if (d < 300) {
      // Chase boar
      const angle = Math.atan2(s.boar.y - hunter.y, s.boar.x - hunter.x);
      hunter.x += Math.cos(angle) * hunter.speed * dt;
      hunter.y += Math.sin(angle) * hunter.speed * dt;
      hunter.alertTimer = 3;
    }

    if (d < 36) {
      // Caught!
      s.stats.health = clamp(s.stats.health - 25 * dt, 0, MAX_STAT);
      addParticle(s, s.boar.x, s.boar.y - 40, "💥 OUCH!", "#ff4444");
    }
  }

  // ── Piglet spawning ───────────────────────────────────────────────────
  if (!s.pigletSpawned && s.time.day >= PIGLET_SPAWN_DAY && s.stats.health > 30) {
    s.pigletSpawned = true;
    for (let i = 0; i < PIGLET_COUNT; i++) {
      s.world.piglets.push({
        id: `piglet_${pigletId++}`,
        x: s.boar.x + (Math.random() - 0.5) * 80,
        y: s.boar.y + (Math.random() - 0.5) * 80,
        offsetAngle: (i / PIGLET_COUNT) * Math.PI * 2,
      });
    }
    addParticle(s, s.boar.x, s.boar.y - 60, "🐷🐷🐷 Piglets!", "#ffccaa");
    s.lastEvent = "🐷 Your piglets have arrived! Score ×" + (1 + PIGLET_COUNT * SCORE_MULTIPLIER_PER_PIGLET).toFixed(1);
    s.eventTimer = 5;
  }

  // ── Piglet movement ───────────────────────────────────────────────────
  for (const piglet of s.world.piglets) {
    // Follow a trailing position behind the boar with personal offset spread
    const targetX = s.boar.x - Math.cos(piglet.offsetAngle) * PIGLET_FOLLOW_DIST;
    const targetY = s.boar.y - Math.sin(piglet.offsetAngle) * PIGLET_FOLLOW_DIST;
    const dx = targetX - piglet.x;
    const dy = targetY - piglet.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > 8) {
      const speed = Math.min(PIGLET_FOLLOW_SPEED, d * 3); // speed up when far away
      piglet.x += (dx / d) * speed * dt;
      piglet.y += (dy / d) * speed * dt;
    }
    // Clamp to world
    piglet.x = Math.max(16, Math.min(WORLD_W * TILE_SIZE - 16, piglet.x));
    piglet.y = Math.max(16, Math.min(WORLD_H * TILE_SIZE - 16, piglet.y));
  }

  // ── Particles ─────────────────────────────────────────────────────────
  s.world.particles = s.world.particles.filter((p) => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 20 * dt; // gentle gravity
    p.life -= dt;
    return p.life > 0;
  });

  // ── Event timer ───────────────────────────────────────────────────────
  if (s.eventTimer > 0) s.eventTimer -= dt;

  // ── Camera ────────────────────────────────────────────────────────────
  const targetCamX = s.boar.x - CANVAS_W / 2;
  const targetCamY = s.boar.y - CANVAS_H / 2;
  s.camera.x = clamp(
    targetCamX,
    0,
    WORLD_W * TILE_SIZE - CANVAS_W
  );
  s.camera.y = clamp(
    targetCamY,
    0,
    WORLD_H * TILE_SIZE - CANVAS_H
  );

  // ── Death ─────────────────────────────────────────────────────────────
  if (s.stats.health <= 0) {
    s.phase = "dead";
  }

  return s;
}

export function spawnHunter(state: GameState): GameState {
  const s = { ...state, world: { ...state.world, hunters: [...state.world.hunters] } };
  // Spawn off-screen
  const angle = Math.random() * Math.PI * 2;
  const r = 450 + Math.random() * 100;
  const x = clamp(state.boar.x + Math.cos(angle) * r, 0, WORLD_W * TILE_SIZE);
  const y = clamp(state.boar.y + Math.sin(angle) * r, 0, WORLD_H * TILE_SIZE);
  s.world.hunters.push({
    id: `h_${hunterId++}`,
    x,
    y,
    speed: 70 + Math.random() * 40,
    active: true,
    alertTimer: 0,
  });
  s.lastEvent = "🎯 A hunter approaches!";
  s.eventTimer = 4;
  return s;
}
