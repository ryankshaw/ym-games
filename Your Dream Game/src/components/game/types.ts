export interface Vec2 {
  x: number;
  y: number;
}

export interface LightSource {
  id: string;
  pos: Vec2;
  radius: number;
  intensity: number;
  color: string;
  held: boolean;
}

export interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
  isShadow?: boolean;
  opacity?: number;
  isWindow?: boolean; // Level 2: window sills that cast shadow ribs
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export type Tone = 'low' | 'high' | 'whisper' | 'silence' | null;

export interface Camera {
  x: number;
  y: number;
}

export const WORLD_W = 2600;
export const WORLD_H = 600;
export const VIEW_W = 900;
export const VIEW_H = 580;

export interface GameState {
  player: {
    pos: Vec2;
    vel: Vec2;
    onGround: boolean;
    facing: number;
    glowPulse: number;
    holdingLight: string | null;
  };
  camera: Camera;
  lights: LightSource[];
  platforms: Platform[];
  shadowPlatforms: Platform[];
  currentTone: Tone;
  silenceActive: boolean;
  toneTimer: number;
  particles: Particle[];
  level: number;
  levelComplete: boolean;
  noteRipples: { x: number; y: number; r: number; maxR: number; color: string; life: number }[];
  tutorialStep: number;
  goalReached: boolean;
  shadowSway: number;
  shadowCrystallized: boolean;
  // Per-level world config
  groundY: number;
  worldW: number;
  worldHeight: number;
  // Echo-note system
  echoQueue: Array<{ tone: Tone; delay: number }>;
  echoTone: Tone;
  echoTimer: number;
}

export interface Keys {
  left: boolean;
  right: boolean;
  up: boolean;
  z: boolean;
  x: boolean;
  c: boolean;
  space: boolean;
  e: boolean;
}
