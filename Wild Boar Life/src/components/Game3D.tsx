import React, { useRef, useCallback, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { createInitialState } from "@/lib/gameInit";
import { type GameState } from "@/lib/gameTypes";
import GameScene from "./three/GameScene";
import forestBg from "@/assets/forest-bg.jpg";

// ── Stat bar ─────────────────────────────────────────────────────────────

function StatBar({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const isLow = pct < 25;
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex justify-between items-center">
        <span className="font-vt text-lg" style={{ color: "hsl(var(--muted-foreground))" }}>
          {icon} {label}
        </span>
        <span
          className={`font-vt text-lg ${isLow ? "stat-low" : ""}`}
          style={{ color: isLow ? "#ff5555" : "hsl(var(--foreground))" }}
        >
          {Math.floor(pct)}
        </span>
      </div>
      <div className="h-3 rounded-sm overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div
          className="h-full rounded-sm transition-all duration-300"
          style={{
            width: `${pct}%`,
            background: color,
            boxShadow: isLow ? `0 0 6px ${color}` : "none",
          }}
        />
      </div>
    </div>
  );
}

// ── HUD overlay ──────────────────────────────────────────────────────────

function HUD({ state }: { state: GameState }) {
  const p = state.time.dayProgress;
  const dayPhase =
    p < 0.05 ? "🌅 Dawn"
    : p < 0.35 ? "☀️ Morning"
    : p < 0.55 ? "🌤 Afternoon"
    : p < 0.65 ? "🌆 Dusk"
    : "🌙 Night";

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
      {/* Top row */}
      <div className="flex justify-between items-start gap-4">
        {/* Stats */}
        <div
          className="rounded-sm p-3 grid grid-cols-2 gap-x-4 gap-y-2"
          style={{
            background: "rgba(8,6,3,0.78)",
            border: "1px solid rgba(160,100,40,0.35)",
            minWidth: 320,
          }}
        >
          <StatBar label="Health"  value={state.stats.health}  color="#e05555" icon="❤️" />
          <StatBar label="Hunger"  value={state.stats.hunger}  color="#e0a030" icon="🍖" />
          <StatBar label="Thirst"  value={state.stats.thirst}  color="#4ab0e0" icon="💧" />
          <StatBar label="Stamina" value={state.stats.stamina} color="#60c060" icon="⚡" />
        </div>

        {/* Day/score */}
        <div
          className="rounded-sm p-3 text-right"
          style={{
            background: "rgba(8,6,3,0.78)",
            border: "1px solid rgba(160,100,40,0.35)",
          }}
        >
          <div className="font-vt text-xl" style={{ color: "hsl(var(--primary))" }}>{dayPhase}</div>
          <div className="font-vt text-lg" style={{ color: "hsl(var(--muted-foreground))" }}>Day {state.time.day}</div>
          <div className="font-vt text-lg" style={{ color: "hsl(var(--foreground))" }}>Score: {Math.floor(state.stats.score)}</div>
          {state.world.piglets.length > 0 && (
            <div className="font-vt text-base mt-1" style={{ color: "#ffccaa" }}>
              {"🐷".repeat(state.world.piglets.length)} ×{(1 + state.world.piglets.length * 0.5).toFixed(1)}
            </div>
          )}
        </div>
      </div>

      {/* Event popup */}
      {state.lastEvent && state.eventTimer > 0 && (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-vt text-2xl px-5 py-3 rounded-sm pointer-events-none"
          style={{
            background: "rgba(180,30,30,0.9)",
            border: "1px solid #ff6666",
            color: "#fff",
            opacity: Math.min(1, state.eventTimer),
            whiteSpace: "nowrap",
          }}
        >
          {state.lastEvent}
        </div>
      )}

      {/* Controls */}
      <div
        className="self-center flex gap-5 px-4 py-1.5 rounded-sm"
        style={{ background: "rgba(8,6,3,0.65)" }}
      >
        {[
          ["WASD/↑↓←→", "Move"],
          ["Shift", "Sprint"],
          ["Walk on 🌊", "Drink"],
          ["Walk to food", "Eat"],
        ].map(([key, act]) => (
          <span key={key} className="font-vt text-base" style={{ color: "hsl(var(--muted-foreground))" }}>
            <span style={{ color: "hsl(var(--primary))" }}>{key}</span> {act}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Title screen ──────────────────────────────────────────────────────────

function TitleScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div
        className="flex flex-col items-center gap-8 text-center px-8 py-10 rounded-sm"
        style={{ background: "rgba(8,6,3,0.88)", border: "1px solid rgba(160,100,40,0.5)" }}
      >
        <div>
          <div className="text-7xl mb-3">🐗</div>
          <h1 className="font-pixel text-4xl leading-tight mb-1" style={{ color: "hsl(var(--primary))" }}>
            WILD BOAR
          </h1>
          <h2 className="font-pixel text-xl" style={{ color: "hsl(var(--foreground))" }}>
            LIFE SIMULATOR 3D
          </h2>
          <p className="font-vt text-xl mt-3" style={{ color: "hsl(var(--muted-foreground))" }}>
            Survive. Forage. Wallow. Charge.
          </p>
        </div>

        <div
          className="font-vt text-lg text-left grid grid-cols-2 gap-x-6 gap-y-1 rounded p-4"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(160,100,40,0.3)" }}
        >
          <span>🌰 Acorns & 🍄 Mushrooms</span><span style={{ color: "hsl(var(--muted-foreground))" }}>→ Restore Hunger</span>
          <span>🌊 River</span><span style={{ color: "hsl(var(--muted-foreground))" }}>→ Restore Thirst</span>
          <span>🟫 Mud patches</span><span style={{ color: "hsl(var(--muted-foreground))" }}>→ Wallow (slows you)</span>
          <span>⚡ Shift</span><span style={{ color: "hsl(var(--muted-foreground))" }}>→ Sprint from hunters</span>
          <span>🐷 Day 3+</span><span style={{ color: "hsl(var(--muted-foreground))" }}>→ Piglets join & boost score</span>
        </div>

        <button
          onClick={onStart}
          className="font-pixel text-sm px-10 py-4 rounded-sm transition-all hover:scale-105 active:scale-95"
          style={{
            background: "hsl(var(--primary))",
            color: "hsl(var(--primary-foreground))",
            boxShadow: "0 0 24px hsl(var(--primary) / 0.5)",
          }}
        >
          START GAME
        </button>
      </div>
    </div>
  );
}

// ── Death screen ──────────────────────────────────────────────────────────

function DeathScreen({ state, onRestart }: { state: GameState; onRestart: () => void }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div
        className="flex flex-col items-center gap-6 text-center px-8 py-10 rounded-sm"
        style={{ background: "rgba(8,6,3,0.92)", border: "1px solid rgba(200,50,50,0.5)" }}
      >
        <div className="text-6xl">💀</div>
        <h1 className="font-pixel text-2xl" style={{ color: "#ff5555" }}>YOU DIED</h1>
        <div
          className="font-vt text-xl space-y-1 p-4 rounded"
          style={{ background: "rgba(255,255,255,0.04)", color: "hsl(var(--foreground))" }}
        >
          <p>🐗 Lived for <span style={{ color: "hsl(var(--primary))" }}>{state.time.day} days</span></p>
          <p>🌟 Final Score: <span style={{ color: "hsl(var(--primary))" }}>{Math.floor(state.stats.score)}</span></p>
          {state.world.piglets.length > 0 && (
            <p>🐷 Raised <span style={{ color: "#ffccaa" }}>{state.world.piglets.length} piglets</span></p>
          )}
        </div>
        <button
          onClick={onRestart}
          className="font-pixel text-xs px-10 py-4 rounded-sm transition-all hover:scale-105 active:scale-95"
          style={{
            background: "hsl(var(--primary))",
            color: "hsl(var(--primary-foreground))",
            boxShadow: "0 0 20px hsl(var(--primary) / 0.4)",
          }}
        >
          TRY AGAIN
        </button>
      </div>
    </div>
  );
}

// ── Main Game3D component ─────────────────────────────────────────────────

export default function Game3D() {
  const stateRef = useRef<GameState>(createInitialState());
  const keysRef  = useRef<Set<string>>(new Set());
  const [hudState, setHudState] = useState<GameState>(stateRef.current);

  // Keyboard input
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);
      // Prevent arrow keys scrolling the page
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code)) {
        e.preventDefault();
      }
    };
    const onUp = (e: KeyboardEvent) => keysRef.current.delete(e.code);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  const startGame = useCallback(() => {
    const fresh = createInitialState();
    fresh.phase = "playing";
    stateRef.current = fresh;
    setHudState({ ...fresh });
  }, []);

  const isTitle   = hudState.phase === "title";
  const isDead    = hudState.phase === "dead";
  const isPlaying = hudState.phase === "playing";

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ background: "hsl(var(--background))" }}>
      {/* 3D Canvas - always rendered */}
      <Canvas
        shadows
        camera={{ position: [0, 9, 22], fov: 60, near: 0.1, far: 200 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <GameScene
          stateRef={stateRef}
          keysRef={keysRef}
          onUpdate={setHudState}
        />
      </Canvas>

      {/* Forest bg overlay for title/dead screens */}
      {(isTitle || isDead) && (
        <div className="absolute inset-0 pointer-events-none">
          <img src={forestBg} alt="" className="w-full h-full object-cover opacity-20 mix-blend-overlay" />
        </div>
      )}

      {/* Overlays */}
      {isPlaying && <HUD state={hudState} />}
      {isTitle    && <TitleScreen onStart={startGame} />}
      {isDead     && <DeathScreen state={hudState} onRestart={startGame} />}
    </div>
  );
}
