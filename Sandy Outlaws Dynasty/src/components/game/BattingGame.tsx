import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft } from "lucide-react";
import { SANDY_OUTLAWS_ROSTER } from "./PlayerCard";

type HitType = "single" | "double" | "triple" | "out" | "homer" | "strike" | "ball";
type CoachCall = "swing" | "bunt" | "hitrun";
type Direction = "pull" | "center" | "oppo";
type Quality = "perfect" | "good" | "weak" | "miss";
type Phase = "lineup" | "idle" | "pitching" | "flight" | "result" | "gameover";

interface Player {
  number: number; name: string; position: string;
  avg: string; hr: number; rbi: number; emoji: string; description: string;
}

interface GameState {
  score: { outlaws: number; opponent: number };
  inning: number; outs: number; balls: number; strikes: number;
  bases: [boolean, boolean, boolean];
  phase: Phase;
  resultType: HitType | null;
  resultText: string | null;
}

// ─── Power Meter Zones ───────────────────────────────────────────────────────
// [MISS 0-12] [WEAK 12-28] [GOOD 28-42] [PERFECT 42-58] [GOOD 58-72] [WEAK 72-88] [MISS 88-100]
function getMeterQuality(pos: number): Quality {
  if (pos >= 42 && pos <= 58) return "perfect";
  if (pos >= 28 && pos <= 72) return "good";
  if (pos >= 12 && pos <= 88) return "weak";
  return "miss";
}

function getOutcome(quality: Quality, direction: Direction, coachCall: CoachCall): { type: HitType; text: string } {
  const r = Math.random();
  if (quality === "miss") return { type: "strike", text: "SWING AND MISS!" };
  if (quality === "weak") {
    if (coachCall === "bunt" && r < 0.55) return { type: "single", text: "BUNT SINGLE!" };
    if (r < 0.45) return { type: "out", text: "WEAK GROUNDER!" };
    if (r < 0.70) return { type: "out", text: "FOUL BALL!" };
    return { type: "single", text: "INFIELD SINGLE!" };
  }
  if (quality === "good") {
    if (coachCall === "bunt") return r < 0.7 ? { type: "single", text: "BUNT SINGLE!" } : { type: "out", text: "BUNT OUT!" };
    if (direction === "pull") {
      if (r < 0.12) return { type: "homer", text: "HOME RUN! 💥" };
      if (r < 0.30) return { type: "double", text: "DOUBLE!" };
      if (r < 0.60) return { type: "single", text: "SINGLE!" };
      return { type: "out", text: "FOUL BALL!" };
    }
    if (direction === "oppo") {
      if (r < 0.40) return { type: "single", text: "SINGLE!" };
      if (r < 0.65) return { type: "double", text: "DOUBLE!" };
      return { type: "out", text: "FOUL BALL!" };
    }
    // center
    if (r < 0.08) return { type: "homer", text: "HOME RUN! 💥" };
    if (r < 0.22) return { type: "triple", text: "TRIPLE!" };
    if (r < 0.52) return { type: "double", text: "DOUBLE!" };
    if (r < 0.80) return { type: "single", text: "SINGLE!" };
    return { type: "out", text: "FLY OUT!" };
  }
  // perfect
  if (coachCall === "bunt") return { type: "single", text: "PERFECT BUNT!" };
  if (direction === "pull") {
    if (coachCall === "hitrun") {
      if (r < 0.45) return { type: "homer", text: "GONE! 💥🎉" };
      if (r < 0.75) return { type: "triple", text: "TRIPLE!" };
      return { type: "double", text: "DOUBLE!" };
    }
    if (r < 0.38) return { type: "homer", text: "GONE! 💥🎉" };
    if (r < 0.60) return { type: "triple", text: "TRIPLE!" };
    if (r < 0.85) return { type: "double", text: "DOUBLE!" };
    return { type: "single", text: "SINGLE!" };
  }
  if (direction === "oppo") {
    if (r < 0.10) return { type: "homer", text: "OPPO TACO! 💥" };
    if (r < 0.35) return { type: "triple", text: "TRIPLE!" };
    if (r < 0.70) return { type: "double", text: "DOUBLE!" };
    return { type: "single", text: "SINGLE!" };
  }
  // center + perfect
  if (coachCall === "hitrun") {
    if (r < 0.20) return { type: "homer", text: "GONE! 💥🎉" };
    if (r < 0.45) return { type: "triple", text: "TRIPLE!" };
    if (r < 0.80) return { type: "double", text: "DOUBLE!" };
    return { type: "single", text: "SINGLE!" };
  }
  if (r < 0.25) return { type: "homer", text: "GONE! 💥🎉" };
  if (r < 0.45) return { type: "triple", text: "TRIPLE!" };
  if (r < 0.72) return { type: "double", text: "DOUBLE!" };
  return { type: "single", text: "SINGLE!" };
}

// ─── Base Diamond ─────────────────────────────────────────────────────────────
function BaseDiamond({ bases }: { bases: [boolean, boolean, boolean] }) {
  return (
    <svg viewBox="0 0 60 60" className="w-14 h-14">
      <line x1="30" y1="8" x2="52" y2="30" stroke="#444" strokeWidth="1" />
      <line x1="52" y1="30" x2="30" y2="52" stroke="#444" strokeWidth="1" />
      <line x1="30" y1="52" x2="8" y2="30" stroke="#444" strokeWidth="1" />
      <line x1="8" y1="30" x2="30" y2="8" stroke="#444" strokeWidth="1" />
      {/* 2nd */}
      <rect x="23" y="1" width="14" height="14" rx="1" fill={bases[1] ? "#f0c23a" : "#333"} stroke={bases[1] ? "#f0c23a" : "#555"} strokeWidth="1" />
      {/* 1st */}
      <rect x="45" y="23" width="14" height="14" rx="1" fill={bases[0] ? "#f0c23a" : "#333"} stroke={bases[0] ? "#f0c23a" : "#555"} strokeWidth="1" />
      {/* 3rd */}
      <rect x="1" y="23" width="14" height="14" rx="1" fill={bases[2] ? "#f0c23a" : "#333"} stroke={bases[2] ? "#f0c23a" : "#555"} strokeWidth="1" />
      {/* Home */}
      <polygon points="30,46 36,52 30,58 24,52" fill="#ccc" stroke="#666" strokeWidth="1" />
    </svg>
  );
}

// ─── Power Meter ─────────────────────────────────────────────────────────────
function PowerMeter({ pos, active }: { pos: number; active: boolean }) {
  const quality = getMeterQuality(pos);
  const zoneColor = quality === "perfect" ? "#22c55e" : quality === "good" ? "#eab308" : quality === "weak" ? "#f97316" : "#ef4444";

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="font-retro text-xs" style={{ color: "#f0c23a" }}>POWER METER</span>
        {active && (
          <span className="font-retro text-xs animate-retro-blink" style={{ color: zoneColor }}>
            {quality.toUpperCase()}!
          </span>
        )}
      </div>
      <div className="relative h-8 rounded overflow-hidden border-2" style={{ borderColor: "#333", background: "#111" }}>
        {/* Zone colors */}
        <div className="absolute inset-0 flex">
          <div className="h-full" style={{ width: "12%", background: "#7f1d1d" }} />
          <div className="h-full" style={{ width: "16%", background: "#c2410c" }} />
          <div className="h-full" style={{ width: "14%", background: "#ca8a04" }} />
          <div className="h-full" style={{ width: "16%", background: "#15803d" }} />  {/* perfect */}
          <div className="h-full" style={{ width: "16%", background: "#15803d" }} />  {/* perfect */}
          <div className="h-full" style={{ width: "14%", background: "#ca8a04" }} />
          <div className="h-full" style={{ width: "16%", background: "#c2410c" }} />
          <div className="h-full" style={{ width: "12%", background: "#7f1d1d" }} />
        </div>
        {/* Zone labels */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-retro text-xs text-white/60 tracking-widest select-none">
            MISS · WEAK · GOOD · <span style={{ color: "#86efac" }}>PERFECT</span> · GOOD · WEAK · MISS
          </span>
        </div>
        {/* Cursor */}
        {active && (
          <div
            className="absolute top-0 bottom-0 w-2 rounded-sm transition-none"
            style={{ left: `calc(${pos}% - 4px)`, background: "white", boxShadow: "0 0 8px white" }}
          />
        )}
        {/* Inactive overlay */}
        {!active && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="font-retro text-xs" style={{ color: "#555" }}>— WAIT FOR PITCH —</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Retro Scoreboard ─────────────────────────────────────────────────────────
function RetroScoreboard({ game }: { game: GameState }) {
  return (
    <div className="rounded-lg border-2 p-3" style={{ borderColor: "#f0c23a", background: "#0a0a14" }}>
      <div className="grid grid-cols-3 gap-2 mb-2">
        <div className="text-center">
          <div className="font-retro text-xs mb-1" style={{ color: "#888" }}>OUTLAWS</div>
          <div className="font-retro text-4xl" style={{ color: "#f0c23a" }}>{String(game.score.outlaws).padStart(2, "0")}</div>
        </div>
        <div className="text-center flex flex-col justify-center">
          <div className="font-retro text-xs mb-1" style={{ color: "#555" }}>INN</div>
          <div className="font-retro text-2xl" style={{ color: "#aaa" }}>{game.inning}</div>
          <div className="font-retro text-xs" style={{ color: "#555" }}>OF 9</div>
        </div>
        <div className="text-center">
          <div className="font-retro text-xs mb-1" style={{ color: "#888" }}>OPPS</div>
          <div className="font-retro text-4xl" style={{ color: "#888" }}>{String(game.score.opponent).padStart(2, "0")}</div>
        </div>
      </div>
      <div className="flex items-center justify-between border-t pt-2" style={{ borderColor: "#222" }}>
        {/* Outs */}
        <div className="flex items-center gap-1.5">
          <span className="font-retro text-xs" style={{ color: "#555" }}>OUT</span>
          {[0,1,2].map(i => <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: i < game.outs ? "#ef4444" : "#222", border: "1px solid #444" }} />)}
        </div>
        {/* Balls */}
        <div className="flex items-center gap-1.5">
          <span className="font-retro text-xs" style={{ color: "#555" }}>B</span>
          {[0,1,2,3].map(i => <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: i < game.balls ? "#22c55e" : "#222", border: "1px solid #444" }} />)}
        </div>
        {/* Strikes */}
        <div className="flex items-center gap-1.5">
          <span className="font-retro text-xs" style={{ color: "#555" }}>S</span>
          {[0,1,2].map(i => <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: i < game.strikes ? "#f97316" : "#222", border: "1px solid #444" }} />)}
        </div>
        <BaseDiamond bases={game.bases} />
      </div>
    </div>
  );
}

// ─── Field Scene ─────────────────────────────────────────────────────────────
function FieldScene({
  phase, ballX, ballY, swinging, batter, result, quality,
}: {
  phase: Phase; ballX: number; ballY: number; swinging: boolean;
  batter: Player; result: string | null; quality: Quality | null;
}) {
  const resultColor = quality === "perfect" ? "#22c55e" : quality === "good" ? "#eab308" : quality === "weak" ? "#f97316" : "#ef4444";

  return (
    <div className="relative rounded-lg overflow-hidden border-2" style={{ borderColor: "#333", height: 200 }}>
      {/* Sky */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, #1a3a6b 0%, #2855a0 50%, #1a3a6b 100%)" }} />
      {/* Stars */}
      {[...Array(12)].map((_, i) => (
        <div key={i} className="absolute w-0.5 h-0.5 rounded-full bg-white/60"
          style={{ left: `${(i * 37 + 7) % 95}%`, top: `${(i * 23 + 5) % 45}%` }} />
      ))}
      {/* Outfield wall */}
      <div className="absolute left-0 right-0 h-3 rounded-sm" style={{ top: "38%", background: "#4a2c0a", borderTop: "2px solid #7a4c1a" }}>
        <div className="absolute inset-0 flex gap-1 px-2 items-center overflow-hidden">
          {[...Array(20)].map((_, i) => <div key={i} className="w-1 h-full" style={{ background: i % 2 === 0 ? "#5a3c1a" : "#4a2c0a" }} />)}
        </div>
      </div>
      {/* Outfield green */}
      <div className="absolute left-0 right-0" style={{ top: "41%", bottom: "35%", background: "#1a5c2a" }}>
        {/* Grass stripes */}
        {[...Array(8)].map((_, i) => (
          <div key={i} className="absolute top-0 bottom-0 opacity-30" style={{ left: `${i * 12.5}%`, width: "6%", background: "#2a7c3a" }} />
        ))}
      </div>
      {/* Dirt infield */}
      <div className="absolute left-0 right-0" style={{ bottom: 0, height: "38%", background: "#8b5e3c" }}>
        {/* Dirt texture */}
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "repeating-linear-gradient(90deg, #6b4e2c 0, #6b4e2c 2px, transparent 2px, transparent 8px)" }} />
      </div>
      {/* Foul lines */}
      <div className="absolute" style={{ bottom: 0, left: "15%", height: "60%", width: 1, background: "rgba(255,255,255,0.3)", transform: "rotate(35deg)", transformOrigin: "bottom left" }} />
      <div className="absolute" style={{ bottom: 0, right: "15%", height: "60%", width: 1, background: "rgba(255,255,255,0.3)", transform: "rotate(-35deg)", transformOrigin: "bottom right" }} />
      {/* Home plate */}
      <div className="absolute" style={{ bottom: "6%", left: "67%", width: 12, height: 8, background: "white", clipPath: "polygon(0 0, 100% 0, 100% 60%, 50% 100%, 0 60%)" }} />

      {/* Pitcher */}
      <div className="absolute text-3xl select-none" style={{ left: "12%", bottom: "32%", transform: "scaleX(-1)" }}>🤠</div>

      {/* Batter */}
      <div className={`absolute text-3xl select-none transition-transform ${swinging ? "animate-swing" : ""}`}
        style={{ right: "8%", bottom: "30%" }}>🧑‍⚾</div>

      {/* Ball */}
      {(phase === "pitching" || phase === "flight") && (
        <div
          className="absolute w-4 h-4 rounded-full z-10 transition-none select-none flex items-center justify-center text-xs"
          style={{
            left: `${ballX}%`, bottom: `${ballY}%`,
            background: "white",
            boxShadow: "0 0 6px rgba(255,255,255,0.8)",
            transform: "translate(-50%, 50%)",
          }}
        >
          ⚾
        </div>
      )}

      {/* Result overlay */}
      {result && phase === "result" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center animate-result-pop">
            <div className="font-retro text-3xl px-4 py-2 rounded" style={{ color: resultColor, textShadow: `0 0 20px ${resultColor}`, background: "rgba(0,0,0,0.6)" }}>
              {result}
            </div>
          </div>
        </div>
      )}

      {/* Player name label */}
      <div className="absolute font-retro text-xs" style={{ right: "6%", bottom: "22%", color: "#f0c23a" }}>
        {batter.name.split(" ")[0].toUpperCase()}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface BattingGameProps { onBack: () => void; }

export function BattingGame({ onBack }: BattingGameProps) {
  const [lineup, setLineup] = useState<Player[]>([...SANDY_OUTLAWS_ROSTER]);
  const [currentBatterIndex, setCurrentBatterIndex] = useState(0);
  const [coachCall, setCoachCall] = useState<CoachCall | null>(null);
  const [direction, setDirection] = useState<Direction | null>(null);
  const [meterPos, setMeterPos] = useState(0);
  const meterDirRef = useRef<1 | -1>(1);
  const [ballX, setBallX] = useState(18);
  const [ballY, setBallY] = useState(42);
  const [swinging, setSwinging] = useState(false);
  const [quality, setQuality] = useState<Quality | null>(null);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [game, setGame] = useState<GameState>({
    score: { outlaws: 0, opponent: 0 },
    inning: 1, outs: 0, balls: 0, strikes: 0,
    bases: [false, false, false],
    phase: "lineup", resultType: null, resultText: null,
  });

  const clearAnim = () => { if (animRef.current) clearInterval(animRef.current); };

  // ─── Meter oscillation during pitching ──────────────────────────────────────
  useEffect(() => {
    if (game.phase !== "pitching") return;
    const speed = 1.2 + (game.inning - 1) * 0.1;
    animRef.current = setInterval(() => {
      setMeterPos(p => {
        const next = p + speed * meterDirRef.current;
        if (next >= 100) { meterDirRef.current = -1; return 100; }
        if (next <= 0) { meterDirRef.current = 1; return 0; }
        return next;
      });
    }, 16);
    return clearAnim;
  }, [game.phase, game.inning]);

  // ─── Ball pitch animation ────────────────────────────────────────────────────
  const startPitch = useCallback(() => {
    if (game.phase !== "idle" || !coachCall || !direction) return;
    setBallX(18); setBallY(42);
    setGame(prev => ({ ...prev, phase: "pitching" }));
    setQuality(null);
    meterDirRef.current = 1;
    setMeterPos(0);

    // Animate ball toward plate
    let t = 0;
    clearAnim();
    animRef.current = setInterval(() => {
      t += 0.04;
      setBallX(18 + t * 50);  // 18% → 68%
      setBallY(42 - t * 6);   // slight drop
      if (t >= 1) clearAnim();
    }, 16);

    // Auto-strike if no swing after 2s
    // (meter keeps running, player must click)
  }, [game.phase, coachCall, direction]);

  // ─── Swing ──────────────────────────────────────────────────────────────────
  const swing = useCallback(() => {
    if (game.phase !== "pitching") return;
    clearAnim();
    const q = getMeterQuality(meterPos);
    setQuality(q);
    setSwinging(true);
    setTimeout(() => setSwinging(false), 300);

    if (q === "miss") {
      // Strike - no flight
      applyResult({ type: "strike", text: "SWING AND MISS!" }, q);
      return;
    }

    const outcome = getOutcome(q, direction!, coachCall!);

    if (outcome.type === "out") {
      applyResult(outcome, q);
      return;
    }

    // Animate ball flight arc
    setGame(prev => ({ ...prev, phase: "flight" }));
    const targetX = direction === "pull" ? 12 : direction === "center" ? 42 : 72;
    const startX = 68; const startY = 36;
    let t = 0;
    clearAnim();
    animRef.current = setInterval(() => {
      t += 0.025;
      const x = startX + (targetX - startX) * t;
      const arc = Math.sin(t * Math.PI) * 45;  // parabolic arc
      const y = startY + (55 - startY) * t - arc;
      setBallX(x); setBallY(Math.max(5, y));
      if (t >= 1) {
        clearAnim();
        setTimeout(() => applyResult(outcome, q), 200);
      }
    }, 16);
  }, [game.phase, meterPos, direction, coachCall]);

  // ─── Apply result to game state ──────────────────────────────────────────────
  const applyResult = (outcome: { type: HitType; text: string }, q: Quality) => {
    setQuality(q);
    setGame(prev => {
      const next: GameState = { ...prev, phase: "result", resultType: outcome.type, resultText: outcome.text };

      if (outcome.type === "homer") {
        const runs = prev.bases.filter(Boolean).length + 1;
        next.score = { ...prev.score, outlaws: prev.score.outlaws + runs };
        next.bases = [false, false, false];
        next.balls = 0; next.strikes = 0;
      } else if (outcome.type === "single" || outcome.type === "double" || outcome.type === "triple") {
        const adv = outcome.type === "single" ? 1 : outcome.type === "double" ? 2 : 3;
        const nb: [boolean, boolean, boolean] = [false, false, false];
        let runs = 0;
        for (let b = 2; b >= 0; b--) {
          if (prev.bases[b]) { const nb2 = b + adv; if (nb2 >= 3) runs++; else nb[nb2] = true; }
        }
        if (adv - 1 < 3) nb[adv - 1] = true;
        next.score = { ...prev.score, outlaws: prev.score.outlaws + runs };
        next.bases = nb; next.balls = 0; next.strikes = 0;
      } else if (outcome.type === "ball") {
        const nb2 = prev.balls + 1;
        if (nb2 >= 4) {
          const bases: [boolean, boolean, boolean] = [...prev.bases] as [boolean, boolean, boolean];
          let runs = 0;
          if (bases[0] && bases[1] && bases[2]) runs++;
          if (bases[0] && bases[1]) bases[2] = true;
          if (bases[0]) bases[1] = true;
          bases[0] = true;
          next.balls = 0; next.strikes = 0;
          next.score = { ...prev.score, outlaws: prev.score.outlaws + runs };
          next.bases = bases;
        } else next.balls = nb2;
      } else {
        // strike or out
        const ns = prev.strikes + 1;
        if (ns >= 3) {
          const no = prev.outs + 1;
          next.strikes = 0; next.balls = 0;
          setCurrentBatterIndex(i => (i + 1) % lineup.length);
          setCoachCall(null); setDirection(null);
          if (no >= 3) {
            if (prev.inning >= 9) { next.phase = "gameover"; }
            else {
              next.outs = 0; next.inning = prev.inning + 1;
              next.bases = [false, false, false];
              next.score = { ...prev.score, opponent: prev.score.opponent + Math.floor(Math.random() * 2) };
            }
          } else next.outs = no;
        } else next.strikes = ns;
      }
      return next;
    });

    // Advance batter on hits
    if (["homer","single","double","triple"].includes(outcome.type)) {
      setCurrentBatterIndex(i => (i + 1) % lineup.length);
      setCoachCall(null); setDirection(null);
    }

    if (outcome.type !== "gameover") {
      setTimeout(() => {
        setBallX(18); setBallY(42);
        setGame(prev => prev.phase === "gameover" ? prev : { ...prev, phase: "idle", resultType: null, resultText: null });
      }, 1600);
    }
  };

  // ─── Keyboard ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        if (game.phase === "idle" && coachCall && direction) startPitch();
        else if (game.phase === "pitching") swing();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [game.phase, coachCall, direction, startPitch, swing]);

  const movePlayer = (from: number, to: number) => {
    setLineup(prev => { const n = [...prev]; const [m] = n.splice(from, 1); n.splice(to, 0, m); return n; });
  };

  const resetGame = () => {
    clearAnim();
    setGame({ score: { outlaws: 0, opponent: 0 }, inning: 1, outs: 0, balls: 0, strikes: 0, bases: [false,false,false], phase: "lineup", resultType: null, resultText: null });
    setCurrentBatterIndex(0); setCoachCall(null); setDirection(null);
    setMeterPos(0); setBallX(18); setBallY(42);
    setLineup([...SANDY_OUTLAWS_ROSTER]);
  };

  const currentBatter = lineup[currentBatterIndex];
  const readyToPlay = coachCall !== null && direction !== null;

  // ════════════════════════════════════════════════════════════════════════════
  // LINEUP SCREEN
  // ════════════════════════════════════════════════════════════════════════════
  if (game.phase === "lineup") {
    return (
      <div className="min-h-screen" style={{ background: "#0a0a14" }}>
        <div className="border-b" style={{ borderColor: "#f0c23a", background: "#0d0d1e" }}>
          <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-4">
            <button onClick={onBack} className="flex items-center gap-1.5 font-retro text-sm" style={{ color: "#888" }}>
              <ChevronLeft className="w-4 h-4" />BACK
            </button>
            <div className="h-5 w-px" style={{ background: "#f0c23a" }} />
            <div>
              <div className="font-retro text-xs" style={{ color: "#888" }}>DYNASTY BASEBALL</div>
              <div className="font-retro text-2xl" style={{ color: "#f0c23a" }}>SET LINEUP</div>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-6 py-8">
          <div className="font-retro text-xs mb-4 text-center animate-retro-blink" style={{ color: "#f0c23a" }}>
            ▶ ARRANGE BATTING ORDER ◀
          </div>
          <div className="rounded-lg border-2 overflow-hidden mb-6" style={{ borderColor: "#f0c23a", background: "#0d0d1e" }}>
            <div className="border-b px-5 py-2" style={{ borderColor: "#222", background: "#111" }}>
              <span className="font-retro text-xs" style={{ color: "#888" }}>BATTING ORDER — SANDY OUTLAWS</span>
            </div>
            {lineup.map((player, i) => (
              <div key={player.name} className="flex items-center gap-3 px-4 py-3 border-b group" style={{ borderColor: "#1a1a2a" }}>
                <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0 font-retro text-lg" style={{ background: "#f0c23a", color: "#0a0a14" }}>
                  {i + 1}
                </div>
                <span className="text-xl">{player.emoji}</span>
                <div className="flex-1">
                  <div className="font-retro text-sm" style={{ color: "#f0c23a" }}>{player.name}</div>
                  <div className="font-retro text-xs" style={{ color: "#666" }}>#{player.number} {player.position} · AVG {player.avg} · {player.hr}HR</div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button disabled={i === 0} onClick={() => movePlayer(i, i-1)}
                    className="w-7 h-7 font-retro text-xs border rounded disabled:opacity-30" style={{ borderColor: "#f0c23a", color: "#f0c23a", background: "#0a0a14" }}>↑</button>
                  <button disabled={i === lineup.length - 1} onClick={() => movePlayer(i, i+1)}
                    className="w-7 h-7 font-retro text-xs border rounded disabled:opacity-30" style={{ borderColor: "#f0c23a", color: "#f0c23a", background: "#0a0a14" }}>↓</button>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setGame(prev => ({ ...prev, phase: "idle" }))}
            className="w-full py-4 rounded-lg font-retro text-2xl border-2 transition-all hover:opacity-90"
            style={{ borderColor: "#f0c23a", background: "#f0c23a", color: "#0a0a14" }}
          >
            ▶ PLAY BALL ◀
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // GAME SCREEN
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0a0a14" }}>
      {/* Header */}
      <div className="border-b px-6 py-3 flex items-center gap-3" style={{ borderColor: "#222", background: "#0d0d1e" }}>
        <button onClick={onBack} className="font-retro text-xs" style={{ color: "#666" }}>◀ EXIT</button>
        <div className="h-4 w-px" style={{ background: "#333" }} />
        <span className="font-retro text-sm" style={{ color: "#f0c23a" }}>DYNASTY BASEBALL</span>
        <div className="ml-auto flex items-center gap-2 px-2 py-0.5 rounded border" style={{ borderColor: "#c2410c", background: "#2a0a0a" }}>
          <span className="font-retro text-xs" style={{ color: "#f97316" }}>🤠 COACH MODE</span>
        </div>
      </div>

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-4 flex flex-col gap-3">

        {/* Scoreboard */}
        <RetroScoreboard game={game} />

        {/* Current batter strip */}
        <div className="flex items-center gap-3 px-4 py-2 rounded border" style={{ borderColor: "#333", background: "#0d0d1e" }}>
          <span className="text-2xl">{currentBatter.emoji}</span>
          <div className="flex-1">
            <div className="font-retro text-sm" style={{ color: "#f0c23a" }}>{currentBatter.name.toUpperCase()}</div>
            <div className="font-retro text-xs" style={{ color: "#666" }}>#{currentBatter.number} · {currentBatter.position} · AVG {currentBatter.avg} · {currentBatter.hr} HR · {currentBatter.rbi} RBI</div>
          </div>
          <div className="font-retro text-xs text-right" style={{ color: "#555" }}>
            <div>BATTING</div>
            <div style={{ color: "#f0c23a" }}>#{currentBatterIndex + 1}</div>
          </div>
        </div>

        {/* Field scene */}
        <FieldScene
          phase={game.phase}
          ballX={ballX} ballY={ballY}
          swinging={swinging}
          batter={currentBatter}
          result={game.resultText}
          quality={quality}
        />

        {/* Power Meter */}
        <PowerMeter pos={meterPos} active={game.phase === "pitching"} />

        {/* Direction Selector */}
        <div>
          <div className="font-retro text-xs mb-2" style={{ color: "#888" }}>📍 AIM — WHERE TO HIT:</div>
          <div className="grid grid-cols-3 gap-2">
            {([
              { id: "pull" as Direction, label: "◄ PULL", sub: "Left field · Power", icon: "💪" },
              { id: "center" as Direction, label: "▼ CENTER", sub: "Center · Balanced", icon: "⚾" },
              { id: "oppo" as Direction, label: "OPPO ►", sub: "Right field · Contact", icon: "🎯" },
            ] as const).map(d => (
              <button key={d.id}
                onClick={() => { if (game.phase === "idle" || game.phase === "result") setDirection(d.id); }}
                disabled={game.phase === "pitching" || game.phase === "flight"}
                className="rounded border-2 py-2 px-1 text-center transition-all font-retro disabled:opacity-40"
                style={{
                  borderColor: direction === d.id ? "#f0c23a" : "#333",
                  background: direction === d.id ? "#1a1500" : "#0d0d1e",
                  color: direction === d.id ? "#f0c23a" : "#666",
                }}
              >
                <div className="text-lg mb-0.5">{d.icon}</div>
                <div className="text-xs">{d.label}</div>
                <div className="text-xs opacity-60">{d.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Coach Call */}
        <div>
          <div className="font-retro text-xs mb-2" style={{ color: "#888" }}>🤠 COACH'S CALL:</div>
          <div className="grid grid-cols-3 gap-2">
            {([
              { id: "swing" as CoachCall, label: "SWING AWAY", icon: "💥", sub: "Full power" },
              { id: "bunt" as CoachCall, label: "BUNT", icon: "🏃", sub: "Wide timing" },
              { id: "hitrun" as CoachCall, label: "HIT & RUN", icon: "🔥", sub: "Extra bases" },
            ] as const).map(c => (
              <button key={c.id}
                onClick={() => { if (game.phase === "idle" || game.phase === "result") setCoachCall(c.id); }}
                disabled={game.phase === "pitching" || game.phase === "flight"}
                className="rounded border-2 py-2 px-1 text-center transition-all font-retro disabled:opacity-40"
                style={{
                  borderColor: coachCall === c.id ? "#c2410c" : "#333",
                  background: coachCall === c.id ? "#1a0800" : "#0d0d1e",
                  color: coachCall === c.id ? "#f97316" : "#666",
                }}
              >
                <div className="text-lg mb-0.5">{c.icon}</div>
                <div className="text-xs">{c.label}</div>
                <div className="text-xs opacity-60">{c.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Action */}
        {game.phase !== "gameover" && (
          <div className="text-center">
            {game.phase === "idle" && (
              <button
                onClick={startPitch}
                disabled={!readyToPlay}
                className="w-full py-4 rounded-lg font-retro text-2xl border-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ borderColor: "#f0c23a", background: readyToPlay ? "#f0c23a" : "#111", color: readyToPlay ? "#0a0a14" : "#444" }}
              >
                {readyToPlay ? "▶ PITCH! (SPACE)" : "← SELECT AIM & CALL"}
              </button>
            )}
            {game.phase === "pitching" && (
              <button
                onClick={swing}
                className="w-full py-4 rounded-lg font-retro text-2xl border-2 animate-retro-blink"
                style={{ borderColor: "#ef4444", background: "#ef4444", color: "white" }}
              >
                ⚾ SWING! (SPACE)
              </button>
            )}
            {(game.phase === "flight" || game.phase === "result") && (
              <div className="py-4 font-retro text-lg animate-retro-blink" style={{ color: "#f0c23a" }}>
                . . . . .
              </div>
            )}
          </div>
        )}

        {/* Game Over */}
        {game.phase === "gameover" && (
          <div className="text-center py-4 animate-result-pop">
            <div className="font-retro text-3xl mb-2" style={{ color: "#f0c23a" }}>
              {game.score.outlaws > game.score.opponent ? "🏆 OUTLAWS WIN!" : game.score.outlaws === game.score.opponent ? "TIE GAME!" : "GAME OVER"}
            </div>
            <div className="font-retro text-lg mb-6" style={{ color: "#888" }}>
              OUTLAWS {game.score.outlaws} — {game.score.opponent} OPPS
            </div>
            <button onClick={resetGame} className="px-8 py-3 rounded-lg font-retro text-xl border-2" style={{ borderColor: "#f0c23a", background: "#f0c23a", color: "#0a0a14" }}>
              ▶ PLAY AGAIN
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
