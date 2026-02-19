import { useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text, RoundedBox, Cylinder } from '@react-three/drei';
import * as THREE from 'three';
import { PlayerStats, Enemy, EnemyType, GamePhase, Ability, AbilityName } from './types';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

// ─── Constants ───────────────────────────────────────────────────────────────
const ARENA_RADIUS = 14;
const INITIAL_HEALTH = 120;

const ENEMY_TEMPLATES: Record<EnemyType, Partial<Enemy>> = {
  wolf:  { color: '#7c6f64', scale: 0.7, speed: 0.045, damage: 8,  maxHealth: 40  },
  bear:  { color: '#8b5e3c', scale: 1.3, speed: 0.018, damage: 22, maxHealth: 120 },
  boar:  { color: '#6b5344', scale: 0.9, speed: 0.030, damage: 14, maxHealth: 70  },
  snake: { color: '#4a7c59', scale: 0.5, speed: 0.055, damage: 6,  maxHealth: 25  },
  lion:  { color: '#c9a84c', scale: 1.1, speed: 0.028, damage: 18, maxHealth: 90  },
};

const ENEMY_TYPES: EnemyType[] = ['wolf', 'bear', 'boar', 'snake', 'lion'];

function randomEnemyType(): EnemyType {
  return ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
}

function spawnEnemy(wave: number): Enemy {
  const type = randomEnemyType();
  const tmpl = ENEMY_TEMPLATES[type];
  const angle = Math.random() * Math.PI * 2;
  const dist = ARENA_RADIUS - 2;
  const waveBonus = 1 + (wave - 1) * 0.15;
  return {
    id: Math.random().toString(36).slice(2),
    type,
    x: Math.cos(angle) * dist,
    z: Math.sin(angle) * dist,
    health: (tmpl.maxHealth ?? 50) * waveBonus,
    maxHealth: (tmpl.maxHealth ?? 50) * waveBonus,
    speed: tmpl.speed ?? 0.03,
    damage: (tmpl.damage ?? 10) * waveBonus,
    color: tmpl.color ?? '#888',
    scale: tmpl.scale ?? 1,
    state: 'chasing',
    attackCooldown: 1200,
    lastAttack: 0,
  };
}

function waveEnemyCount(wave: number) {
  return 3 + wave * 2;
}

// ─── Bull (Player) mesh ───────────────────────────────────────────────────────
function BullMesh({ isCharging, isRoaring }: { isCharging: boolean; isRoaring: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();
    group.current.children.forEach((c, i) => {
      if (i === 0) c.position.y = Math.sin(t * 6) * 0.04 + 0.55;
    });
    if (isCharging) group.current.scale.setScalar(1.15);
    else if (isRoaring) group.current.scale.setScalar(1.08);
    else group.current.scale.setScalar(1.0);
  });

  const bodyColor = isCharging ? '#ff6600' : isRoaring ? '#ffcc00' : '#4a3728';
  const hornColor = '#e8d5a3';

  return (
    <group ref={group}>
      {/* Body */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[0.9, 0.7, 1.4]} />
        <meshStandardMaterial color={bodyColor} roughness={0.8} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.9, 0.7]} castShadow>
        <boxGeometry args={[0.65, 0.55, 0.6]} />
        <meshStandardMaterial color={bodyColor} roughness={0.8} />
      </mesh>
      {/* Snout */}
      <mesh position={[0, 0.82, 1.02]}>
        <boxGeometry args={[0.4, 0.3, 0.18]} />
        <meshStandardMaterial color="#3a2820" roughness={0.9} />
      </mesh>
      {/* Horns */}
      <mesh position={[-0.28, 1.22, 0.6]} rotation={[0, 0, -0.4]}>
        <cylinderGeometry args={[0.03, 0.07, 0.35, 6]} />
        <meshStandardMaterial color={hornColor} roughness={0.5} />
      </mesh>
      <mesh position={[0.28, 1.22, 0.6]} rotation={[0, 0, 0.4]}>
        <cylinderGeometry args={[0.03, 0.07, 0.35, 6]} />
        <meshStandardMaterial color={hornColor} roughness={0.5} />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.2, 0.98, 0.94]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#ff2200" emissive="#ff2200" emissiveIntensity={isCharging ? 2 : 0.5} />
      </mesh>
      <mesh position={[0.2, 0.98, 0.94]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#ff2200" emissive="#ff2200" emissiveIntensity={isCharging ? 2 : 0.5} />
      </mesh>
      {/* Legs */}
      {[[-0.3, 0, -0.4], [0.3, 0, -0.4], [-0.3, 0, 0.4], [0.3, 0, 0.4]].map(([x, , z], i) => (
        <mesh key={i} position={[x, 0.17, z as number]} castShadow>
          <boxGeometry args={[0.22, 0.35, 0.22]} />
          <meshStandardMaterial color={bodyColor} roughness={0.8} />
        </mesh>
      ))}
      {/* Tail */}
      <mesh position={[0, 0.65, -0.72]} rotation={[0.4, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.4, 6]} />
        <meshStandardMaterial color={bodyColor} roughness={0.9} />
      </mesh>
    </group>
  );
}

// ─── Enemy mesh ───────────────────────────────────────────────────────────────
function EnemyMesh({ enemy }: { enemy: Enemy }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime() + parseFloat(enemy.id.slice(0, 4)) * 10;
    group.current.position.set(enemy.x, 0, enemy.z);
    const faceAngle = Math.atan2(
      -enemy.x / (Math.abs(enemy.x) + 0.001),
      -enemy.z / (Math.abs(enemy.z) + 0.001)
    );
    group.current.rotation.y = faceAngle;
    group.current.children[0].position.y = Math.sin(t * 5) * 0.05 + enemy.scale * 0.5;
  });

  const s = enemy.scale;
  const isSnake = enemy.type === 'snake';

  return (
    <group ref={group} position={[enemy.x, 0, enemy.z]}>
      <group>
        {/* Body */}
        <mesh castShadow>
          <boxGeometry args={isSnake ? [0.25, 0.25, s * 1.6] : [s * 0.8, s * 0.6, s * 1.2]} />
          <meshStandardMaterial color={enemy.color} roughness={0.8} />
        </mesh>
        {!isSnake && (
          <>
            {/* Head */}
            <mesh position={[0, s * 0.35, s * 0.55]}>
              <boxGeometry args={[s * 0.55, s * 0.45, s * 0.5]} />
              <meshStandardMaterial color={enemy.color} roughness={0.8} />
            </mesh>
            {/* Eyes */}
            <mesh position={[-s * 0.2, s * 0.46, s * 0.82]}>
              <sphereGeometry args={[0.05, 6, 6]} />
              <meshStandardMaterial color="white" />
            </mesh>
            <mesh position={[s * 0.2, s * 0.46, s * 0.82]}>
              <sphereGeometry args={[0.05, 6, 6]} />
              <meshStandardMaterial color="white" />
            </mesh>
            {/* Bear ears */}
            {enemy.type === 'bear' && (
              <>
                <mesh position={[-s * 0.22, s * 0.7, s * 0.25]}>
                  <sphereGeometry args={[s * 0.12, 6, 6]} />
                  <meshStandardMaterial color={enemy.color} />
                </mesh>
                <mesh position={[s * 0.22, s * 0.7, s * 0.25]}>
                  <sphereGeometry args={[s * 0.12, 6, 6]} />
                  <meshStandardMaterial color={enemy.color} />
                </mesh>
              </>
            )}
            {/* Lion mane */}
            {enemy.type === 'lion' && (
              <mesh position={[0, s * 0.35, s * 0.42]}>
                <sphereGeometry args={[s * 0.42, 8, 8]} />
                <meshStandardMaterial color="#7a5520" roughness={1} />
              </mesh>
            )}
            {/* Legs */}
            {([-s * 0.28, s * 0.28] as number[]).flatMap((x) =>
              ([-s * 0.35, s * 0.35] as number[]).map((z, j) => (
                <mesh key={`${x}-${j}`} position={[x, -s * 0.13, z]}>
                  <boxGeometry args={[s * 0.18, s * 0.3, s * 0.18]} />
                  <meshStandardMaterial color={enemy.color} />
                </mesh>
              ))
            )}
          </>
        )}
      </group>
    </group>
  );
}

// ─── Health bar ───────────────────────────────────────────────────────────────
function HealthBar3D({ x, z, hp, maxHp }: { x: number; z: number; hp: number; maxHp: number }) {
  const pct = Math.max(0, hp / maxHp);
  const color = pct > 0.5 ? '#44ff44' : pct > 0.25 ? '#ffaa00' : '#ff2222';
  return (
    <group position={[x, 2.2, z]}>
      <mesh>
        <boxGeometry args={[1.2, 0.12, 0.01]} />
        <meshBasicMaterial color="#222" />
      </mesh>
      <mesh position={[-(1.2 * (1 - pct)) / 2, 0, 0.01]}>
        <boxGeometry args={[1.2 * pct, 0.1, 0.01]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

// ─── Arena ────────────────────────────────────────────────────────────────────
function Arena() {
  const wallSegments = 32;
  return (
    <group>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[ARENA_RADIUS, 48]} />
        <meshStandardMaterial color="#5c4a1e" roughness={0.9} />
      </mesh>
      {/* Arena markings */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[ARENA_RADIUS - 0.2, ARENA_RADIUS, 48]} />
        <meshBasicMaterial color="#8b6914" />
      </mesh>
      {/* Outer walls */}
      {Array.from({ length: wallSegments }).map((_, i) => {
        const angle = (i / wallSegments) * Math.PI * 2;
        const nx = Math.cos(angle) * ARENA_RADIUS;
        const nz = Math.sin(angle) * ARENA_RADIUS;
        return (
          <mesh key={i} position={[nx, 1, nz]} rotation={[0, -angle, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.8, 2.2, 0.4]} />
            <meshStandardMaterial color="#3d2b0f" roughness={0.9} />
          </mesh>
        );
      })}
      {/* Sand dust patches */}
      {[[-3, -4], [5, 2], [-6, 6], [4, -7], [0, 5]].map(([x, z], i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, Math.random()]} position={[x, 0.02, z]}>
          <circleGeometry args={[0.8 + Math.random() * 0.5, 8]} />
          <meshBasicMaterial color="#8b7340" transparent opacity={0.35} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Charge FX ────────────────────────────────────────────────────────────────
function ChargeFX({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <mesh position={[0, 0.3, 0]}>
      <torusGeometry args={[1.2, 0.08, 8, 24]} />
      <meshBasicMaterial color="#ff6600" transparent opacity={0.6} />
    </mesh>
  );
}

// ─── Game world (runs inside Canvas) ──────────────────────────────────────────
interface WorldProps {
  playerRef: React.MutableRefObject<{ x: number; z: number; angle: number }>;
  enemiesRef: React.MutableRefObject<Enemy[]>;
  statsRef: React.MutableRefObject<PlayerStats>;
  activeAbilityRef: React.MutableRefObject<AbilityName | null>;
  keys: React.MutableRefObject<Set<string>>;
  onHit: (dmg: number) => void;
  onKill: () => void;
  phase: GamePhase;
}

function World({ playerRef, enemiesRef, statsRef, activeAbilityRef, keys, onHit, onKill, phase }: WorldProps) {
  const { camera } = useThree();
  const [, forceRender] = useState(0);
  const playerMesh = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (phase !== 'playing') return;

    const p = playerRef.current;
    const stats = statsRef.current;
    const ability = activeAbilityRef.current;
    const isCharging = ability === 'charge';

    // Movement
    const spd = stats.speed * (isCharging ? 2.2 : 1) * 60 * delta;
    let moved = false;
    if (keys.current.has('ArrowLeft') || keys.current.has('a')) { p.angle -= 0.045; }
    if (keys.current.has('ArrowRight') || keys.current.has('d')) { p.angle += 0.045; }
    if (keys.current.has('ArrowUp') || keys.current.has('w')) {
      p.x += Math.sin(p.angle) * spd;
      p.z += Math.cos(p.angle) * spd;
      moved = true;
    }
    if (keys.current.has('ArrowDown') || keys.current.has('s')) {
      p.x -= Math.sin(p.angle) * spd * 0.5;
      p.z -= Math.cos(p.angle) * spd * 0.5;
      moved = true;
    }

    // Keep in arena
    const dist = Math.sqrt(p.x * p.x + p.z * p.z);
    if (dist > ARENA_RADIUS - 1.5) {
      p.x = (p.x / dist) * (ARENA_RADIUS - 1.5);
      p.z = (p.z / dist) * (ARENA_RADIUS - 1.5);
    }

    // Update player mesh
    if (playerMesh.current) {
      playerMesh.current.position.set(p.x, 0, p.z);
      playerMesh.current.rotation.y = -p.angle + Math.PI;
    }

    // Camera follow
    const camDist = 14;
    const camHeight = 9;
    camera.position.lerp(
      new THREE.Vector3(p.x, camHeight, p.z + camDist),
      0.06
    );
    camera.lookAt(p.x, 0, p.z);

    // Enemy AI
    const now = performance.now();
    const chargeKnockback = isCharging ? 3.5 : 1;
    let needsRender = moved;

    const roarLevel = stats.abilities.find(a => a.name === 'roar')?.level ?? 0;
    const roarRadius = ability === 'roar' ? 4 + roarLevel * 1.5 : 0;
    const biteLevel = stats.abilities.find(a => a.name === 'bite')?.level ?? 0;
    const biteRange = ability === 'bite' ? 2.2 + biteLevel * 0.5 : 0;

    enemiesRef.current = enemiesRef.current.filter(e => {
      if (e.state === 'dead') return false;

      const dx = p.x - e.x;
      const dz = p.z - e.z;
      const d = Math.sqrt(dx * dx + dz * dz);

      // Roar pushback
      if (roarRadius > 0 && d < roarRadius) {
        const push = (roarRadius - d) * 0.4;
        e.x -= (dx / d) * push;
        e.z -= (dz / d) * push;
        needsRender = true;
      }

      // Bite damage
      if (biteRange > 0 && d < biteRange && now - e.lastAttack > 500) {
        const biteDmg = (12 + biteLevel * 8) * (1 + (stats.damage - 10) / 10);
        e.health -= biteDmg;
        e.lastAttack = now;
        if (e.health <= 0) {
          e.state = 'dead';
          onKill();
          return false;
        }
      }

      // Charge collision
      if (isCharging && d < 2.0) {
        e.health -= (30 + (stats.abilities.find(a => a.name === 'charge')?.level ?? 0) * 15) * chargeKnockback;
        const nx = dx / d, nz = dz / d;
        e.x -= nx * 3;
        e.z -= nz * 3;
        if (e.health <= 0) {
          e.state = 'dead';
          onKill();
          return false;
        }
      }

      // Move toward player
      if (d > 1.5) {
        e.x += (dx / d) * e.speed * 60 * delta;
        e.z += (dz / d) * e.speed * 60 * delta;
        needsRender = true;
      }

      // Attack player
      if (d < 1.8 && now - e.lastAttack > e.attackCooldown) {
        e.lastAttack = now;
        onHit(e.damage);
      }

      return true;
    });

    if (needsRender) forceRender(n => n + 1);
  });

  const isCharging = activeAbilityRef.current === 'charge';
  const isRoaring = activeAbilityRef.current === 'roar';

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[8, 12, 8]} intensity={1.4} castShadow />
      <pointLight position={[0, 6, 0]} intensity={0.4} color="#ffd580" />
      <Arena />
      <group ref={playerMesh}>
        <BullMesh isCharging={isCharging} isRoaring={isRoaring} />
        <ChargeFX active={isCharging} />
      </group>
      {enemiesRef.current.map(enemy => (
        <group key={enemy.id}>
          <EnemyMesh enemy={enemy} />
          <HealthBar3D x={enemy.x} z={enemy.z} hp={enemy.health} maxHp={enemy.maxHealth} />
        </group>
      ))}
    </>
  );
}

// ─── Ability Bar UI ───────────────────────────────────────────────────────────
function AbilityBar({
  abilities, activeAbility, onUse,
}: {
  abilities: Ability[]; activeAbility: AbilityName | null; onUse: (name: AbilityName) => void;
}) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 100);
    return () => clearInterval(id);
  }, []);

  const now = performance.now();

  return (
    <div className="flex gap-3">
      {abilities.map((ab) => {
        if (ab.level === 0) return null;
        const elapsed = now - ab.lastUsedAt;
        const pct = Math.min(1, elapsed / ab.cooldownMs);
        const ready = pct >= 1;
        const isActive = activeAbility === ab.name;
        const keyMap: Record<AbilityName, string> = { charge: 'Q', roar: 'E', bite: 'R' };

        return (
          <button
            key={ab.name}
            onClick={() => ready && onUse(ab.name)}
            className={`relative flex flex-col items-center p-3 rounded-xl border-2 transition-all min-w-[72px]
              ${isActive ? 'border-yellow-400 bg-yellow-400/20 scale-110' : ready ? 'border-primary/60 bg-card hover:bg-primary/10' : 'border-border/40 bg-card/50 opacity-60 cursor-not-allowed'}`}
          >
            <span className="text-2xl">{ab.emoji}</span>
            <span className="text-xs font-display text-foreground mt-0.5">{ab.label}</span>
            <span className="text-[10px] text-muted-foreground font-display">[{keyMap[ab.name]}]</span>
            {!ready && (
              <div
                className="absolute bottom-0 left-0 h-1 rounded-b-xl bg-primary transition-all"
                style={{ width: `${pct * 100}%` }}
              />
            )}
            {ab.level > 1 && (
              <div className="absolute top-1 right-1 flex gap-0.5">
                {Array.from({ length: ab.level }).map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-accent" />
                ))}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Upgrade Screen ───────────────────────────────────────────────────────────
function UpgradeScreen({ stats, onUpgrade, onContinue }: {
  stats: PlayerStats; onUpgrade: (ability: AbilityName) => void; onContinue: () => void;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/75 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl p-8 max-w-lg w-full mx-4 space-y-6">
        <div className="text-center">
          <h2 className="font-display text-4xl text-primary">WAVE CLEARED!</h2>
          <p className="text-muted-foreground font-display text-lg mt-1">
            UPGRADE POINTS: <span className="text-accent">{stats.upgradePoints}</span>
          </p>
        </div>
        <div className="grid gap-4">
          {stats.abilities.map((ab) => {
            const maxed = ab.level >= 3;
            const canUpgrade = stats.upgradePoints > 0 && !maxed;
            return (
              <div key={ab.name} className={`border rounded-xl p-4 flex items-center gap-4
                ${maxed ? 'border-accent/50 bg-accent/5' : 'border-border bg-card'}`}>
                <span className="text-4xl">{ab.emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-xl text-foreground">{ab.label}</span>
                    <div className="flex gap-1">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className={`w-3 h-3 rounded-full border ${i < ab.level ? 'bg-accent border-accent' : 'border-border'}`} />
                      ))}
                    </div>
                    {maxed && <span className="text-xs font-display text-accent px-2 py-0.5 rounded-full border border-accent/40 bg-accent/10">MAX</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{ab.description}</p>
                  {ab.level === 0 && <p className="text-xs text-primary font-display mt-1">UNLOCK THIS ABILITY</p>}
                  {ab.level >= 1 && !maxed && <p className="text-xs text-muted-foreground font-display mt-1">LEVEL {ab.level} → {ab.level + 1}</p>}
                </div>
                <Button
                  disabled={!canUpgrade}
                  onClick={() => canUpgrade && onUpgrade(ab.name)}
                  variant={ab.level === 0 ? 'default' : 'outline'}
                  size="sm"
                  className="font-display shrink-0"
                >
                  {maxed ? 'MAXED' : ab.level === 0 ? 'UNLOCK' : 'UPGRADE'}
                </Button>
              </div>
            );
          })}
        </div>
        <Button onClick={onContinue} className="w-full font-display text-lg h-12">
          FIGHT WAVE {stats.wave + 1} →
        </Button>
      </div>
    </div>
  );
}

// ─── HUD ──────────────────────────────────────────────────────────────────────
function HUD({ stats, enemies, activeAbility, onUseAbility }: {
  stats: PlayerStats; enemies: Enemy[]; activeAbility: AbilityName | null;
  onUseAbility: (name: AbilityName) => void;
}) {
  const hpPct = stats.health / stats.maxHealth;
  const hpColor = hpPct > 0.5 ? 'bg-green-500' : hpPct > 0.25 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col">
      {/* Top bar */}
      <div className="flex items-start justify-between p-4">
        <div className="space-y-1 min-w-[180px]">
          <div className="font-display text-xs text-muted-foreground">BULL HEALTH</div>
          <div className="h-4 bg-muted rounded-full overflow-hidden w-48">
            <div className={`h-full ${hpColor} transition-all rounded-full`} style={{ width: `${hpPct * 100}%` }} />
          </div>
          <div className="font-display text-sm text-foreground">{Math.ceil(stats.health)} / {stats.maxHealth}</div>
        </div>
        <div className="text-right space-y-0.5">
          <div className="font-display text-2xl text-primary">WAVE {stats.wave}</div>
          <div className="font-display text-sm text-muted-foreground">ENEMIES: {enemies.filter(e => e.state !== 'dead').length}</div>
          <div className="font-display text-sm text-accent">KILLS: {stats.kills}</div>
        </div>
      </div>

      {/* Bottom ability bar */}
      <div className="mt-auto p-4 flex justify-center pointer-events-auto">
        <AbilityBar abilities={stats.abilities} activeAbility={activeAbility} onUse={onUseAbility} />
      </div>
    </div>
  );
}

// ─── Main Game ────────────────────────────────────────────────────────────────
const INITIAL_ABILITIES: Ability[] = [
  {
    name: 'charge', label: 'CHARGE', emoji: '⚡', level: 1,
    description: 'Unleash a powerful forward charge, bulldozing enemies in your path.',
    cooldownMs: 3000, lastUsedAt: -99999,
  },
  {
    name: 'roar', label: 'ROAR', emoji: '🔊', level: 0,
    description: 'Roar to stun and push back all nearby enemies.',
    cooldownMs: 5000, lastUsedAt: -99999,
  },
  {
    name: 'bite', label: 'BITE', emoji: '🦷', level: 0,
    description: 'Snap your teeth for heavy close-range damage.',
    cooldownMs: 2000, lastUsedAt: -99999,
  },
];

export default function BullGame() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<GamePhase>('start');
  const [stats, setStats] = useState<PlayerStats>({
    health: INITIAL_HEALTH, maxHealth: INITIAL_HEALTH,
    speed: 0.055, damage: 10,
    abilities: INITIAL_ABILITIES,
    upgradePoints: 0, wave: 1, kills: 0,
  });
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [activeAbility, setActiveAbility] = useState<AbilityName | null>(null);

  const statsRef = useRef(stats);
  const enemiesRef = useRef(enemies);
  const playerRef = useRef({ x: 0, z: 0, angle: 0 });
  const activeAbilityRef = useRef<AbilityName | null>(null);
  const keys = useRef<Set<string>>(new Set());
  const abilityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { statsRef.current = stats; }, [stats]);
  useEffect(() => { enemiesRef.current = enemies; }, [enemies]);
  useEffect(() => { activeAbilityRef.current = activeAbility; }, [activeAbility]);

  const spawnWave = useCallback((wave: number) => {
    const count = waveEnemyCount(wave);
    const newEnemies = Array.from({ length: count }, () => spawnEnemy(wave));
    setEnemies(newEnemies);
    enemiesRef.current = newEnemies;
  }, []);

  const handleHit = useCallback((dmg: number) => {
    setStats(s => {
      const newHp = Math.max(0, s.health - dmg);
      if (newHp <= 0) setPhase('gameover');
      return { ...s, health: newHp };
    });
  }, []);

  const handleKill = useCallback(() => {
    setStats(s => ({ ...s, kills: s.kills + 1 }));
    setEnemies(prev => {
      const alive = prev.filter(e => e.state !== 'dead' && e.health > 0);
      if (alive.length === 0) {
        setTimeout(() => setPhase('upgrade'), 500);
      }
      return prev;
    });
  }, []);

  // Check wave cleared continuously
  useEffect(() => {
    if (phase !== 'playing') return;
    if (enemies.length > 0 && enemies.every(e => e.health <= 0 || e.state === 'dead')) {
      setPhase('upgrade');
    }
  }, [enemies, phase]);

  const useAbility = useCallback((name: AbilityName) => {
    const st = statsRef.current;
    const ab = st.abilities.find(a => a.name === name);
    if (!ab || ab.level === 0) return;
    const now = performance.now();
    if (now - ab.lastUsedAt < ab.cooldownMs) return;

    // Update cooldown timestamp
    setStats(s => ({
      ...s,
      abilities: s.abilities.map(a => a.name === name ? { ...a, lastUsedAt: now } : a),
    }));
    statsRef.current = {
      ...statsRef.current,
      abilities: statsRef.current.abilities.map(a => a.name === name ? { ...a, lastUsedAt: now } : a),
    };

    setActiveAbility(name);
    activeAbilityRef.current = name;
    if (abilityTimeoutRef.current) clearTimeout(abilityTimeoutRef.current);
    abilityTimeoutRef.current = setTimeout(() => {
      setActiveAbility(null);
      activeAbilityRef.current = null;
    }, 800);
  }, []);

  // Keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current.add(e.key);
      if (e.key === 'q' || e.key === 'Q') useAbility('charge');
      if (e.key === 'e' || e.key === 'E') useAbility('roar');
      if (e.key === 'r' || e.key === 'R') useAbility('bite');
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [useAbility]);

  const startGame = () => {
    const initialStats: PlayerStats = {
      health: INITIAL_HEALTH, maxHealth: INITIAL_HEALTH,
      speed: 0.055, damage: 10,
      abilities: INITIAL_ABILITIES.map(a => ({ ...a, lastUsedAt: -99999 })),
      upgradePoints: 0, wave: 1, kills: 0,
    };
    setStats(initialStats);
    statsRef.current = initialStats;
    playerRef.current = { x: 0, z: 0, angle: 0 };
    spawnWave(1);
    setPhase('playing');
  };

  const handleUpgrade = (name: AbilityName) => {
    setStats(s => {
      if (s.upgradePoints <= 0) return s;
      return {
        ...s,
        upgradePoints: s.upgradePoints - 1,
        abilities: s.abilities.map(a =>
          a.name === name && a.level < 3 ? { ...a, level: a.level + 1 } : a
        ),
      };
    });
  };

  const handleContinue = () => {
    setStats(s => {
      const nextWave = s.wave + 1;
      const healedHp = Math.min(s.maxHealth, s.health + s.maxHealth * 0.3);
      const updated = { ...s, wave: nextWave, health: healedHp };
      statsRef.current = updated;
      spawnWave(nextWave);
      return updated;
    });
    setPhase('playing');
  };

  return (
    <div className="relative w-full h-screen bg-background overflow-hidden">
      {/* Canvas */}
      <Canvas
        shadows
        camera={{ position: [0, 9, 14], fov: 60 }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <World
          playerRef={playerRef}
          enemiesRef={enemiesRef}
          statsRef={statsRef}
          activeAbilityRef={activeAbilityRef}
          keys={keys}
          onHit={handleHit}
          onKill={handleKill}
          phase={phase}
        />
      </Canvas>

      {/* Start Screen */}
      {phase === 'start' && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/80">
          <div className="text-center space-y-6 p-8 max-w-sm">
            <div className="text-8xl">🐂</div>
            <h1 className="font-display text-6xl text-primary">BULL ARENA</h1>
            <p className="text-muted-foreground font-display text-base">
              FIGHT WAVES OF WILD ANIMALS. UPGRADE YOUR ABILITIES. SURVIVE.
            </p>
            <div className="text-left space-y-1 text-sm text-muted-foreground bg-card border border-border rounded-xl p-4">
              <p><span className="text-foreground font-display">WASD / ARROWS</span> — MOVE & TURN</p>
              <p><span className="text-foreground font-display">Q</span> — CHARGE ATTACK</p>
              <p><span className="text-foreground font-display">E</span> — ROAR (UNLOCK)</p>
              <p><span className="text-foreground font-display">R</span> — BITE (UNLOCK)</p>
            </div>
            <Button onClick={startGame} className="w-full h-14 font-display text-xl">
              ENTER THE ARENA
            </Button>
            <button onClick={() => navigate('/')} className="text-muted-foreground font-display text-sm hover:text-foreground transition-colors">
              ← BACK TO ARCADE
            </button>
          </div>
        </div>
      )}

      {/* HUD */}
      {phase === 'playing' && (
        <HUD
          stats={stats}
          enemies={enemies}
          activeAbility={activeAbility}
          onUseAbility={useAbility}
        />
      )}

      {/* Upgrade Screen */}
      {phase === 'upgrade' && (
        <UpgradeScreen
          stats={{ ...stats, upgradePoints: stats.upgradePoints + 1 }}
          onUpgrade={handleUpgrade}
          onContinue={handleContinue}
        />
      )}

      {/* Game Over */}
      {phase === 'gameover' && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/85">
          <div className="text-center space-y-6 p-8">
            <div className="text-7xl">💀</div>
            <h2 className="font-display text-6xl text-destructive">DEFEATED</h2>
            <p className="text-muted-foreground font-display">
              WAVE {stats.wave} · {stats.kills} KILLS
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={startGame} className="font-display text-lg h-12 px-8">
                FIGHT AGAIN
              </Button>
              <Button variant="outline" onClick={() => navigate('/')} className="font-display text-lg h-12 px-8">
                ARCADE
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Back button during play */}
      {phase === 'playing' && (
        <button
          onClick={() => navigate('/')}
          className="absolute top-4 left-1/2 -translate-x-1/2 text-muted-foreground font-display text-xs hover:text-foreground transition-colors z-10"
        >
          ← ARCADE
        </button>
      )}
    </div>
  );
}
