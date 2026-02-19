export type SpecialType = 'shield' | 'dash' | 'beam' | 'fortress' | 'aoe' | 'power';
export type WeaponShape = 'pistol' | 'smg' | 'sniper' | 'shotgun' | 'cannon' | 'revolver';

export interface WeaponConfig {
  name: string;
  damage: number;
  cooldown: number;
  maxAmmo: number;
  reloadTime: number;
  bulletColor: string;
  weaponColor: string;
  accentColor: string;
  bulletSpeed: number;
  bulletSize: number;
  spread: number;
  pellets: number;
  aoeRadius: number;
  piercing: boolean;
  specialName: string;
  specialCooldown: number;
  specialDuration: number;
  specialType: SpecialType;
  specialDescription: string;
  weaponShape: WeaponShape;
  enemyHealth: number;
  enemySpeed: number;
}

export const WEAPONS: Record<string, WeaponConfig> = {
  pawn: {
    name: 'IRON PISTOL',
    damage: 30,
    cooldown: 0.45,
    maxAmmo: 12,
    reloadTime: 1.5,
    bulletColor: '#ffff88',
    weaponColor: '#888888',
    accentColor: '#cccccc',
    bulletSpeed: 28,
    bulletSize: 0.06,
    spread: 0.04,
    pellets: 1,
    aoeRadius: 0,
    piercing: false,
    specialName: 'IRON SHIELD',
    specialCooldown: 12,
    specialDuration: 3,
    specialType: 'shield',
    specialDescription: 'Invincible for 3 seconds',
    weaponShape: 'pistol',
    enemyHealth: 50,
    enemySpeed: 2.0,
  },
  knight: {
    name: 'TWIN SMGs',
    damage: 11,
    cooldown: 0.08,
    maxAmmo: 45,
    reloadTime: 2.0,
    bulletColor: '#88ddff',
    weaponColor: '#2266aa',
    accentColor: '#44aaff',
    bulletSpeed: 32,
    bulletSize: 0.04,
    spread: 0.07,
    pellets: 1,
    aoeRadius: 0,
    piercing: false,
    specialName: 'CAVALRY CHARGE',
    specialCooldown: 8,
    specialDuration: 0.1,
    specialType: 'dash',
    specialDescription: 'Dash forward 8 units instantly',
    weaponShape: 'smg',
    enemyHealth: 70,
    enemySpeed: 3.5,
  },
  bishop: {
    name: 'HOLY SNIPER',
    damage: 90,
    cooldown: 1.8,
    maxAmmo: 6,
    reloadTime: 2.5,
    bulletColor: '#ddaaff',
    weaponColor: '#6633aa',
    accentColor: '#cc88ff',
    bulletSpeed: 65,
    bulletSize: 0.05,
    spread: 0.005,
    pellets: 1,
    aoeRadius: 0,
    piercing: true,
    specialName: 'DIVINE BEAM',
    specialCooldown: 15,
    specialDuration: 0.6,
    specialType: 'beam',
    specialDescription: 'Piercing holy beam obliterates all enemies in line',
    weaponShape: 'sniper',
    enemyHealth: 60,
    enemySpeed: 2.5,
  },
  rook: {
    name: 'WAR SHOTGUN',
    damage: 16,
    cooldown: 0.9,
    maxAmmo: 10,
    reloadTime: 2.0,
    bulletColor: '#ffcc88',
    weaponColor: '#993300',
    accentColor: '#ff8844',
    bulletSpeed: 22,
    bulletSize: 0.07,
    spread: 0.16,
    pellets: 7,
    aoeRadius: 0,
    piercing: false,
    specialName: 'FORTRESS MODE',
    specialCooldown: 18,
    specialDuration: 4,
    specialType: 'fortress',
    specialDescription: 'Immovable — triple fire rate for 4 seconds',
    weaponShape: 'shotgun',
    enemyHealth: 100,
    enemySpeed: 2.0,
  },
  queen: {
    name: 'PLASMA CANNON',
    damage: 55,
    cooldown: 1.6,
    maxAmmo: 6,
    reloadTime: 3.0,
    bulletColor: '#ff88cc',
    weaponColor: '#880044',
    accentColor: '#ff44aa',
    bulletSpeed: 16,
    bulletSize: 0.16,
    spread: 0.01,
    pellets: 1,
    aoeRadius: 5.5,
    piercing: false,
    specialName: 'ROYAL WRATH',
    specialCooldown: 20,
    specialDuration: 0.5,
    specialType: 'aoe',
    specialDescription: 'Massive explosion — ALL enemies take heavy damage',
    weaponShape: 'cannon',
    enemyHealth: 150,
    enemySpeed: 3.0,
  },
  king: {
    name: 'ROYAL MAGNUM',
    damage: 52,
    cooldown: 0.85,
    maxAmmo: 8,
    reloadTime: 2.0,
    bulletColor: '#ffee88',
    weaponColor: '#886600',
    accentColor: '#ffcc44',
    bulletSpeed: 38,
    bulletSize: 0.08,
    spread: 0.015,
    pellets: 1,
    aoeRadius: 0,
    piercing: false,
    specialName: "KING'S DECREE",
    specialCooldown: 15,
    specialDuration: 5,
    specialType: 'power',
    specialDescription: 'Next 4 shots: 3× damage, piercing, golden rounds',
    weaponShape: 'revolver',
    enemyHealth: 200,
    enemySpeed: 2.5,
  },
};
