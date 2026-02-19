import { type GameState, type FoodItem, TILE_SIZE, WORLD_W, WORLD_H } from "./gameTypes";

// ── Sprite loading ─────────────────────────────────────────────────────────

import boarSpriteUrl from "@/assets/boar-sprite.png";
import hunterSpriteUrl from "@/assets/hunter-sprite.png";
import tileGrassUrl from "@/assets/tile-grass.png";
import tileMudUrl from "@/assets/tile-mud.png";
import tileWaterUrl from "@/assets/tile-water.png";
import tileDirtUrl from "@/assets/tile-dirt.png";
import treeSpriteUrl from "@/assets/tree-sprite.png";
import foodSpritesUrl from "@/assets/food-sprites.png";

interface Sprites {
  boar: HTMLImageElement | null;
  hunter: HTMLImageElement | null;
  grass: HTMLImageElement | null;
  mud: HTMLImageElement | null;
  water: HTMLImageElement | null;
  dirt: HTMLImageElement | null;
  tree: HTMLImageElement | null;
  food: HTMLImageElement | null;
}

const sprites: Sprites = {
  boar: null,
  hunter: null,
  grass: null,
  mud: null,
  water: null,
  dirt: null,
  tree: null,
  food: null,
};

let spritesLoaded = false;

function loadImg(url: string): HTMLImageElement {
  const img = new Image();
  img.src = url;
  return img;
}

/** Remove near-white pixels from a sprite (for images on white bg) */
function makeTransparent(img: HTMLImageElement, threshold = 240): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const x = c.getContext("2d")!;
  x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < d.data.length; i += 4) {
    const r = d.data[i], g = d.data[i + 1], b = d.data[i + 2];
    if (r > threshold && g > threshold && b > threshold) d.data[i + 3] = 0;
  }
  x.putImageData(d, 0, 0);
  return c;
}

// Processed canvases (white-bg removed)
const processed: {
  boar: HTMLCanvasElement | null;
  hunter: HTMLCanvasElement | null;
  tree: HTMLCanvasElement | null;
  food: HTMLCanvasElement | null;
} = { boar: null, hunter: null, tree: null, food: null };

function processWhenLoaded(img: HTMLImageElement, key: "boar" | "hunter" | "tree" | "food") {
  if (img.complete && img.naturalWidth > 0) {
    processed[key] = makeTransparent(img);
  } else {
    img.onload = () => { processed[key] = makeTransparent(img); };
  }
}

export function initSprites() {
  if (spritesLoaded) return;
  spritesLoaded = true;
  sprites.boar = loadImg(boarSpriteUrl);
  sprites.hunter = loadImg(hunterSpriteUrl);
  sprites.grass = loadImg(tileGrassUrl);
  sprites.mud = loadImg(tileMudUrl);
  sprites.water = loadImg(tileWaterUrl);
  sprites.dirt = loadImg(tileDirtUrl);
  sprites.tree = loadImg(treeSpriteUrl);
  sprites.food = loadImg(foodSpritesUrl);

  processWhenLoaded(sprites.boar, "boar");
  processWhenLoaded(sprites.hunter, "hunter");
  processWhenLoaded(sprites.tree, "tree");
  processWhenLoaded(sprites.food, "food");
}

// Food sprite grid: 2x2 layout in the food-sprites.png
// [acorn=top-left, mushroom=top-right, berry=bottom-left, root=bottom-right]
const FOOD_GRID: Record<FoodItem["type"], [number, number]> = {
  acorn:    [0, 0],
  mushroom: [1, 0],
  berry:    [0, 1],
  root:     [1, 1],
};

// ── Tile rendering ─────────────────────────────────────────────────────────

function drawTileImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  sx: number,
  sy: number,
  time: number,
  variant: number
) {
  // Offset into the tile texture for variation
  const offX = (variant * 128) % (img.naturalWidth || 512);
  const offY = (variant * 64) % (img.naturalHeight || 512);
  const src = Math.min(img.naturalWidth || 512, 512);
  ctx.drawImage(img, offX % src, offY % src, TILE_SIZE, TILE_SIZE, sx, sy, TILE_SIZE + 1, TILE_SIZE + 1);
}

// ── Boar drawing ───────────────────────────────────────────────────────────

function drawBoar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  facing: "left" | "right",
  muddy: boolean,
  sprinting: boolean,
  time: number
) {
  const W = 90;
  const H = 72;

  // Bob/squash animation
  const bob = Math.sin(time * (sprinting ? 18 : 8)) * (sprinting ? 5 : 2);
  const squashX = sprinting ? 1.12 : 1;
  const squashY = sprinting ? 0.88 : 1;

  ctx.save();
  ctx.translate(x, y + bob * 0.3);
  if (facing === "left") ctx.scale(-1, 1);
  ctx.scale(squashX, squashY);

  // Shadow
  ctx.beginPath();
  ctx.ellipse(0, H * 0.42, W * 0.38 * squashX, 10 * squashY, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fill();

  if (processed.boar) {
    // Draw sprite
    if (muddy) {
      // Apply sepia/brown tint for muddy boar
      ctx.filter = "sepia(0.7) saturate(0.6)";
    }
    ctx.drawImage(processed.boar!, -W * 0.55, -H * 0.6, W, H);
    ctx.filter = "none";

    // Mud splotches
    if (muddy) {
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = "#7a5c3e";
      ctx.beginPath(); ctx.ellipse(-10, 4, 10, 6, 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(8, 8, 7, 5, -0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, -8, 6, 4, 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
  } else {
    // Fallback drawing
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 13, 0, 0, Math.PI * 2);
    ctx.fillStyle = muddy ? "#7a5c3e" : "#4a3028";
    ctx.fill();
  }

  // Sprint dust particles
  if (sprinting) {
    for (let i = 0; i < 3; i++) {
      const angle = Math.PI + (Math.random() - 0.5) * 1.2;
      const d = 28 + Math.random() * 20;
      const px = Math.cos(angle) * d - W * 0.3;
      const py = Math.sin(angle) * d * 0.5;
      ctx.beginPath();
      ctx.arc(px, py, 3 + Math.random() * 5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180,150,100,${0.15 + Math.random() * 0.3})`;
      ctx.fill();
    }
  }

  ctx.restore();
}

// ── Hunter drawing ─────────────────────────────────────────────────────────

function drawHunter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number
) {
  const W = 70;
  const H = 80;

  ctx.save();
  ctx.translate(x, y);

  // Pulse warning ring
  const pulse = (Math.sin(time * 6) + 1) / 2;
  ctx.beginPath();
  ctx.arc(0, -10, 40 + pulse * 12, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255,60,60,${0.15 + pulse * 0.25})`;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Shadow
  ctx.beginPath();
  ctx.ellipse(0, 18, 24, 9, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fill();

  if (processed.hunter) {
    ctx.drawImage(processed.hunter, -W / 2, -H * 0.7, W, H);
  } else {
    // Fallback
    ctx.fillStyle = "#4a6b3a";
    ctx.fillRect(-8, -10, 16, 28);
    ctx.beginPath();
    ctx.arc(0, -18, 10, 0, Math.PI * 2);
    ctx.fillStyle = "#c4956a";
    ctx.fill();
  }

  // Alert "!" badge
  ctx.save();
  ctx.translate(20, -H * 0.65);
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(220,40,40,${0.8 + pulse * 0.2})`;
  ctx.fill();
  ctx.font = "bold 12px monospace";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("!", 0, 0);
  ctx.restore();

  ctx.restore();
}

// ── Food drawing ───────────────────────────────────────────────────────────

function drawFood(
  ctx: CanvasRenderingContext2D,
  type: FoodItem["type"],
  x: number,
  y: number,
  time: number
) {
  const bob = Math.sin(time * 2.2 + x * 0.05) * 3;
  const SIZE = 36;

  ctx.save();
  ctx.translate(x, y + bob);

  // Glow
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, SIZE);
  glow.addColorStop(0, "rgba(255,220,80,0.22)");
  glow.addColorStop(1, "rgba(255,220,80,0)");
  ctx.beginPath();
  ctx.arc(0, 0, SIZE, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  if (processed.food) {
    const [gx, gy] = FOOD_GRID[type];
    const half = processed.food!.width / 2;
    ctx.drawImage(
      processed.food!,
      gx * half,
      gy * half,
      half,
      half,
      -SIZE / 2,
      -SIZE / 2,
      SIZE,
      SIZE
    );
  } else {
    const emojis = { acorn: "🌰", mushroom: "🍄", berry: "🫐", root: "🌿" };
    ctx.font = "22px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emojis[type], 0, 0);
  }

  ctx.restore();
}

// ── Tree drawing ───────────────────────────────────────────────────────────

function drawTree(ctx: CanvasRenderingContext2D, sx: number, sy: number) {
  const S = TILE_SIZE * 1.7;
  const cx = sx + TILE_SIZE / 2;
  const cy = sy + TILE_SIZE / 2;

  if (processed.tree) {
    // Shadow
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.filter = "blur(4px)";
    ctx.drawImage(processed.tree!, cx - S * 0.42, cy - S * 0.3, S * 0.85, S * 0.85);
    ctx.restore();
    // Tree
    ctx.drawImage(processed.tree!, cx - S / 2, cy - S / 2, S, S);
  } else {
    ctx.fillStyle = "#5a3a1a";
    ctx.fillRect(cx - 6, cy - 6, 12, 18);
    ctx.beginPath();
    ctx.arc(cx, cy - 10, 22, 0, Math.PI * 2);
    ctx.fillStyle = "#2a5a1a";
    ctx.fill();
  }
}

// ── Main render ─────────────────────────────────────────────────────────────

export function renderGame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  time: number
) {
  const { camera, boar, world, time: gameTime } = state;
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;

  // Background fill
  ctx.fillStyle = "#2a4a1a";
  ctx.fillRect(0, 0, W, H);

  // ── Draw tiles ────────────────────────────────────────────────────────
  const startTX = Math.max(0, Math.floor(camera.x / TILE_SIZE));
  const startTY = Math.max(0, Math.floor(camera.y / TILE_SIZE));
  const endTX = Math.min(WORLD_W, startTX + Math.ceil(W / TILE_SIZE) + 2);
  const endTY = Math.min(WORLD_H, startTY + Math.ceil(H / TILE_SIZE) + 2);

  // Collect trees to draw on top
  const treesToDraw: { sx: number; sy: number }[] = [];

  for (let ty = startTY; ty < endTY; ty++) {
    for (let tx = startTX; tx < endTX; tx++) {
      const tile = world.tiles[ty][tx];
      const sx = tx * TILE_SIZE - camera.x;
      const sy = ty * TILE_SIZE - camera.y;

      // Choose tile sprite
      let tileImg: HTMLImageElement | null = null;
      if (tile.type === "grass") tileImg = sprites.grass;
      else if (tile.type === "mud") tileImg = sprites.mud;
      else if (tile.type === "water" || tile.type === "deepWater") tileImg = sprites.water;
      else if (tile.type === "dirt") tileImg = sprites.dirt;

      if (tileImg?.complete && tileImg.naturalWidth > 0) {
        const imgW = tileImg.naturalWidth;
        const imgH = tileImg.naturalHeight;
        // Use variant to pick different sub-section of the tile
        const offX = ((tile.variant * 100) % Math.max(1, imgW - TILE_SIZE));
        const offY = ((tile.variant * 73) % Math.max(1, imgH - TILE_SIZE));
        ctx.drawImage(tileImg, offX, offY, TILE_SIZE, TILE_SIZE, sx, sy, TILE_SIZE + 1, TILE_SIZE + 1);
      } else {
        // Solid color fallback
        const colors: Record<string, string> = {
          grass: "#3a6b2a",
          mud: "#7a5c3e",
          water: "#2a6b8a",
          deepWater: "#1a4a6a",
          dirt: "#9b7a52",
        };
        ctx.fillStyle = colors[tile.type] || "#3a6b2a";
        ctx.fillRect(sx, sy, TILE_SIZE + 1, TILE_SIZE + 1);
      }

      // Animated water shimmer on top
      if (tile.type === "water" || tile.type === "deepWater") {
        const shimmer = Math.sin(time * 2.5 + tx * 0.9 + ty * 0.7) * 0.2 + 0.1;
        ctx.fillStyle = `rgba(255,255,255,${shimmer * 0.18})`;
        ctx.fillRect(sx + 6, sy + 12, TILE_SIZE - 12, 5);
        ctx.fillRect(sx + 14, sy + 26, TILE_SIZE - 22, 4);
        // Depth tint for deep water
        if (tile.type === "deepWater") {
          ctx.fillStyle = "rgba(0,30,80,0.28)";
          ctx.fillRect(sx, sy, TILE_SIZE + 1, TILE_SIZE + 1);
        }
      }

      // Tree tiles - collect for later (draw above other objects)
      if (tile.type === "grass" && tile.variant === 3 && tx % 3 === 0 && ty % 3 === 0) {
        treesToDraw.push({ sx, sy });
      }
    }
  }

  // ── Draw food ─────────────────────────────────────────────────────────
  for (const food of world.foods) {
    if (!food.visible) continue;
    const sx = food.x - camera.x;
    const sy = food.y - camera.y;
    if (sx < -50 || sx > W + 50 || sy < -50 || sy > H + 50) continue;
    drawFood(ctx, food.type, sx, sy, time);
  }

  // ── Draw hunters ──────────────────────────────────────────────────────
  for (const hunter of world.hunters) {
    if (!hunter.active) continue;
    const sx = hunter.x - camera.x;
    const sy = hunter.y - camera.y;
    if (sx < -80 || sx > W + 80 || sy < -80 || sy > H + 80) continue;
    drawHunter(ctx, sx, sy, time);
  }

  // ── Draw boar ─────────────────────────────────────────────────────────
  const bx = boar.x - camera.x;
  const by = boar.y - camera.y;
  drawBoar(ctx, bx, by, boar.facing, boar.muddy, boar.sprinting, time);

  // ── Draw trees on top (so they overlap entities) ───────────────────────
  for (const { sx, sy } of treesToDraw) {
    drawTree(ctx, sx, sy);
  }

  // ── Draw particles ────────────────────────────────────────────────────
  for (const p of world.particles) {
    const px = p.x - camera.x;
    const py = p.y - camera.y;
    const alpha = p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (p.text) {
      // Text shadow
      ctx.font = `bold ${p.size + 2}px 'VT323', monospace`;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.text, px + 1, py + 1);
      ctx.font = `bold ${p.size}px 'VT323', monospace`;
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, px, py);
    }
    ctx.restore();
  }

  // ── Night overlay ─────────────────────────────────────────────────────
  if (gameTime.isNight) {
    const nightAlpha = Math.min(0.85, (gameTime.dayProgress > 0.6
      ? (gameTime.dayProgress - 0.6) / 0.15
      : (0.05 - gameTime.dayProgress) / 0.05));
    const na = Math.max(0, nightAlpha);

    // Dark blue overlay
    ctx.fillStyle = `rgba(2,5,22,${na * 0.78})`;
    ctx.fillRect(0, 0, W, H);

    // Lantern/moonlight around boar
    const lantern = ctx.createRadialGradient(bx, by, 0, bx, by, 200);
    lantern.addColorStop(0, `rgba(255,220,140,${na * 0.18})`);
    lantern.addColorStop(0.5, `rgba(100,120,200,${na * 0.08})`);
    lantern.addColorStop(1, "transparent");
    ctx.fillStyle = lantern;
    ctx.fillRect(0, 0, W, H);

    // Stars
    if (na > 0.3) {
      ctx.globalAlpha = (na - 0.3) * 0.8;
      for (let i = 0; i < 40; i++) {
        const sx = ((i * 137 + 50) % W);
        const sy = ((i * 97 + 30) % (H * 0.5));
        const twinkle = Math.sin(time * 3 + i) * 0.4 + 0.6;
        ctx.beginPath();
        ctx.arc(sx, sy, 1 + (i % 2) * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,230,${twinkle})`;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  // ── Vignette ──────────────────────────────────────────────────────────
  const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.85);
  vignette.addColorStop(0, "transparent");
  vignette.addColorStop(1, "rgba(0,0,0,0.42)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
}
