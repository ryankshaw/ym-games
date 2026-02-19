export type AbilityName = 'charge' | 'roar' | 'bite';

export interface Ability {
  name: AbilityName;
  label: string;
  emoji: string;
  description: string;
  level: number; // 0 = locked, 1-3 = unlocked levels
  cooldownMs: number;
  lastUsedAt: number;
}

export interface PlayerStats {
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  abilities: Ability[];
  upgradePoints: number;
  wave: number;
  kills: number;
}

export type EnemyType = 'wolf' | 'bear' | 'boar' | 'snake' | 'lion';

export interface Enemy {
  id: string;
  type: EnemyType;
  x: number;
  z: number;
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  color: string;
  scale: number;
  state: 'idle' | 'chasing' | 'attacking' | 'dead';
  attackCooldown: number;
  lastAttack: number;
}

export type GamePhase = 'start' | 'playing' | 'upgrade' | 'gameover';
