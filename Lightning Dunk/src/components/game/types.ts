export interface Player {
  id: number;
  name: string;
  strikes: number;
  isEliminated: boolean;
  isActive: boolean;
}

export type GamePhase = 'setup' | 'playing' | 'result';
export type ShotPhase = 'idle' | 'charging' | 'shooting' | 'result';

export interface BallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  visible: boolean;
  made: boolean | null;
}
