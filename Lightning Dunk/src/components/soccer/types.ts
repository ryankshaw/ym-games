export type GoalkeeperAction = 'left' | 'center' | 'right' | 'idle';
export type ShotZone = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
export type KickPhase = 'aiming' | 'kicking' | 'flying' | 'result';
export type GamePhase = 'setup' | 'playing' | 'result';

export interface Round {
  kicked: boolean;
  goal: boolean | null;
}

export interface AimPosition {
  x: number; // 0-1 relative to goal
  y: number; // 0-1 relative to goal
}

// Wobble state passed to canvas so it can render the moving reticle
export interface WobbleState {
  x: number;
  y: number;
}
