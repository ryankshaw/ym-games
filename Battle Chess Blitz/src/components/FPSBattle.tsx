import { useRef, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { ChessPiece, PieceType, PIECE_VALUES } from '@/game/chessLogic';
import { WEAPONS, WeaponConfig, SpecialType } from '@/game/weaponSystem';

// ─── Types ───────────────────────────────────────────────────────────────────

interface EnemyState {
  id: number;
  pos: THREE.Vector3;
  health: number;
  maxHealth: number;
  speed: number;
  active: boolean;
  hitFlash: number;
  type: PieceType;
  color: string;
}

interface BulletState {
  id: number;
  pos: THREE.Vector3;
  dir: THREE.Vector3;
  speed: number;
  size: number;
  color: string;
  life: number;
  damage: number;
  aoeRadius: number;
  piercing: boolean;
  isPower: boolean;
}

interface SpecialEffect {
  type: SpecialType;
  timer: number;
  duration: number;
  pos?: THREE.Vector3;
  dir?: THREE.Vector3;
}

interface GameState {
  playerPos: THREE.Vector3;
  yaw: number;
  pitch: number;
  health: number;
  ammo: number;
  reloading: boolean;
  reloadTimer: number;
  shotCooldown: number;
  specialCooldown: number;
  shielded: boolean;
  fortressMode: boolean;
  powerShots: number;
  timeLeft: number;
  gameOver: boolean;
  won: boolean;
  kills: number;
  keys: { w: boolean; a: boolean; s: boolean; d: boolean };
  enemies: EnemyState[];
  bullets: BulletState[];
  specialEffect: SpecialEffect | null;
  muzzleFlash: number;
  hudTimer: number;
  isMoving: boolean;
  screenFlash: number;
  screenFlashColor: string;
}

interface HudData {
  health: number;
  ammo: number;
  maxAmmo: number;
  reloading: boolean;
  reloadProgress: number;
  specialCooldown: number;
  specialMaxCooldown: number;
  timeLeft: number;
  kills: number;
  killsNeeded: number;
  shielded: boolean;
  fortressMode: boolean;
  powerShots: number;
  screenFlash: number;
  screenFlashColor: string;
}

// ─── Piece symbols ─────────────────────────────────────────────────────────
const PIECE_SYM: Record<PieceType, string> = {
  king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟',
};

// ─── Arena Environment ────────────────────────────────────────────────────
function Arena() {
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[60, 60, 30, 30]} />
        <meshStandardMaterial color="#0d1a0d" roughness={0.9} metalness={0.1} />
      </mesh>
      {/* Grid lines */}
      <gridHelper args={[60, 30, '#1a3a1a', '#0f280f']} position={[0, 0.01, 0]} />

      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 8, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#05080a" roughness={1} />
      </mesh>

      {/* Walls */}
      {[
        { pos: [0, 4, -30] as [number, number, number], rot: [0, 0, 0] as [number, number, number] },
        { pos: [0, 4, 30] as [number, number, number], rot: [0, Math.PI, 0] as [number, number, number] },
        { pos: [-30, 4, 0] as [number, number, number], rot: [0, Math.PI / 2, 0] as [number, number, number] },
        { pos: [30, 4, 0] as [number, number, number], rot: [0, -Math.PI / 2, 0] as [number, number, number] },
      ].map((w, i) => (
        <mesh key={i} position={w.pos} rotation={w.rot} receiveShadow>
          <planeGeometry args={[60, 8]} />
          <meshStandardMaterial color="#0a100a" roughness={1} />
        </mesh>
      ))}

      {/* Pillars */}
      {[[-12, -12], [12, -12], [-12, 12], [12, 12], [-20, 0], [20, 0], [0, -20], [0, 20]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.6, 0.8, 7, 8]} />
            <meshStandardMaterial color="#0e1a0e" roughness={0.8} metalness={0.3} />
          </mesh>
          {/* Torch glow */}
          <pointLight position={[0, 5, 0]} intensity={2} color="#ff6633" distance={10} decay={2} />
          <mesh position={[0, 5.2, 0]}>
            <sphereGeometry args={[0.2, 8, 8]} />
            <meshStandardMaterial color="#ff4400" emissive="#ff2200" emissiveIntensity={3} />
          </mesh>
        </group>
      ))}

      {/* Ambient particles / debris */}
      {Array.from({ length: 30 }).map((_, i) => {
        const x = (Math.random() - 0.5) * 50;
        const z = (Math.random() - 0.5) * 50;
        const y = Math.random() * 6;
        return (
          <mesh key={`p${i}`} position={[x, y, z]}>
            <boxGeometry args={[0.05, 0.05, 0.05]} />
            <meshStandardMaterial color="#334433" emissive="#112211" emissiveIntensity={0.5} />
          </mesh>
        );
      })}
    </group>
  );
}

// ─── Enemy 3D ──────────────────────────────────────────────────────────────
function Enemy3D({ enemy }: { enemy: EnemyState }) {
  const groupRef = useRef<THREE.Group>(null);
  const auraRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(Math.random() * Math.PI * 2);

  useFrame((_, delta) => {
    timeRef.current += delta;
    if (groupRef.current) {
      groupRef.current.position.set(enemy.pos.x, Math.sin(timeRef.current * 1.5) * 0.2, enemy.pos.z);
      groupRef.current.rotation.y += delta * 0.8;
    }
    if (auraRef.current) {
      const mat = auraRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.5 + Math.sin(timeRef.current * 3) * 0.3 + (enemy.hitFlash > 0 ? 2 : 0);
      const scale = 1 + Math.sin(timeRef.current * 2) * 0.05;
      auraRef.current.scale.setScalar(scale);
    }
  });

  const isWhite = enemy.color === 'white';
  const baseColor = isWhite ? '#d0c8b0' : '#2a1a5e';
  const emissiveColor = isWhite ? '#aa8800' : '#6633ff';
  const auraColor = isWhite ? '#ffcc44' : '#8844ff';
  const hpRatio = enemy.health / enemy.maxHealth;

  const PieceBody = () => {
    const props = { color: baseColor, emissive: emissiveColor, emissiveIntensity: 0.4, roughness: 0.3, metalness: 0.7 };
    switch (enemy.type) {
      case 'pawn': return (
        <group>
          <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.45, 0.55, 0.2, 16]} /><meshStandardMaterial {...props} /></mesh>
          <mesh position={[0, 0.55, 0]}><cylinderGeometry args={[0.25, 0.45, 0.45, 16]} /><meshStandardMaterial {...props} /></mesh>
          <mesh position={[0, 0.95, 0]}><sphereGeometry args={[0.32, 16, 16]} /><meshStandardMaterial {...props} /></mesh>
        </group>
      );
      case 'rook': return (
        <group>
          <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.55, 0.65, 0.2, 16]} /><meshStandardMaterial {...props} /></mesh>
          <mesh position={[0, 0.75, 0]}><cylinderGeometry args={[0.45, 0.55, 0.9, 16]} /><meshStandardMaterial {...props} /></mesh>
          <mesh position={[0, 1.35, 0]}><boxGeometry args={[1.0, 0.3, 1.0]} /><meshStandardMaterial {...props} /></mesh>
        </group>
      );
      case 'knight': return (
        <group>
          <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.5, 0.6, 0.2, 16]} /><meshStandardMaterial {...props} /></mesh>
          <mesh position={[0, 0.7, 0]}><cylinderGeometry args={[0.32, 0.5, 0.7, 16]} /><meshStandardMaterial {...props} /></mesh>
          <mesh position={[0.1, 1.3, 0]} rotation={[0.4, 0, 0.3]}><boxGeometry args={[0.5, 0.7, 0.35]} /><meshStandardMaterial {...props} /></mesh>
          <mesh position={[0.12, 1.65, 0.15]}><sphereGeometry args={[0.24, 12, 12]} /><meshStandardMaterial {...props} /></mesh>
        </group>
      );
      case 'bishop': return (
        <group>
          <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.5, 0.6, 0.2, 16]} /><meshStandardMaterial {...props} /></mesh>
          <mesh position={[0, 0.8, 0]}><cylinderGeometry args={[0.2, 0.5, 0.8, 16]} /><meshStandardMaterial {...props} /></mesh>
          <mesh position={[0, 1.35, 0]}><sphereGeometry args={[0.3, 16, 16]} /><meshStandardMaterial {...props} /></mesh>
          <mesh position={[0, 1.75, 0]}><coneGeometry args={[0.12, 0.38, 8]} /><meshStandardMaterial {...props} /></mesh>
        </group>
      );
      case 'queen': return (
        <group>
          <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.6, 0.7, 0.2, 16]} /><meshStandardMaterial {...props} /></mesh>
          <mesh position={[0, 0.85, 0]}><cylinderGeometry args={[0.3, 0.6, 0.8, 16]} /><meshStandardMaterial {...props} /></mesh>
          <mesh position={[0, 1.4, 0]}><sphereGeometry args={[0.42, 16, 16]} /><meshStandardMaterial {...props} /></mesh>
          {[0, 1, 2, 3, 4].map(i => (
            <mesh key={i} position={[Math.cos(i / 5 * Math.PI * 2) * 0.3, 1.92, Math.sin(i / 5 * Math.PI * 2) * 0.3]}>
              <sphereGeometry args={[0.1, 8, 8]} />
              <meshStandardMaterial color={isWhite ? '#ffcc44' : '#aa44ff'} emissive={isWhite ? '#ffaa00' : '#8822cc'} emissiveIntensity={1.5} />
            </mesh>
          ))}
        </group>
      );
      case 'king': return (
        <group>
          <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.6, 0.7, 0.2, 16]} /><meshStandardMaterial {...props} /></mesh>
          <mesh position={[0, 0.9, 0]}><cylinderGeometry args={[0.35, 0.6, 0.8, 16]} /><meshStandardMaterial {...props} /></mesh>
          <mesh position={[0, 1.45, 0]}><cylinderGeometry args={[0.45, 0.35, 0.25, 16]} /><meshStandardMaterial {...props} /></mesh>
          <mesh position={[0, 2.05, 0]}><boxGeometry args={[0.15, 0.72, 0.15]} /><meshStandardMaterial color={isWhite ? '#ffcc44' : '#cc2222'} emissive={isWhite ? '#ffaa00' : '#880000'} emissiveIntensity={1.5} /></mesh>
          <mesh position={[0, 2.25, 0]}><boxGeometry args={[0.45, 0.15, 0.15]} /><meshStandardMaterial color={isWhite ? '#ffcc44' : '#cc2222'} emissive={isWhite ? '#ffaa00' : '#880000'} emissiveIntensity={1.5} /></mesh>
        </group>
      );
    }
  };

  return (
    <group ref={groupRef} position={[enemy.pos.x, 0, enemy.pos.z]}>
      {/* Aura */}
      <mesh ref={auraRef}>
        <sphereGeometry args={[1.0, 16, 16]} />
        <meshStandardMaterial color={auraColor} emissive={auraColor} emissiveIntensity={0.5} transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>
      {/* Piece body */}
      <PieceBody />
      {/* Health bar (billboard) */}
      <Billboard position={[0, 2.5, 0]}>
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[1.4, 0.18]} />
          <meshBasicMaterial color="#111111" transparent opacity={0.8} />
        </mesh>
        <mesh position={[(-0.7 + 0.7 * hpRatio) - 0.7 + 0.7 * hpRatio, 0, 0.01]}>
          <planeGeometry args={[1.38 * hpRatio, 0.15]} />
          <meshBasicMaterial color={hpRatio > 0.5 ? '#33ff33' : hpRatio > 0.25 ? '#ffaa00' : '#ff3333'} />
        </mesh>
        <Text position={[0, 0, 0.02]} fontSize={0.12} color="white" anchorX="center" anchorY="middle">
          {PIECE_SYM[enemy.type]}
        </Text>
      </Billboard>
      {/* Point light from piece */}
      <pointLight position={[0, 1, 0]} intensity={1.5} color={auraColor} distance={5} decay={2} />
    </group>
  );
}

// ─── Bullet 3D ─────────────────────────────────────────────────────────────
function Bullet3D({ bullet }: { bullet: BulletState }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.copy(bullet.pos);
    }
  });
  const size = bullet.isPower ? bullet.size * 1.6 : bullet.size;
  const color = bullet.isPower ? '#ffee44' : bullet.color;
  return (
    <mesh ref={meshRef} position={bullet.pos.toArray()}>
      <sphereGeometry args={[size, 8, 8]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={3} />
      <pointLight intensity={1.5} color={color} distance={4} decay={2} />
    </mesh>
  );
}

// ─── Special Effects ────────────────────────────────────────────────────────
function ShieldEffect({ playerPos, active }: { playerPos: THREE.Vector3; active: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.position.copy(playerPos).setY(1.7);
      if (active) {
        const mat = meshRef.current.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 0.5 + Math.sin(Date.now() * 0.005) * 0.3;
      }
    }
  });
  if (!active) return null;
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[2.2, 24, 24]} />
      <meshStandardMaterial color="#4488ff" emissive="#2244ff" emissiveIntensity={0.5} transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

function BeamEffect({ active, cameraPos, cameraDir, timer, duration }: { active: boolean; cameraPos: THREE.Vector3; cameraDir: THREE.Vector3; timer: number; duration: number }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!groupRef.current || !active) return;
    const length = 35;
    const mid = cameraPos.clone().add(cameraDir.clone().multiplyScalar(length / 2));
    groupRef.current.position.copy(mid);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), cameraDir.clone().normalize());
    groupRef.current.quaternion.copy(q);
    const alpha = timer / duration;
    (groupRef.current.children[0] as THREE.Mesh).scale.setScalar(alpha);
  });
  if (!active) return null;
  return (
    <group ref={groupRef}>
      <mesh>
        <cylinderGeometry args={[0.15, 0.15, 35, 8]} />
        <meshStandardMaterial color="#ddaaff" emissive="#cc88ff" emissiveIntensity={4} transparent opacity={0.9} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.5, 0.5, 35, 8]} />
        <meshStandardMaterial color="#ffffff" emissive="#cc88ff" emissiveIntensity={2} transparent opacity={0.2} />
      </mesh>
    </group>
  );
}

function AOEEffect({ active, pos, progress }: { active: boolean; pos: THREE.Vector3; progress: number }) {
  if (!active) return null;
  const radius = progress * 18;
  return (
    <group position={pos.toArray()}>
      <mesh>
        <torusGeometry args={[radius, 0.4, 8, 48]} />
        <meshStandardMaterial color="#ff44aa" emissive="#ff22aa" emissiveIntensity={3 * (1 - progress)} transparent opacity={0.9 * (1 - progress)} />
      </mesh>
      <mesh>
        <torusGeometry args={[radius * 0.6, 0.2, 8, 32]} />
        <meshStandardMaterial color="#ff88cc" emissive="#ff44aa" emissiveIntensity={2 * (1 - progress)} transparent opacity={0.6 * (1 - progress)} />
      </mesh>
      <pointLight intensity={8 * (1 - progress)} color="#ff44aa" distance={radius * 2} decay={1} />
    </group>
  );
}

function FortressEffect({ playerPos, active }: { playerPos: THREE.Vector3; active: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (meshRef.current) meshRef.current.position.copy(playerPos).setY(1.5);
  });
  if (!active) return null;
  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[3.5, 3.5, 3.5]} />
      <meshStandardMaterial color="#ff6600" emissive="#ff4400" emissiveIntensity={0.4} transparent opacity={0.18} side={THREE.DoubleSide} depthWrite={false} wireframe />
    </mesh>
  );
}

// ─── Weapon Model (first-person view) ─────────────────────────────────────
function WeaponModel({ weapon, firing, reloading }: { weapon: WeaponConfig; firing: boolean; reloading: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const bobTime = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    bobTime.current += delta;
    const bob = Math.sin(bobTime.current * 5) * 0.008;
    const sway = Math.sin(bobTime.current * 2.5) * 0.003;
    const reloadDrop = reloading ? Math.sin(Date.now() * 0.003) * 0.05 : 0;
    const kickback = firing ? -0.05 : 0;

    const offset = new THREE.Vector3(0.38, -0.28 + bob + reloadDrop, -0.65 + kickback);
    offset.applyQuaternion(camera.quaternion);
    groupRef.current.position.copy(camera.position).add(offset);

    const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    groupRef.current.rotation.set(euler.x + sway, euler.y, euler.z);
  });

  const wc = weapon.weaponColor;
  const ac = weapon.accentColor;

  const WeaponShape = () => {
    switch (weapon.weaponShape) {
      case 'pistol': return (
        <group>
          <mesh position={[0, 0, 0]}><boxGeometry args={[0.08, 0.12, 0.35]} /><meshStandardMaterial color={wc} metalness={0.9} roughness={0.2} /></mesh>
          <mesh position={[0, 0.03, -0.22]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.025, 0.025, 0.3, 8]} /><meshStandardMaterial color={ac} metalness={1} roughness={0.1} /></mesh>
          <mesh position={[0, -0.1, 0.05]}><boxGeometry args={[0.07, 0.12, 0.15]} /><meshStandardMaterial color={wc} roughness={0.5} /></mesh>
        </group>
      );
      case 'smg': return (
        <group>
          {[-0.07, 0.07].map((x, i) => (
            <group key={i} position={[x, 0, 0]}>
              <mesh><boxGeometry args={[0.055, 0.08, 0.28]} /><meshStandardMaterial color={wc} metalness={0.9} roughness={0.2} /></mesh>
              <mesh position={[0, 0.025, -0.17]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.018, 0.018, 0.22, 8]} /><meshStandardMaterial color={ac} metalness={1} /></mesh>
              <mesh position={[0, -0.07, 0.03]}><boxGeometry args={[0.05, 0.09, 0.1]} /><meshStandardMaterial color="#222222" roughness={0.7} /></mesh>
            </group>
          ))}
        </group>
      );
      case 'sniper': return (
        <group>
          <mesh position={[0, 0, 0]}><boxGeometry args={[0.06, 0.1, 0.85]} /><meshStandardMaterial color={wc} metalness={0.7} roughness={0.3} /></mesh>
          <mesh position={[0, 0.025, -0.5]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.018, 0.018, 0.8, 8]} /><meshStandardMaterial color={ac} metalness={1} roughness={0.05} /></mesh>
          <mesh position={[0, 0.06, 0.1]}><boxGeometry args={[0.04, 0.06, 0.22]} /><meshStandardMaterial color={ac} emissive={ac} emissiveIntensity={0.5} /></mesh>
          <mesh position={[0, -0.09, 0.15]}><boxGeometry args={[0.05, 0.1, 0.18]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
        </group>
      );
      case 'shotgun': return (
        <group>
          <mesh position={[0, 0, 0]}><boxGeometry args={[0.14, 0.1, 0.55]} /><meshStandardMaterial color={wc} metalness={0.6} roughness={0.4} /></mesh>
          {[-0.03, 0.03].map((y, i) => (
            <mesh key={i} position={[0, y, -0.32]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.025, 0.025, 0.42, 8]} /><meshStandardMaterial color={ac} metalness={1} /></mesh>
          ))}
          <mesh position={[0, -0.1, 0.1]}><boxGeometry args={[0.09, 0.1, 0.25]} /><meshStandardMaterial color="#4a2200" roughness={0.8} /></mesh>
        </group>
      );
      case 'cannon': return (
        <group>
          <mesh position={[0, 0, 0]}><sphereGeometry args={[0.13, 12, 12]} /><meshStandardMaterial color={wc} metalness={0.8} emissive={ac} emissiveIntensity={0.4} /></mesh>
          <mesh position={[0, 0, -0.18]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.06, 0.09, 0.28, 12]} /><meshStandardMaterial color={ac} metalness={1} emissive={ac} emissiveIntensity={0.5} /></mesh>
          <mesh position={[0, -0.09, 0.08]}><boxGeometry args={[0.1, 0.09, 0.2]} /><meshStandardMaterial color={wc} /></mesh>
        </group>
      );
      case 'revolver': return (
        <group>
          <mesh position={[0, 0, 0]}><boxGeometry args={[0.09, 0.14, 0.32]} /><meshStandardMaterial color={wc} metalness={0.9} roughness={0.15} /></mesh>
          <mesh position={[0, 0.035, 0.02]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.055, 0.055, 0.07, 8]} /><meshStandardMaterial color={ac} metalness={1} emissive={ac} emissiveIntensity={0.3} /></mesh>
          <mesh position={[0, 0.04, -0.22]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.022, 0.022, 0.3, 8]} /><meshStandardMaterial color={ac} metalness={1} roughness={0.05} /></mesh>
          <mesh position={[0, -0.1, 0.04]}><boxGeometry args={[0.08, 0.12, 0.14]} /><meshStandardMaterial color="#1a1008" roughness={0.8} /></mesh>
        </group>
      );
    }
  };

  return (
    <group ref={groupRef}>
      <WeaponShape />
      {firing && (
        <pointLight position={[0, 0, -0.3]} intensity={3} color={weapon.bulletColor} distance={3} decay={2} />
      )}
    </group>
  );
}

// ─── Battle Scene ──────────────────────────────────────────────────────────
interface BattleSceneProps {
  weapon: WeaponConfig;
  killsNeeded: number;
  defenderType: PieceType;
  defenderColor: string;
  onEnd: (won: boolean) => void;
  onHudUpdate: (data: HudData) => void;
}

function BattleScene({ weapon, killsNeeded, defenderType, defenderColor, onEnd, onHudUpdate }: BattleSceneProps) {
  const { camera, gl } = useThree();
  const gsRef = useRef<GameState>({
    playerPos: new THREE.Vector3(0, 0, 0),
    yaw: 0,
    pitch: 0,
    health: 100,
    ammo: weapon.maxAmmo,
    reloading: false,
    reloadTimer: 0,
    shotCooldown: 0,
    specialCooldown: 0,
    shielded: false,
    fortressMode: false,
    powerShots: 0,
    timeLeft: 25,
    gameOver: false,
    won: false,
    kills: 0,
    keys: { w: false, a: false, s: false, d: false },
    enemies: [],
    bullets: [],
    specialEffect: null,
    muzzleFlash: 0,
    hudTimer: 0,
    isMoving: false,
    screenFlash: 0,
    screenFlashColor: '#ffffff',
  });
  const bulletIdRef = useRef(0);
  const enemyIdRef = useRef(0);
  const endedRef = useRef(false);
  const [renderData, setRenderData] = useState<{
    enemies: EnemyState[];
    bullets: BulletState[];
    shielded: boolean;
    fortressMode: boolean;
    specialEffect: SpecialEffect | null;
    firing: boolean;
    reloading: boolean;
  }>({ enemies: [], bullets: [], shielded: false, fortressMode: false, specialEffect: null, firing: false, reloading: false });
  const renderTimer = useRef(0);
  const tempV = useRef(new THREE.Vector3());
  const tempV2 = useRef(new THREE.Vector3());
  const lockedRef = useRef(false);

  const spawnEnemy = useCallback(() => {
    const gs = gsRef.current;
    const angle = Math.random() * Math.PI * 2;
    const dist = 12 + Math.random() * 6;
    gs.enemies.push({
      id: enemyIdRef.current++,
      pos: new THREE.Vector3(gs.playerPos.x + Math.cos(angle) * dist, 0, gs.playerPos.z + Math.sin(angle) * dist),
      health: weapon.enemyHealth,
      maxHealth: weapon.enemyHealth,
      speed: weapon.enemySpeed * (0.8 + Math.random() * 0.5),
      active: true,
      hitFlash: 0,
      type: defenderType,
      color: defenderColor,
    });
  }, [weapon, defenderType, defenderColor]);

  const activateSpecial = useCallback(() => {
    const gs = gsRef.current;
    if (gs.specialCooldown > 0 || gs.gameOver) return;
    gs.specialCooldown = weapon.specialCooldown;

    switch (weapon.specialType) {
      case 'shield':
        gs.shielded = true;
        gs.specialEffect = { type: 'shield', timer: weapon.specialDuration, duration: weapon.specialDuration };
        gs.screenFlash = 0.4; gs.screenFlashColor = '#4488ff';
        setTimeout(() => { gsRef.current.shielded = false; }, weapon.specialDuration * 1000);
        break;
      case 'dash': {
        const fwd = tempV.current.set(-Math.sin(gs.yaw), 0, -Math.cos(gs.yaw)).normalize().multiplyScalar(8);
        gs.playerPos.add(fwd);
        gs.screenFlash = 0.6; gs.screenFlashColor = '#88ddff';
        break;
      }
      case 'beam': {
        const beamDir = tempV.current.set(-Math.sin(gs.yaw) * Math.cos(gs.pitch), Math.sin(-gs.pitch), -Math.cos(gs.yaw) * Math.cos(gs.pitch)).normalize();
        gs.specialEffect = {
          type: 'beam',
          timer: weapon.specialDuration,
          duration: weapon.specialDuration,
          pos: gs.playerPos.clone().add(new THREE.Vector3(0, 1.7, 0)),
          dir: beamDir.clone(),
        };
        gs.screenFlash = 0.5; gs.screenFlashColor = '#ddaaff';
        // Damage all enemies in beam path
        for (const e of gs.enemies) {
          if (!e.active) continue;
          const toE = e.pos.clone().sub(gs.playerPos).normalize();
          const dot = toE.dot(beamDir);
          if (dot > 0.92) { e.health = 0; e.active = false; gs.kills++; spawnEnemy(); }
        }
        break;
      }
      case 'fortress':
        gs.fortressMode = true;
        gs.specialEffect = { type: 'fortress', timer: weapon.specialDuration, duration: weapon.specialDuration };
        gs.screenFlash = 0.4; gs.screenFlashColor = '#ff8844';
        setTimeout(() => { gsRef.current.fortressMode = false; }, weapon.specialDuration * 1000);
        break;
      case 'aoe':
        gs.specialEffect = { type: 'aoe', timer: weapon.specialDuration, duration: weapon.specialDuration, pos: gs.playerPos.clone() };
        gs.screenFlash = 0.8; gs.screenFlashColor = '#ff44aa';
        for (const e of gs.enemies) {
          if (!e.active) continue;
          e.health -= 80;
          if (e.health <= 0) { e.active = false; gs.kills++; if (gs.kills < killsNeeded) spawnEnemy(); }
        }
        break;
      case 'power':
        gs.powerShots = 4;
        gs.specialEffect = { type: 'power', timer: weapon.specialDuration, duration: weapon.specialDuration };
        gs.screenFlash = 0.4; gs.screenFlashColor = '#ffee44';
        break;
    }
  }, [weapon, killsNeeded, spawnEnemy]);

  const shoot = useCallback(() => {
    const gs = gsRef.current;
    if (gs.gameOver || gs.shotCooldown > 0 || gs.reloading || gs.ammo <= 0) return;
    gs.ammo--;
    const effectiveCooldown = gs.fortressMode ? weapon.cooldown / 3 : weapon.cooldown;
    gs.shotCooldown = effectiveCooldown;
    gs.muzzleFlash = 0.08;

    const pellets = weapon.pellets;
    for (let p = 0; p < pellets; p++) {
      const spread = weapon.spread;
      const dir = new THREE.Vector3(
        -Math.sin(gs.yaw) * Math.cos(gs.pitch) + (Math.random() - 0.5) * spread,
        Math.sin(-gs.pitch) + (Math.random() - 0.5) * spread * 0.5,
        -Math.cos(gs.yaw) * Math.cos(gs.pitch) + (Math.random() - 0.5) * spread,
      ).normalize();

      gs.bullets.push({
        id: bulletIdRef.current++,
        pos: gs.playerPos.clone().add(new THREE.Vector3(0, 1.7, 0)),
        dir,
        speed: weapon.bulletSpeed,
        size: weapon.bulletSize,
        color: weapon.bulletColor,
        life: 3.0,
        damage: gs.powerShots > 0 ? weapon.damage * 3 : weapon.damage,
        aoeRadius: weapon.aoeRadius,
        piercing: weapon.piercing || (gs.powerShots > 0),
        isPower: gs.powerShots > 0,
      });
    }
    if (gs.powerShots > 0) gs.powerShots--;
    if (gs.ammo <= 0) { gs.reloading = true; gs.reloadTimer = weapon.reloadTime; }
  }, [weapon]);

  // Setup events
  useEffect(() => {
    const canvas = gl.domElement;
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const gs = gsRef.current;
      if (k === 'w' || k === 'arrowup') gs.keys.w = true;
      if (k === 'a' || k === 'arrowleft') gs.keys.a = true;
      if (k === 's' || k === 'arrowdown') gs.keys.s = true;
      if (k === 'd' || k === 'arrowright') gs.keys.d = true;
      if (k === 'r' && !gs.reloading && gs.ammo < weapon.maxAmmo) { gs.reloading = true; gs.reloadTimer = weapon.reloadTime; }
      if (e.key === 'Shift') { e.preventDefault(); activateSpecial(); }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const gs = gsRef.current;
      if (k === 'w' || k === 'arrowup') gs.keys.w = false;
      if (k === 'a' || k === 'arrowleft') gs.keys.a = false;
      if (k === 's' || k === 'arrowdown') gs.keys.s = false;
      if (k === 'd' || k === 'arrowright') gs.keys.d = false;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return;
      gsRef.current.yaw -= e.movementX * 0.002;
      gsRef.current.pitch = Math.max(-0.7, Math.min(0.7, gsRef.current.pitch - e.movementY * 0.002));
    };
    const onClick = () => {
      if (document.pointerLockElement !== canvas) {
        canvas.requestPointerLock();
      } else {
        shoot();
      }
    };
    const onLockChange = () => { lockedRef.current = document.pointerLockElement === canvas; };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('pointerlockchange', onLockChange);
    canvas.addEventListener('click', onClick);

    // Initial spawn
    for (let i = 0; i < Math.min(3, killsNeeded + 1); i++) spawnEnemy();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('pointerlockchange', onLockChange);
      canvas.removeEventListener('click', onClick);
      if (document.pointerLockElement === canvas) document.exitPointerLock();
    };
  }, [gl, shoot, activateSpecial, killsNeeded, spawnEnemy, weapon.maxAmmo, weapon.reloadTime]);

  useFrame((_, delta) => {
    const gs = gsRef.current;
    if (gs.gameOver) return;
    const dt = Math.min(delta, 0.05);

    // Timer
    gs.timeLeft -= dt;
    if (gs.timeLeft <= 0) { gs.gameOver = true; gs.won = false; }

    // Reload
    if (gs.reloading) {
      gs.reloadTimer -= dt;
      if (gs.reloadTimer <= 0) { gs.reloading = false; gs.ammo = weapon.maxAmmo; }
    }
    if (gs.shotCooldown > 0) gs.shotCooldown -= dt;
    if (gs.specialCooldown > 0) gs.specialCooldown -= dt;
    if (gs.muzzleFlash > 0) gs.muzzleFlash -= dt;
    if (gs.screenFlash > 0) gs.screenFlash -= dt * 3;

    // Special effect timers
    if (gs.specialEffect) {
      gs.specialEffect.timer -= dt;
      if (gs.specialEffect.timer <= 0) gs.specialEffect = null;
    }

    // Player movement
    const spd = 6 * dt;
    const fwd = tempV.current.set(-Math.sin(gs.yaw), 0, -Math.cos(gs.yaw));
    const right = tempV2.current.set(Math.cos(gs.yaw) * -1, 0, Math.sin(gs.yaw) * -1).negate();
    gs.isMoving = false;
    if (!gs.fortressMode) {
      if (gs.keys.w) { gs.playerPos.addScaledVector(fwd, spd); gs.isMoving = true; }
      if (gs.keys.s) { gs.playerPos.addScaledVector(fwd, -spd); gs.isMoving = true; }
      if (gs.keys.a) { gs.playerPos.addScaledVector(right, -spd); gs.isMoving = true; }
      if (gs.keys.d) { gs.playerPos.addScaledVector(right, spd); gs.isMoving = true; }
    }
    // Clamp to arena
    gs.playerPos.x = Math.max(-25, Math.min(25, gs.playerPos.x));
    gs.playerPos.z = Math.max(-25, Math.min(25, gs.playerPos.z));

    // Camera
    camera.position.set(gs.playerPos.x, 1.7, gs.playerPos.z);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = gs.yaw;
    camera.rotation.x = gs.pitch;

    // Move enemies
    for (const enemy of gs.enemies) {
      if (!enemy.active) continue;
      const dx = gs.playerPos.x - enemy.pos.x;
      const dz = gs.playerPos.z - enemy.pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > 0.8) {
        enemy.pos.x += (dx / dist) * enemy.speed * dt;
        enemy.pos.z += (dz / dist) * enemy.speed * dt;
      }
      if (enemy.hitFlash > 0) enemy.hitFlash -= dt * 5;
      // Melee damage
      if (dist < 1.8 && !gs.shielded) {
        gs.health -= 18 * dt;
        gs.screenFlash = Math.max(gs.screenFlash, 0.3);
        gs.screenFlashColor = '#ff2200';
        if (gs.health <= 0) { gs.health = 0; gs.gameOver = true; gs.won = false; }
      }
    }

    // Move and check bullets
    gs.bullets = gs.bullets.filter(b => {
      b.pos.addScaledVector(b.dir, b.speed * dt);
      b.life -= dt;
      if (b.life <= 0) return false;

      let hit = false;
      for (const enemy of gs.enemies) {
        if (!enemy.active) continue;
        const eDist = b.pos.distanceTo(enemy.pos.clone().add(new THREE.Vector3(0, 1.2, 0)));
        const hitRadius = b.aoeRadius > 0 ? b.aoeRadius : 0.9;
        if (eDist < hitRadius) {
          enemy.health -= b.damage;
          enemy.hitFlash = 1;
          if (enemy.health <= 0) {
            enemy.active = false;
            gs.kills++;
            gs.screenFlash = 0.2; gs.screenFlashColor = '#44ff44';
            if (gs.kills >= killsNeeded) { gs.gameOver = true; gs.won = true; }
            else spawnEnemy();
          }
          if (!b.piercing) { hit = true; break; }
        }
      }
      return !hit;
    });

    // Check game over
    if (gs.gameOver && !endedRef.current) {
      endedRef.current = true;
      setTimeout(() => onEnd(gs.won), 800);
    }

    // Render sync (30fps)
    renderTimer.current += dt;
    if (renderTimer.current > 1 / 30) {
      renderTimer.current = 0;
      setRenderData({
        enemies: gs.enemies.filter(e => e.active).map(e => ({ ...e, pos: e.pos.clone() })),
        bullets: gs.bullets.map(b => ({ ...b, pos: b.pos.clone() })),
        shielded: gs.shielded,
        fortressMode: gs.fortressMode,
        specialEffect: gs.specialEffect,
        firing: gs.muzzleFlash > 0,
        reloading: gs.reloading,
      });
      onHudUpdate({
        health: Math.ceil(Math.max(0, gs.health)),
        ammo: gs.ammo,
        maxAmmo: weapon.maxAmmo,
        reloading: gs.reloading,
        reloadProgress: gs.reloading ? 1 - gs.reloadTimer / weapon.reloadTime : 1,
        specialCooldown: Math.max(0, gs.specialCooldown),
        specialMaxCooldown: weapon.specialCooldown,
        timeLeft: Math.ceil(Math.max(0, gs.timeLeft)),
        kills: gs.kills,
        killsNeeded,
        shielded: gs.shielded,
        fortressMode: gs.fortressMode,
        powerShots: gs.powerShots,
        screenFlash: Math.max(0, gs.screenFlash),
        screenFlashColor: gs.screenFlashColor,
      });
    }
  });

  const se = renderData.specialEffect;

  return (
    <>
      <color attach="background" args={['#050a05']} />
      <fog attach="fog" args={['#050a08', 10, 40]} />
      <ambientLight intensity={0.15} color="#203020" />
      <directionalLight position={[0, 10, 0]} intensity={0.3} color="#204020" />
      <Arena />
      {renderData.enemies.map(e => <Enemy3D key={e.id} enemy={e} />)}
      {renderData.bullets.map(b => <Bullet3D key={b.id} bullet={b} />)}
      <ShieldEffect playerPos={gsRef.current.playerPos} active={renderData.shielded} />
      <FortressEffect playerPos={gsRef.current.playerPos} active={renderData.fortressMode} />
      {se?.type === 'beam' && se.pos && se.dir && (
        <BeamEffect active cameraPos={se.pos} cameraDir={se.dir} timer={se.timer} duration={se.duration} />
      )}
      {se?.type === 'aoe' && se.pos && (
        <AOEEffect active pos={se.pos} progress={1 - se.timer / se.duration} />
      )}
      <WeaponModel weapon={weapon} firing={renderData.firing} reloading={renderData.reloading} />
    </>
  );
}

// ─── HUD Overlay ─────────────────────────────────────────────────────────
function BattleHUD({ hud, weapon, locked }: { hud: HudData; weapon: WeaponConfig; locked: boolean }) {
  const hpColor = hud.health > 60 ? '#33ff33' : hud.health > 30 ? '#ffaa00' : '#ff3333';
  const specialReady = hud.specialCooldown <= 0;
  const specialProgress = specialReady ? 1 : 1 - hud.specialCooldown / hud.specialMaxCooldown;

  return (
    <div className="absolute inset-0 pointer-events-none font-fps" style={{ userSelect: 'none' }}>
      {/* Screen flash */}
      {hud.screenFlash > 0.05 && (
        <div className="absolute inset-0" style={{ background: hud.screenFlashColor, opacity: hud.screenFlash * 0.5, mixBlendMode: 'screen' }} />
      )}

      {/* Crosshair */}
      <div className="absolute" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
        <svg width="48" height="48" viewBox="0 0 48 48">
          <line x1="4" y1="24" x2="18" y2="24" stroke={specialReady ? '#44ff44' : '#33cc33'} strokeWidth="1.5" />
          <line x1="30" y1="24" x2="44" y2="24" stroke={specialReady ? '#44ff44' : '#33cc33'} strokeWidth="1.5" />
          <line x1="24" y1="4" x2="24" y2="18" stroke={specialReady ? '#44ff44' : '#33cc33'} strokeWidth="1.5" />
          <line x1="24" y1="30" x2="24" y2="44" stroke={specialReady ? '#44ff44' : '#33cc33'} strokeWidth="1.5" />
          <circle cx="24" cy="24" r="3" fill="none" stroke={specialReady ? '#44ff44' : '#33cc33'} strokeWidth="1.2" />
        </svg>
      </div>

      {/* Timer */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-center">
        <div className="text-3xl font-bold" style={{ color: hud.timeLeft <= 8 ? '#ff4444' : '#ffffff', textShadow: '0 0 10px currentColor' }}>
          {hud.timeLeft}s
        </div>
        <div className="text-xs mt-1" style={{ color: '#ffcc44' }}>
          KILLS: {hud.kills} / {hud.killsNeeded}
        </div>
        {/* Kill pips */}
        <div className="flex gap-1 justify-center mt-1">
          {Array.from({ length: hud.killsNeeded }).map((_, i) => (
            <div key={i} className="w-3 h-3 rounded-full border" style={{
              background: i < hud.kills ? '#44ff44' : 'transparent',
              borderColor: i < hud.kills ? '#44ff44' : '#555',
              boxShadow: i < hud.kills ? '0 0 6px #44ff44' : 'none',
            }} />
          ))}
        </div>
      </div>

      {/* Health */}
      <div className="absolute bottom-20 left-5">
        <div className="text-xs mb-1" style={{ color: '#aaaaaa' }}>HEALTH</div>
        <div className="w-40 h-4 rounded overflow-hidden" style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid #333' }}>
          <div className="h-full transition-all rounded" style={{ width: `${hud.health}%`, background: hpColor, boxShadow: `0 0 8px ${hpColor}` }} />
        </div>
        <div className="text-sm mt-0.5" style={{ color: hpColor }}>{hud.health}</div>
      </div>

      {/* Weapon info + Ammo */}
      <div className="absolute bottom-20 right-5 text-right">
        <div className="text-xs mb-1" style={{ color: weapon.accentColor }}>{weapon.name}</div>
        <div className="text-3xl font-bold" style={{ color: '#ffffff' }}>
          {hud.reloading ? (
            <span style={{ color: '#ffaa00', fontSize: '14px' }}>RELOADING...</span>
          ) : (
            <>{hud.ammo}<span className="text-base text-gray-500">/{hud.maxAmmo}</span></>
          )}
        </div>
        {hud.reloading && (
          <div className="w-24 h-2 ml-auto mt-1 rounded overflow-hidden" style={{ background: '#222' }}>
            <div className="h-full rounded" style={{ width: `${hud.reloadProgress * 100}%`, background: '#ffaa00' }} />
          </div>
        )}
      </div>

      {/* Special ability */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2">
        <div className="flex flex-col items-center gap-1">
          <div className="text-xs" style={{ color: specialReady ? weapon.accentColor : '#666666' }}>
            {specialReady ? '▶ SHIFT — ' : `⏳ `}{weapon.specialName}
          </div>
          {/* Cooldown bar */}
          <div className="w-48 h-3 rounded overflow-hidden" style={{ background: 'rgba(0,0,0,0.7)', border: `1px solid ${specialReady ? weapon.accentColor : '#333'}` }}>
            <div className="h-full rounded transition-all" style={{
              width: `${specialProgress * 100}%`,
              background: specialReady ? weapon.accentColor : '#444444',
              boxShadow: specialReady ? `0 0 8px ${weapon.accentColor}` : 'none',
            }} />
          </div>
          {/* Status badges */}
          <div className="flex gap-2 text-xs">
            {hud.shielded && <span style={{ color: '#4488ff', textShadow: '0 0 8px #4488ff' }}>🛡 SHIELDED</span>}
            {hud.fortressMode && <span style={{ color: '#ff8844', textShadow: '0 0 8px #ff8844' }}>🏰 FORTRESS</span>}
            {hud.powerShots > 0 && <span style={{ color: '#ffee44', textShadow: '0 0 8px #ffee44' }}>⚡ POWER ×{hud.powerShots}</span>}
          </div>
        </div>
      </div>

      {/* Pointer lock prompt */}
      {!locked && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center px-8 py-4 rounded" style={{ background: 'rgba(0,0,0,0.85)', border: '1px solid #446644' }}>
            <div className="text-lg" style={{ color: '#44ff44' }}>CLICK TO AIM & ENGAGE</div>
            <div className="text-xs mt-1" style={{ color: '#888' }}>Move: WASD / Arrows  ·  Aim: Mouse  ·  Shoot: Click  ·  Reload: R  ·  Special: Shift</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main FPSBattle component ──────────────────────────────────────────────
interface FPSBattleProps {
  attackingPiece: ChessPiece;
  defendingPiece: ChessPiece;
  onBattleEnd: (attackerWins: boolean) => void;
}

export default function FPSBattle({ attackingPiece, defendingPiece, onBattleEnd }: FPSBattleProps) {
  const [phase, setPhase] = useState<'intro' | 'battle' | 'result'>('intro');
  const [resultWon, setResultWon] = useState(false);
  const [pointerLocked, setPointerLocked] = useState(false);
  const [hudData, setHudData] = useState<HudData>({
    health: 100, ammo: 0, maxAmmo: 0, reloading: false, reloadProgress: 1,
    specialCooldown: 0, specialMaxCooldown: 1, timeLeft: 25, kills: 0, killsNeeded: 1,
    shielded: false, fortressMode: false, powerShots: 0, screenFlash: 0, screenFlashColor: '#fff',
  });

  const weapon = WEAPONS[defendingPiece.type] ?? WEAPONS.pawn;
  const killsNeeded = Math.max(1, Math.min(5, PIECE_VALUES[defendingPiece.type]));

  useEffect(() => {
    const onLockChange = () => setPointerLocked(!!document.pointerLockElement);
    document.addEventListener('pointerlockchange', onLockChange);
    return () => document.removeEventListener('pointerlockchange', onLockChange);
  }, []);

  const handleEnd = useCallback((won: boolean) => {
    setResultWon(won);
    setPhase('result');
  }, []);

  const handleHudUpdate = useCallback((data: HudData) => {
    setHudData(data);
  }, []);

  if (phase === 'intro') {
    const specialType = weapon.specialType;
    const specialIcons: Record<SpecialType, string> = { shield: '🛡', dash: '💨', beam: '⚡', fortress: '🏰', aoe: '💥', power: '👑' };
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'radial-gradient(ellipse at center, #0a1a0a 0%, #030808 100%)' }}>
        <div className="relative flex flex-col items-center gap-5 p-8 border rounded-xl max-w-md w-full mx-4"
          style={{ borderColor: 'hsl(var(--fps-red))', boxShadow: '0 0 50px hsl(var(--fps-red)/0.4), inset 0 0 80px rgba(0,0,0,0.8)', background: 'linear-gradient(135deg, #080f08, #0f0808)' }}>

          <div className="font-fps text-xs tracking-[0.4em] uppercase" style={{ color: 'hsl(var(--fps-red))' }}>⚔ BATTLE INITIATED ⚔</div>
          <h2 className="font-chess text-4xl text-gold text-center">COMBAT REQUIRED</h2>

          {/* Piece matchup */}
          <div className="flex items-center gap-6 my-1 w-full justify-center">
            {[attackingPiece, defendingPiece].map((p, i) => (
              <>
                {i === 1 && <div className="font-fps text-fps-red text-xl">VS</div>}
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className="text-5xl" style={{ color: p.color === 'white' ? '#f0e8d0' : '#9966ff', textShadow: '0 0 20px currentColor' }}>
                    {PIECE_SYM[p.type]}
                  </div>
                  <div className="font-chess text-xs text-gold capitalize">{p.color} {p.type}</div>
                </div>
              </>
            ))}
          </div>

          {/* Weapon card */}
          <div className="w-full rounded-lg p-3 space-y-2" style={{ background: 'rgba(0,0,0,0.5)', border: `1px solid ${weapon.accentColor}44` }}>
            <div className="flex justify-between items-center">
              <span className="font-fps text-xs" style={{ color: weapon.accentColor }}>{weapon.name}</span>
              <span className="font-fps text-xs text-muted-foreground">vs {killsNeeded} kill{killsNeeded > 1 ? 's' : ''} needed</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[['DMG', weapon.damage], ['AMMO', weapon.maxAmmo], ['PELLETS', weapon.pellets > 1 ? weapon.pellets + '×' : '1']].map(([label, val]) => (
                <div key={label as string} className="rounded p-1" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div className="font-fps text-xs text-muted-foreground">{label}</div>
                  <div className="font-fps text-sm" style={{ color: weapon.accentColor }}>{val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Special ability */}
          <div className="w-full rounded-lg p-3" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid #333' }}>
            <div className="flex items-center gap-2">
              <span className="text-xl">{specialIcons[specialType]}</span>
              <div>
                <div className="font-fps text-xs" style={{ color: weapon.accentColor }}>SHIFT — {weapon.specialName}</div>
                <div className="font-fps text-xs text-muted-foreground">{weapon.specialDescription}</div>
              </div>
            </div>
          </div>

          <div className="font-fps text-xs text-muted-foreground text-center">
            WASD/Arrows: Move  ·  Mouse: Aim  ·  Click: Shoot  ·  R: Reload  ·  Shift: Special
          </div>

          <button onClick={() => setPhase('battle')}
            className="w-full py-3 font-fps text-base tracking-widest uppercase rounded border transition-all"
            style={{ borderColor: 'hsl(var(--fps-red))', color: 'hsl(var(--fps-red))', background: 'hsl(var(--fps-red)/0.08)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--fps-red)/0.2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'hsl(var(--fps-red)/0.08)')}>
            ▶ ENGAGE
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'result') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'radial-gradient(ellipse, #0a1a0a 0%, #030808 100%)' }}>
        <div className="flex flex-col items-center gap-6 p-10 border rounded-xl max-w-sm w-full mx-4"
          style={{
            borderColor: resultWon ? 'hsl(var(--fps-green))' : 'hsl(var(--fps-red))',
            boxShadow: `0 0 60px hsl(var(${resultWon ? '--fps-green' : '--fps-red'})/0.5)`,
            background: 'linear-gradient(135deg, #080f08, #050b05)',
          }}>
          <div className="text-7xl">{resultWon ? '🏆' : '💀'}</div>
          <h2 className="font-chess text-5xl" style={{ color: resultWon ? 'hsl(var(--fps-green))' : 'hsl(var(--fps-red))', textShadow: '0 0 20px currentColor' }}>
            {resultWon ? 'VICTORY' : 'DEFEAT'}
          </h2>
          <p className="font-fps text-sm text-center text-muted-foreground">
            {resultWon
              ? `Capture successful! The ${defendingPiece.color} ${defendingPiece.type} is eliminated.`
              : `The ${defendingPiece.color} ${defendingPiece.type} defended its ground!`}
          </p>
          <button onClick={() => onBattleEnd(resultWon)}
            className="w-full py-3 font-fps tracking-widest uppercase rounded border text-sm transition-all"
            style={{ borderColor: resultWon ? 'hsl(var(--fps-green))' : 'hsl(var(--fps-red))', color: resultWon ? 'hsl(var(--fps-green))' : 'hsl(var(--fps-red))' }}>
            RETURN TO BOARD
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50">
      <Canvas
        shadows
        camera={{ fov: 85, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: false }}
        style={{ cursor: 'none', background: '#050a05' }}
      >
        <BattleScene
          weapon={weapon}
          killsNeeded={killsNeeded}
          defenderType={defendingPiece.type}
          defenderColor={defendingPiece.color}
          onEnd={handleEnd}
          onHudUpdate={handleHudUpdate}
        />
      </Canvas>
      <BattleHUD hud={hudData} weapon={weapon} locked={pointerLocked} />
    </div>
  );
}
