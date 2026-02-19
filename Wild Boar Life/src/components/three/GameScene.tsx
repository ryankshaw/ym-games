import { useRef, useMemo, MutableRefObject, useEffect, Suspense } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";
import { updateGame, spawnHunter } from "@/lib/gameLogic";
import { TILE_SIZE, WORLD_W, WORLD_H, type GameState, type FoodItem } from "@/lib/gameTypes";

const T = TILE_SIZE;
function toW(px: number) { return px / T; }

// Preload the GLTF boar model
useGLTF.preload("/models/boar.glb");

// ── GLTF Boar ─────────────────────────────────────────────────────────────

interface BoarGLTFProps {
  groupRef: MutableRefObject<THREE.Group | null>;
  isMoving: MutableRefObject<boolean>;
  isSprinting: MutableRefObject<boolean>;
  isMuddy: MutableRefObject<boolean>;
}

function BoarGLTF({ groupRef, isMoving, isSprinting, isMuddy }: BoarGLTFProps) {
  const { scene, animations } = useGLTF("/models/boar.glb");
  const { actions, names } = useAnimations(animations, groupRef as MutableRefObject<THREE.Object3D>);

  // Tint all meshes dark brown to look like a boar
  const boarScene = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.material = new THREE.MeshLambertMaterial({ color: "#3a2418" });
      }
    });
    return clone;
  }, [scene]);

  // Start idle animation
  useEffect(() => {
    if (!actions || names.length === 0) return;
    const idle = actions["Survey"] ?? actions[names[0]];
    idle?.play();
  }, [actions, names]);

  // Blend animations based on movement state
  useFrame((_, delta) => {
    if (!actions || names.length === 0) return;

    const moving    = isMoving.current;
    const sprinting = isSprinting.current;
    const muddy     = isMuddy.current;

    const idle = actions["Survey"] ?? actions[names[0]];
    const walk = actions["Walk"]   ?? actions[names[Math.min(1, names.length - 1)]];
    const run  = actions["Run"]    ?? actions[names[Math.min(2, names.length - 1)]];

    const step = Math.min(1, 6 * delta);

    if (!moving) {
      if (idle && idle.weight < 1) { idle.play(); idle.setEffectiveWeight(Math.min(1, (idle.getEffectiveWeight() || 0) + step)); }
      if (walk) walk.setEffectiveWeight(Math.max(0, (walk.getEffectiveWeight() || 0) - step));
      if (run)  run.setEffectiveWeight(Math.max(0,  (run.getEffectiveWeight()  || 0) - step));
    } else if (sprinting) {
      if (run && run.weight < 1) { run.play(); run.setEffectiveWeight(Math.min(1, (run.getEffectiveWeight() || 0) + step)); }
      if (walk) walk.setEffectiveWeight(Math.max(0, (walk.getEffectiveWeight() || 0) - step));
      if (idle) idle.setEffectiveWeight(Math.max(0, (idle.getEffectiveWeight() || 0) - step));
    } else {
      if (walk && walk.weight < 1) { walk.play(); walk.setEffectiveWeight(Math.min(1, (walk.getEffectiveWeight() || 0) + step)); }
      if (run)  run.setEffectiveWeight(Math.max(0,  (run.getEffectiveWeight()  || 0) - step));
      if (idle) idle.setEffectiveWeight(Math.max(0, (idle.getEffectiveWeight() || 0) - step));
    }

    // Apply muddy tint
    groupRef.current?.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mat = (obj as THREE.Mesh).material as THREE.MeshLambertMaterial;
        if (mat?.color) {
          mat.color.lerp(new THREE.Color(muddy ? "#6a4e2a" : "#3a2418"), 0.06);
        }
      }
    });
  });

  return (
    // Fox model vertices are in cm — scale to ~1 game unit tall, face +X
    <group scale={[0.012, 0.012, 0.012]} rotation={[0, -Math.PI / 2, 0]}>
      <primitive object={boarScene} />
    </group>
  );
}

// Outer wrapper — this is the group the game loop positions
function BoarModel({ groupRef, isMoving, isSprinting, isMuddy }: BoarGLTFProps) {
  return (
    <group ref={groupRef} position={[8, 0, 10]}>
      <Suspense fallback={null}>
        <BoarGLTF
          groupRef={groupRef}
          isMoving={isMoving}
          isSprinting={isSprinting}
          isMuddy={isMuddy}
        />
      </Suspense>
    </group>
  );
}


// ── Hunter pool ───────────────────────────────────────────────────────────

function HunterPool({ hunterRefs }: { hunterRefs: MutableRefObject<(THREE.Group | null)[]> }) {
  return (
    <>
      {Array(6).fill(null).map((_, i) => (
        <group key={i} ref={el => { hunterRefs.current[i] = el; }} visible={false}>
          {/* Body */}
          <mesh position={[0, 0.72, 0]} castShadow>
            <boxGeometry args={[0.42, 0.62, 0.28]} />
            <meshLambertMaterial color="#4a6b3a" />
          </mesh>
          {/* Head */}
          <mesh position={[0, 1.17, 0]} castShadow>
            <boxGeometry args={[0.32, 0.3, 0.3]} />
            <meshLambertMaterial color="#c4956a" />
          </mesh>
          {/* Hat brim */}
          <mesh position={[0, 1.37, 0]}>
            <cylinderGeometry args={[0.26, 0.3, 0.06, 8]} />
            <meshLambertMaterial color="#5a4020" />
          </mesh>
          {/* Hat crown */}
          <mesh position={[0, 1.5, 0]}>
            <cylinderGeometry args={[0.16, 0.17, 0.2, 8]} />
            <meshLambertMaterial color="#5a4020" />
          </mesh>
          {/* Rifle */}
          <mesh position={[0.28, 0.75, 0]} rotation={[0, 0, 0.12]}>
            <boxGeometry args={[0.06, 0.75, 0.06]} />
            <meshLambertMaterial color="#3a2a1a" />
          </mesh>
          {/* Legs */}
          <mesh position={[0.1, 0.22, 0]}>
            <boxGeometry args={[0.13, 0.42, 0.13]} />
            <meshLambertMaterial color="#4a3020" />
          </mesh>
          <mesh position={[-0.1, 0.22, 0]}>
            <boxGeometry args={[0.13, 0.42, 0.13]} />
            <meshLambertMaterial color="#4a3020" />
          </mesh>
          {/* Alert indicator */}
          <mesh position={[0, 1.8, 0]}>
            <sphereGeometry args={[0.12, 8, 8]} />
            <meshStandardMaterial color="#ff3333" emissive="#ff0000" emissiveIntensity={0.8} />
          </mesh>
        </group>
      ))}
    </>
  );
}

// ── World terrain ─────────────────────────────────────────────────────────

function WorldTerrain({ tiles }: { tiles: GameState["world"]["tiles"] }) {
  const groundTexture = useMemo(() => {
    const data = new Uint8Array(WORLD_W * WORLD_H * 4);
    const colorMap: Record<string, [number, number, number]> = {
      grass:     [54, 98, 38],
      mud:       [110, 80, 50],
      water:     [38, 100, 140],
      deepWater: [22, 66, 110],
      dirt:      [140, 108, 70],
    };
    for (let y = 0; y < WORLD_H; y++) {
      for (let x = 0; x < WORLD_W; x++) {
        const tile = tiles[y][x];
        const c = colorMap[tile.type] ?? colorMap.grass;
        const noise = (tile.variant * 7) % 12 - 6;
        const i = (y * WORLD_W + x) * 4;
        data[i]     = Math.min(255, c[0] + noise);
        data[i + 1] = Math.min(255, c[1] + noise);
        data[i + 2] = Math.min(255, c[2] + noise);
        data[i + 3] = 255;
      }
    }
    const tex = new THREE.DataTexture(data, WORLD_W, WORLD_H, THREE.RGBAFormat);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.needsUpdate = true;
    return tex;
  }, [tiles]);

  return (
    <mesh
      position={[WORLD_W / 2, -0.02, WORLD_H / 2]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    >
      <planeGeometry args={[WORLD_W, WORLD_H, WORLD_W, WORLD_H]} />
      <meshLambertMaterial map={groundTexture} />
    </mesh>
  );
}

// ── Water ─────────────────────────────────────────────────────────────────

function AnimatedWater({ waterRef }: { waterRef: MutableRefObject<THREE.Mesh | null> }) {
  return (
    <>
      {/* Deep water base */}
      <mesh position={[21, 0.005, WORLD_H / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5, WORLD_H]} />
        <meshStandardMaterial color="#1a4a80" transparent opacity={0.92} />
      </mesh>
      {/* Animated surface */}
      <mesh ref={waterRef} position={[21, 0.02, WORLD_H / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7, WORLD_H, 14, WORLD_H * 2]} />
        <meshStandardMaterial
          color="#3a9fcc"
          transparent
          opacity={0.65}
          metalness={0.6}
          roughness={0.05}
          envMapIntensity={1}
        />
      </mesh>
      {/* Shore foam */}
      <mesh position={[18, 0.03, WORLD_H / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.2, WORLD_H]} />
        <meshStandardMaterial color="#a8d8f0" transparent opacity={0.4} />
      </mesh>
    </>
  );
}

// ── Trees ─────────────────────────────────────────────────────────────────

function Trees({ tiles }: { tiles: GameState["world"]["tiles"] }) {
  const positions = useMemo(() => {
    const p: [number, number][] = [];
    for (let ty = 0; ty < WORLD_H; ty++) {
      for (let tx = 0; tx < WORLD_W; tx++) {
        const tile = tiles[ty][tx];
        if (tile.type === "grass" && tile.variant === 3 && tx % 3 === 0 && ty % 3 === 0) {
          p.push([tx + 0.5, ty + 0.5]);
        }
      }
    }
    return p;
  }, [tiles]);

  return (
    <>
      {positions.map(([tx, tz], i) => {
        const scale = 0.85 + ((i * 137) % 30) / 100;
        return (
          <group key={i} position={[tx, 0, tz]} scale={scale}>
            <mesh position={[0, 0.05, 0]}>
              <cylinderGeometry args={[0.25, 0.3, 0.12, 8]} />
              <meshLambertMaterial color="#4a3015" />
            </mesh>
            <mesh position={[0, 0.75, 0]} castShadow>
              <cylinderGeometry args={[0.16, 0.22, 1.3, 8]} />
              <meshLambertMaterial color="#5a3a1a" />
            </mesh>
            <mesh position={[0, 1.6, 0]} castShadow>
              <sphereGeometry args={[0.9, 9, 9]} />
              <meshLambertMaterial color="#265e16" />
            </mesh>
            <mesh position={[0.18, 2.0, 0.1]} castShadow>
              <sphereGeometry args={[0.72, 8, 8]} />
              <meshLambertMaterial color="#327020" />
            </mesh>
            <mesh position={[-0.1, 2.35, -0.1]} castShadow>
              <sphereGeometry args={[0.52, 7, 7]} />
              <meshLambertMaterial color="#3d8022" />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

// ── Food items ─────────────────────────────────────────────────────────────

const FOOD_COLORS: Record<FoodItem["type"], [string, string]> = {
  acorn:    ["#8B5513", "#c47028"],
  mushroom: ["#cc2222", "#ff4444"],
  berry:    ["#4B0082", "#8b44cc"],
  root:     ["#228B22", "#44cc44"],
};

function FoodItems({
  foods,
  foodMeshes,
}: {
  foods: FoodItem[];
  foodMeshes: MutableRefObject<(THREE.Mesh | null)[]>;
}) {
  return (
    <>
      {foods.map((food, i) => {
        const [color, emissive] = FOOD_COLORS[food.type];
        return (
          <mesh
            key={food.id}
            ref={el => { foodMeshes.current[i] = el; }}
            position={[toW(food.x), 0.22, toW(food.y)]}
            castShadow
          >
            <sphereGeometry args={[0.2, 10, 10]} />
            <meshStandardMaterial
              color={color}
              emissive={emissive}
              emissiveIntensity={0.4}
              roughness={0.5}
              metalness={0.1}
            />
          </mesh>
        );
      })}
    </>
  );
}

// ── Piglets ───────────────────────────────────────────────────────────────

const MAX_PIGLETS = 6;

function PigletPool({ pigletRefs }: { pigletRefs: MutableRefObject<(THREE.Group | null)[]> }) {
  const babyBrown = "#7a4a30";
  const babyLight = "#c88860";
  const babyLegs  = "#5a3020";
  return (
    <>
      {Array(MAX_PIGLETS).fill(null).map((_, i) => (
        <group key={i} ref={el => { pigletRefs.current[i] = el; }} visible={false} scale={0.52}>
          <mesh position={[0, 0.49, 0]} castShadow>
            <boxGeometry args={[0.7, 0.32, 0.44]} />
            <meshLambertMaterial color={babyBrown} />
          </mesh>
          <mesh position={[0.38, 0.52, 0]} castShadow>
            <boxGeometry args={[0.3, 0.28, 0.3]} />
            <meshLambertMaterial color={babyBrown} />
          </mesh>
          <mesh position={[0.55, 0.46, 0]}>
            <boxGeometry args={[0.16, 0.16, 0.22]} />
            <meshLambertMaterial color={babyLight} />
          </mesh>
          <mesh position={[0.64, 0.44, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.07, 0.07, 0.03, 7]} />
            <meshLambertMaterial color="#3a1a14" />
          </mesh>
          <mesh position={[0.46, 0.6, 0.14]}>
            <sphereGeometry args={[0.045, 7, 7]} />
            <meshLambertMaterial color="#1a0a08" />
          </mesh>
          <mesh position={[0.46, 0.6, -0.14]}>
            <sphereGeometry args={[0.045, 7, 7]} />
            <meshLambertMaterial color="#1a0a08" />
          </mesh>
          <mesh position={[0.34, 0.66, 0.13]}>
            <boxGeometry args={[0.08, 0.12, 0.06]} />
            <meshLambertMaterial color={babyBrown} />
          </mesh>
          <mesh position={[0.34, 0.66, -0.13]}>
            <boxGeometry args={[0.08, 0.12, 0.06]} />
            <meshLambertMaterial color={babyBrown} />
          </mesh>
          <mesh position={[-0.37, 0.54, 0]}>
            <torusGeometry args={[0.07, 0.025, 6, 10, Math.PI * 1.5]} />
            <meshLambertMaterial color={babyLight} />
          </mesh>
          <mesh position={[0.18, 0.18, 0.15]} castShadow>
            <boxGeometry args={[0.1, 0.3, 0.1]} />
            <meshLambertMaterial color={babyLegs} />
          </mesh>
          <mesh position={[0.18, 0.18, -0.15]} castShadow>
            <boxGeometry args={[0.1, 0.3, 0.1]} />
            <meshLambertMaterial color={babyLegs} />
          </mesh>
          <mesh position={[-0.18, 0.18, 0.15]} castShadow>
            <boxGeometry args={[0.1, 0.3, 0.1]} />
            <meshLambertMaterial color={babyLegs} />
          </mesh>
          <mesh position={[-0.18, 0.18, -0.15]} castShadow>
            <boxGeometry args={[0.1, 0.3, 0.1]} />
            <meshLambertMaterial color={babyLegs} />
          </mesh>
        </group>
      ))}
    </>
  );
}

// ── Main scene ─────────────────────────────────────────────────────────────

interface GameSceneProps {
  stateRef: MutableRefObject<GameState>;
  keysRef: MutableRefObject<Set<string>>;
  onUpdate: (s: GameState) => void;
}

export default function GameScene({ stateRef, keysRef, onUpdate }: GameSceneProps) {
  const { camera } = useThree();

  // Boar refs (group is set by BoarModel via useEffect)
  const boarGroup   = useRef<THREE.Group>(null);
  const boarRot     = useRef(0);
  const isMoving    = useRef(false);
  const isSprinting = useRef(false);
  const isMuddy     = useRef(false);

  // World refs
  const foodMeshes   = useRef<(THREE.Mesh | null)[]>([]);
  const hunterGroups = useRef<(THREE.Group | null)[]>(Array(6).fill(null));
  const pigletGroups = useRef<(THREE.Group | null)[]>(Array(MAX_PIGLETS).fill(null));
  const waterMesh    = useRef<THREE.Mesh>(null);
  const ambientRef   = useRef<THREE.AmbientLight>(null);
  const sunRef       = useRef<THREE.DirectionalLight>(null);

  // Game refs
  const hunterTimer = useRef(0);
  const frameCount  = useRef(0);

  const initialState = useMemo(() => stateRef.current, []);

  useFrame((state, delta) => {
    const s = stateRef.current;
    if (s.phase !== "playing") return;

    hunterTimer.current += delta;
    if (hunterTimer.current > 40 + Math.random() * 20) {
      hunterTimer.current = 0;
      stateRef.current = spawnHunter(stateRef.current);
    }

    stateRef.current = updateGame(stateRef.current, delta, keysRef.current);
    const ns = stateRef.current;
    const t = state.clock.elapsedTime;

    const bx = toW(ns.boar.x);
    const bz = toW(ns.boar.y);

    // ── Boar position & rotation ─────────────────────────────────────────
    if (boarGroup.current) {
      boarGroup.current.position.set(bx, 0, bz);

      const { vx, vy } = ns.boar;
      const moving = Math.abs(vx) + Math.abs(vy) > 20;
      isMoving.current = moving;
      isSprinting.current = ns.boar.sprinting;
      isMuddy.current = ns.boar.muddy;

      if (moving) {
        boarRot.current = -Math.atan2(vy, vx);
      }
      boarGroup.current.rotation.y = THREE.MathUtils.lerp(
        boarGroup.current.rotation.y, boarRot.current, 0.18
      );

      // Subtle body bob
      boarGroup.current.position.y = Math.abs(Math.sin(t * (ns.boar.sprinting ? 14 : 7))) * 0.03;
    }

    // ── Food visibility ──────────────────────────────────────────────────
    for (let i = 0; i < ns.world.foods.length; i++) {
      const mesh = foodMeshes.current[i];
      if (mesh) mesh.visible = ns.world.foods[i].visible;
    }
    for (let i = 0; i < ns.world.foods.length; i++) {
      const mesh = foodMeshes.current[i];
      if (mesh && ns.world.foods[i].visible) {
        mesh.position.y = 0.22 + Math.sin(t * 2.2 + i * 0.8) * 0.05;
        mesh.rotation.y = t * 1.2 + i;
      }
    }

    // ── Hunters ──────────────────────────────────────────────────────────
    const activeHunters = ns.world.hunters.filter(h => h.active);
    for (let i = 0; i < hunterGroups.current.length; i++) {
      const g = hunterGroups.current[i];
      if (!g) continue;
      const h = activeHunters[i];
      if (h) {
        g.visible = true;
        g.position.set(toW(h.x), 0, toW(h.y));
        const angle = Math.atan2(bx - toW(h.x), bz - toW(h.y));
        g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, angle, 0.12);
        const alertMesh = g.children[g.children.length - 1] as THREE.Mesh;
        if (alertMesh?.material) {
          (alertMesh.material as THREE.MeshStandardMaterial).emissiveIntensity =
            0.5 + Math.sin(t * 8) * 0.5;
        }
      } else {
        g.visible = false;
      }
    }

    // ── Piglets ───────────────────────────────────────────────────────────
    for (let i = 0; i < MAX_PIGLETS; i++) {
      const g = pigletGroups.current[i];
      if (!g) continue;
      const piglet = ns.world.piglets[i];
      if (piglet) {
        g.visible = true;
        const px = toW(piglet.x);
        const pz = toW(piglet.y);
        g.position.set(px, Math.abs(Math.sin(t * 10 + i * 1.3)) * 0.02, pz);
        const angle = Math.atan2(bx - px, bz - pz);
        g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, angle, 0.15);
      } else {
        g.visible = false;
      }
    }

    // ── Animated water ───────────────────────────────────────────────────
    if (waterMesh.current) {
      const wm = waterMesh.current.material as THREE.MeshStandardMaterial;
      wm.opacity = 0.6 + Math.sin(t * 1.5) * 0.05;
      if (wm.map) {
        wm.map.offset.y = (t * 0.05) % 1;
        wm.map.needsUpdate = true;
      }
    }

    // ── Day/Night lighting ───────────────────────────────────────────────
    const isNight = ns.time.isNight;
    if (sunRef.current) {
      sunRef.current.intensity = THREE.MathUtils.lerp(
        sunRef.current.intensity, isNight ? 0.08 : 1.4, 0.015
      );
      const sunColor = isNight
        ? new THREE.Color("#3040a0")
        : new THREE.Color(ns.time.dayProgress < 0.15 || ns.time.dayProgress > 0.5
            ? "#ff9944" : "#fffaed");
      sunRef.current.color.lerp(sunColor, 0.02);
    }
    if (ambientRef.current) {
      ambientRef.current.intensity = THREE.MathUtils.lerp(
        ambientRef.current.intensity, isNight ? 0.1 : 0.55, 0.015
      );
      const ambColor = isNight ? new THREE.Color("#050a20") : new THREE.Color("#fff8e7");
      ambientRef.current.color.lerp(ambColor, 0.02);
    }

    // ── Camera follow ─────────────────────────────────────────────────────
    const camTarget = new THREE.Vector3(bx - 5, 0.5, bz + 0.5);
    const camPos = new THREE.Vector3(bx - 10, 9, bz + 7);
    camera.position.lerp(camPos, 0.055);
    camera.lookAt(camTarget);

    // ── HUD ───────────────────────────────────────────────────────────────
    frameCount.current++;
    if (frameCount.current % 5 === 0 || ns.phase === "dead") {
      onUpdate({ ...ns });
    }
  });

  return (
    <>
      {/* Lighting */}
      <ambientLight ref={ambientRef} intensity={0.55} color="#fff8e7" />
      <directionalLight
        ref={sunRef}
        position={[30, 40, 20]}
        intensity={1.4}
        color="#fffaed"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={120}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={35}
        shadow-camera-bottom={-35}
      />
      <hemisphereLight args={["#87ceeb", "#4a7a3a", 0.25]} />

      {/* Fog */}
      <fog attach="fog" color="#b8d8a0" near={35} far={90} />

      {/* World border */}
      <mesh position={[WORLD_W / 2, -0.5, WORLD_H / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshLambertMaterial color="#4a7030" />
      </mesh>

      {/* Terrain */}
      <WorldTerrain tiles={initialState.world.tiles} />

      {/* Water */}
      <AnimatedWater waterRef={waterMesh} />

      {/* Trees */}
      <Trees tiles={initialState.world.tiles} />

      {/* Food */}
      <FoodItems foods={initialState.world.foods} foodMeshes={foodMeshes} />

      {/* Boar - GLTF model */}
      <BoarModel
        groupRef={boarGroup}
        isMoving={isMoving}
        isSprinting={isSprinting}
        isMuddy={isMuddy}
      />

      {/* Hunters */}
      <HunterPool hunterRefs={hunterGroups} />

      {/* Piglets */}
      <PigletPool pigletRefs={pigletGroups} />
    </>
  );
}
