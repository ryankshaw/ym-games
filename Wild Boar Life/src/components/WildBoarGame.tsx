import React, { useRef, useEffect, useCallback, useState } from "react";
import { useGameLoop } from "@/hooks/useGameLoop";
import { createInitialState } from "@/lib/gameInit";
import { updateGame, spawnHunter } from "@/lib/gameLogic";
import { renderGame, initSprites } from "@/lib/gameRenderer";
import { type GameState, MAX_STAT } from "@/lib/gameTypes";
import forestBg from "@/assets/forest-bg.jpg";

const CANVAS_W = 960;
const CANVAS_H = 600;

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
        <span className="font-vt text-base" style={{ color: "hsl(var(--muted-foreground))" }}>
          {icon} {label}
        </span>
        <span
          className={`font-vt text-base ${isLow ? "stat-low" : ""}`}
          style={{ color: isLow ? "#ff5555" : "hsl(var(--foreground))" }}
        >
          {Math.floor(pct)}
        </span>
      </div>
      <div
        className="h-3 rounded-sm overflow-hidden"
        style={{ background: "rgba(255,255,255,0.08)" }}
      >
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

export default function WildBoarGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const keysRef = useRef<Set<string>>(new Set());
  const timeRef = useRef<number>(0);
  const hunterTimerRef = useRef<number>(0);
  const [displayState, setDisplayState] = useState<GameState>(stateRef.current);

  // Init sprites once
  useEffect(() => { initSprites(); }, []);

  // Key handlers
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);
      e.preventDefault();
    };
    const onUp = (e: KeyboardEvent) => keysRef.current.delete(e.code);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  const gameLoop = useCallback(
    (dt: number) => {
      timeRef.current += dt;

      if (stateRef.current.phase === "playing") {
        hunterTimerRef.current += dt;
        if (hunterTimerRef.current > 40 + Math.random() * 20) {
          hunterTimerRef.current = 0;
          stateRef.current = spawnHunter(stateRef.current);
        }

        stateRef.current = updateGame(stateRef.current, dt, keysRef.current);
      }

      // Render
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      renderGame(ctx, stateRef.current, timeRef.current);

      // Update React state (throttled for HUD)
      setDisplayState({ ...stateRef.current });
    },
    []
  );

  useGameLoop(gameLoop, true);

  const startGame = () => {
    stateRef.current = createInitialState();
    stateRef.current.phase = "playing";
    hunterTimerRef.current = 0;
    setDisplayState({ ...stateRef.current });
  };

  const s = displayState;
  const isTitle = s.phase === "title";
  const isDead = s.phase === "dead";
  const isPlaying = s.phase === "playing";

  const dayPhaseLabel = () => {
    const p = s.time.dayProgress;
    if (p < 0.05) return "🌅 Dawn";
    if (p < 0.35) return "☀️ Morning";
    if (p < 0.55) return "🌤️ Afternoon";
    if (p < 0.65) return "🌆 Dusk";
    return "🌙 Night";
  };

  return (
    <div
      className="relative flex flex-col items-center justify-center min-h-screen scanlines"
      style={{ background: "hsl(var(--background))" }}
    >
      {/* Background image on title/dead screens */}
      {(isTitle || isDead) && (
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={forestBg}
            alt="forest"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, hsl(27 20% 8% / 0.3), hsl(27 20% 8% / 0.9))" }} />
        </div>
      )}

      {/* Game canvas – always rendered for background */}
      <div
        className="relative"
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          maxWidth: "100vw",
          display: isPlaying ? "block" : "none",
        }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="game-canvas block"
          style={{ border: "2px solid hsl(var(--hud-border, 36 40% 30%))" }}
        />

        {/* HUD overlay */}
        <div
          className="absolute top-0 left-0 w-full pointer-events-none"
          style={{ padding: "10px 14px" }}
        >
          {/* Stats row */}
          <div
            className="rounded-sm p-3 grid grid-cols-2 gap-2"
            style={{
              background: "rgba(10,8,5,0.78)",
              border: "1px solid rgba(160,100,40,0.3)",
              maxWidth: 340,
            }}
          >
            <StatBar label="Health" value={s.stats.health} color="#e05555" icon="❤️" />
            <StatBar label="Hunger" value={s.stats.hunger} color="#e0a030" icon="🍖" />
            <StatBar label="Thirst" value={s.stats.thirst} color="#4ab0e0" icon="💧" />
            <StatBar label="Stamina" value={s.stats.stamina} color="#60c060" icon="⚡" />
          </div>

          {/* Top right info */}
          <div
            className="absolute top-0 right-0 m-2.5 rounded-sm p-2.5 text-right"
            style={{
              background: "rgba(10,8,5,0.78)",
              border: "1px solid rgba(160,100,40,0.3)",
            }}
          >
            <div className="font-vt text-lg" style={{ color: "hsl(var(--primary))" }}>
              {dayPhaseLabel()}
            </div>
            <div className="font-vt text-base" style={{ color: "hsl(var(--muted-foreground))" }}>
              Day {s.time.day}
            </div>
            <div className="font-vt text-base" style={{ color: "hsl(var(--foreground))" }}>
              Score: {Math.floor(s.stats.score)}
            </div>
          </div>

          {/* Event popup */}
          {s.lastEvent && s.eventTimer > 0 && (
            <div
              className="absolute bottom-16 left-1/2 -translate-x-1/2 font-vt text-xl px-4 py-2 rounded-sm"
              style={{
                background: "rgba(180,30,30,0.88)",
                border: "1px solid #ff6666",
                color: "#fff",
                opacity: Math.min(1, s.eventTimer),
                whiteSpace: "nowrap",
              }}
            >
              {s.lastEvent}
            </div>
          )}
        </div>

        {/* Controls tooltip */}
        <div
          className="absolute bottom-0 left-0 right-0 flex justify-center gap-4 px-3 py-1.5"
          style={{ background: "rgba(10,8,5,0.6)" }}
        >
          {[
            ["WASD / ↑↓←→", "Move"],
            ["Shift", "Sprint"],
            ["Walk on 🌊", "Drink"],
            ["Walk on food", "Eat"],
          ].map(([key, action]) => (
            <span key={key} className="font-vt text-base" style={{ color: "hsl(var(--muted-foreground))" }}>
              <span style={{ color: "hsl(var(--primary))" }}>{key}</span> {action}
            </span>
          ))}
        </div>
      </div>

      {/* Title screen */}
      {isTitle && (
        <div className="relative z-10 flex flex-col items-center gap-8 text-center px-6">
          <div>
            <div className="text-6xl mb-4">🐗</div>
            <h1 className="font-pixel text-3xl leading-tight mb-2" style={{ color: "hsl(var(--primary))" }}>
              WILD BOAR
            </h1>
            <h2 className="font-pixel text-lg leading-tight" style={{ color: "hsl(var(--foreground))" }}>
              LIFE SIMULATOR
            </h2>
            <p className="font-vt text-xl mt-4" style={{ color: "hsl(var(--muted-foreground))" }}>
              Survive the forest. Forage. Wallow. Charge.
            </p>
          </div>

          <div
            className="font-vt text-base text-left rounded p-4 grid grid-cols-2 gap-x-6 gap-y-1"
            style={{
              background: "rgba(10,8,5,0.7)",
              border: "1px solid rgba(160,100,40,0.4)",
              color: "hsl(var(--foreground))",
            }}
          >
            <span>🌰 Acorns / 🍄 Mushrooms</span><span style={{ color: "hsl(var(--muted-foreground))" }}>→ Restore Hunger</span>
            <span>🌊 River water</span><span style={{ color: "hsl(var(--muted-foreground))" }}>→ Restore Thirst</span>
            <span>🟫 Mud patches</span><span style={{ color: "hsl(var(--muted-foreground))" }}>→ Wallow (but slow)</span>
            <span>⚡ Shift key</span><span style={{ color: "hsl(var(--muted-foreground))" }}>→ Sprint from hunters</span>
            <span>🌙 Night falls</span><span style={{ color: "hsl(var(--muted-foreground))" }}>→ Reduced vision</span>
            <span>🎯 Hunters spawn</span><span style={{ color: "hsl(var(--muted-foreground))" }}>→ RUN!</span>
          </div>

          <button
            onClick={startGame}
            className="font-pixel text-sm px-8 py-4 rounded-sm transition-all hover:scale-105 active:scale-95"
            style={{
              background: "hsl(var(--primary))",
              color: "hsl(var(--primary-foreground))",
              boxShadow: "0 0 20px hsl(var(--primary) / 0.4)",
            }}
          >
            START GAME
          </button>
        </div>
      )}

      {/* Death screen */}
      {isDead && (
        <div className="relative z-10 flex flex-col items-center gap-6 text-center px-6">
          <div className="text-5xl">💀</div>
          <h1 className="font-pixel text-2xl" style={{ color: "#ff5555" }}>
            YOU DIED
          </h1>
          <div
            className="font-vt text-xl rounded p-5 space-y-1"
            style={{
              background: "rgba(10,8,5,0.85)",
              border: "1px solid rgba(160,100,40,0.4)",
              color: "hsl(var(--foreground))",
            }}
          >
            <p>🐗 Your boar lived for <span style={{ color: "hsl(var(--primary))" }}>{s.time.day} days</span></p>
            <p>🌟 Final Score: <span style={{ color: "hsl(var(--primary))" }}>{Math.floor(s.stats.score)}</span></p>
          </div>
          <button
            onClick={startGame}
            className="font-pixel text-xs px-8 py-4 rounded-sm transition-all hover:scale-105 active:scale-95"
            style={{
              background: "hsl(var(--primary))",
              color: "hsl(var(--primary-foreground))",
              boxShadow: "0 0 20px hsl(var(--primary) / 0.4)",
            }}
          >
            TRY AGAIN
          </button>
        </div>
      )}
    </div>
  );
}
