// Game constants and types for Wild Boar Life Simulator

export const TILE_SIZE = 48;
export const WORLD_W = 40; // tiles wide
export const WORLD_H = 30; // tiles tall
export const BOAR_SPEED = 160; // px/s
export const HUNGER_RATE = 1.8; // per second
export const THIRST_RATE = 2.2;
export const STAMINA_REGEN = 8;
export const SPRINT_DRAIN = 20;
export const MAX_STAT = 100;

export type TileType = "grass" | "mud" | "water" | "dirt" | "deepWater";

export interface Tile {
  type: TileType;
  variant: number; // for visual variation
}

export interface FoodItem {
  id: string;
  x: number; // world px
  y: number;
  type: "acorn" | "mushroom" | "berry" | "root";
  value: number;
  respawnTimer: number;
  visible: boolean;
}

export interface Hunter {
  id: string;
  x: number;
  y: number;
  speed: number;
  active: boolean;
  alertTimer: number;
}

export interface Piglet {
  id: string;
  x: number; // world px
  y: number;
  offsetAngle: number; // personal orbit offset so they spread out
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  text?: string;
}

export interface GameState {
  boar: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    facing: "left" | "right";
    sprinting: boolean;
    muddy: boolean;
    muddyTimer: number;
    digging: boolean;
    digTimer: number;
  };
  stats: {
    health: number;
    hunger: number;
    thirst: number;
    stamina: number;
    age: number; // in game-days
    score: number;
  };
  world: {
    tiles: Tile[][];
    foods: FoodItem[];
    hunters: Hunter[];
    particles: Particle[];
    piglets: Piglet[];
  };
  pigletSpawned: boolean; // true once the litter has been given
  time: {
    dayProgress: number; // 0..1
    day: number;
    isNight: boolean;
  };
  phase: "title" | "playing" | "dead";
  camera: { x: number; y: number };
  lastEvent: string;
  eventTimer: number;
}
