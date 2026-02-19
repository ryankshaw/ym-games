import {
  WORLD_W,
  WORLD_H,
  TILE_SIZE,
  MAX_STAT,
  type GameState,
  type Tile,
  type TileType,
  type FoodItem,
} from "./gameTypes";

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generateTiles(): Tile[][] {
  const r = rng(42);
  const tiles: Tile[][] = [];

  // noise-like map: river runs vertically around x=20-24
  for (let y = 0; y < WORLD_H; y++) {
    tiles[y] = [];
    for (let x = 0; x < WORLD_W; x++) {
      let type: TileType = "grass";
      const n = r();

      // River
      const riverCenter = 20 + Math.sin(y * 0.4) * 2;
      const dist = Math.abs(x - riverCenter);
      if (dist < 1.5) type = "deepWater";
      else if (dist < 3) type = "water";
      // Mud patches near river
      else if (dist < 5 && n > 0.4) type = "mud";
      // Dirt patches
      else if (n > 0.85) type = "dirt";
      // Some mud patches away from river
      else if (n > 0.78 && n < 0.85) type = "mud";

      tiles[y].push({ type, variant: Math.floor(r() * 4) });
    }
  }
  return tiles;
}

function generateFoods(tiles: Tile[][]): FoodItem[] {
  const r = rng(123);
  const foods: FoodItem[] = [];
  const foodTypes: FoodItem["type"][] = ["acorn", "mushroom", "berry", "root"];
  const values = { acorn: 18, mushroom: 28, berry: 22, root: 15 };

  let id = 0;
  for (let i = 0; i < 80; i++) {
    const tx = Math.floor(r() * WORLD_W);
    const ty = Math.floor(r() * WORLD_H);
    const tile = tiles[ty][tx];
    if (tile.type === "water" || tile.type === "deepWater") continue;

    const type = foodTypes[Math.floor(r() * foodTypes.length)];
    foods.push({
      id: `food_${id++}`,
      x: tx * TILE_SIZE + TILE_SIZE / 2,
      y: ty * TILE_SIZE + TILE_SIZE / 2,
      type,
      value: values[type],
      respawnTimer: 0,
      visible: true,
    });
  }
  return foods;
}

export function createInitialState(): GameState {
  const tiles = generateTiles();
  const foods = generateFoods(tiles);

  return {
    boar: {
      x: 8 * TILE_SIZE,
      y: 10 * TILE_SIZE,
      vx: 0,
      vy: 0,
      facing: "right",
      sprinting: false,
      muddy: false,
      muddyTimer: 0,
      digging: false,
      digTimer: 0,
    },
    stats: {
      health: MAX_STAT,
      hunger: MAX_STAT,
      thirst: MAX_STAT,
      stamina: MAX_STAT,
      age: 0,
      score: 0,
    },
    world: {
      tiles,
      foods,
      hunters: [],
      particles: [],
      piglets: [],
    },
    time: {
      dayProgress: 0.25, // start at morning
      day: 1,
      isNight: false,
    },
    phase: "title",
    camera: { x: 0, y: 0 },
    lastEvent: "",
    eventTimer: 0,
    pigletSpawned: false,
  };
}
