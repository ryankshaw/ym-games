import React, { useState, useEffect, useRef, useCallback } from 'react';
import GoalCanvas from './GoalCanvas';
import { AimPosition, GoalkeeperAction, KickPhase, GamePhase, Round, WobbleState } from './types';

const BALL_FLIGHT_MS = 650;
const SHOT_TIMER_MS = 2000; // 2 seconds — brutal
const WOBBLE_SPEED = 2.1;   // much faster chaotic drift
const WOBBLE_RADIUS = 0.38; // huge swing radius

const SHOT_ZONE_LABEL = (x: number, y: number) => {
  const col = x < 0.33 ? 'Left' : x < 0.67 ? 'Center' : 'Right';
  const row = y < 0.5 ? 'Top' : 'Bottom';
  return `${row} ${col}`;
};

// Brutal GK: 75% correct dive + heavily reads cursor hover
const getGKAction = (aimPos: AimPosition, gkLeaning: number): GoalkeeperAction => {
  const roll = Math.random();
  // Strong read of where you've been hovering
  const leanBias = gkLeaning * 0.25;
  if (aimPos.x < 0.38) {
    const correctChance = 0.75 + leanBias;
    return roll < correctChance ? 'left' : roll < correctChance + 0.18 ? 'right' : 'center';
  } else if (aimPos.x > 0.62) {
    const correctChance = 0.75 - leanBias;
    return roll < correctChance ? 'right' : roll < correctChance + 0.18 ? 'left' : 'center';
  } else {
    // Center — keeper almost always stays
    return roll < 0.82 ? 'center' : roll < 0.91 ? 'left' : 'right';
  }
};

// Ball drifts slightly from reticle — adds human error simulation
const applyBallDrift = (aimPos: AimPosition): AimPosition => {
  const drift = 0.07;
  return {
    x: Math.max(0, Math.min(1, aimPos.x + (Math.random() - 0.5) * drift * 2)),
    y: Math.max(0, Math.min(1, aimPos.y + (Math.random() - 0.5) * drift * 2)),
  };
};

// Scoring logic — brutal: only tight top corners reliably score
const didScore = (aimPos: AimPosition, gkAction: GoalkeeperAction): boolean => {
  const aimZone: GoalkeeperAction =
    aimPos.x < 0.38 ? 'left' : aimPos.x > 0.62 ? 'right' : 'center';

  if (gkAction === aimZone) {
    // Keeper guessed right — only absolute top corners sneak past
    const isTightTopCorner = aimPos.y < 0.18 && (aimPos.x < 0.10 || aimPos.x > 0.90);
    if (isTightTopCorner) return Math.random() < 0.45;
    const isTopCorner = aimPos.y < 0.22 && (aimPos.x < 0.15 || aimPos.x > 0.85);
    if (isTopCorner) return Math.random() < 0.22;
    return Math.random() < 0.06; // basically always saved
  }
  // Keeper guessed wrong — but world-class reflexes can still tip it
  if (aimPos.y > 0.55) return Math.random() < 0.55; // low shots often parried even wrong way
  if (aimPos.y > 0.35 && Math.abs(aimPos.x - 0.5) < 0.25) return Math.random() < 0.35; // mid center
  return true; // top corners on wrong side — always goal
};

interface SetupProps {
  onStart: (name: string, rounds: number) => void;
}

const Setup: React.FC<SetupProps> = ({ onStart }) => {
  const [name, setName] = useState('Player 1');
  const [rounds, setRounds] = useState(5);
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="text-8xl">⚽</div>
          <h1 className="font-display text-6xl text-[hsl(var(--soccer-green))] text-glow-green">PENALTY</h1>
          <p className="text-muted-foreground font-display text-xl tracking-widest">KICKS</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
          <div>
            <p className="font-display text-sm text-muted-foreground mb-2">YOUR NAME</p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={14}
              className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground font-display text-base focus:outline-none focus:border-[hsl(var(--soccer-green))] focus:ring-1 focus:ring-[hsl(var(--soccer-green))] transition-colors"
              placeholder="Enter your name"
            />
          </div>

          <div>
            <p className="font-display text-sm text-muted-foreground mb-3">ROUNDS</p>
            <div className="grid grid-cols-3 gap-2">
              {[3, 5, 7].map((r) => (
                <button
                  key={r}
                  onClick={() => setRounds(r)}
                  className={`py-3 rounded-xl font-display text-2xl transition-all duration-200 border ${
                    rounds === r
                      ? 'bg-[hsl(var(--soccer-green))] text-[hsl(var(--soccer-green-fg))] border-[hsl(var(--soccer-green))] scale-105'
                      : 'bg-muted text-muted-foreground border-border hover:border-[hsl(var(--soccer-green))] hover:text-foreground'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => onStart(name || 'Player 1', rounds)}
            className="w-full py-4 bg-[hsl(var(--soccer-green))] text-[hsl(var(--soccer-green-fg))] font-display text-2xl rounded-xl border-2 border-[hsl(var(--soccer-green))] hover:brightness-110 active:scale-95 transition-all duration-150"
            style={{ boxShadow: '0 0 30px hsl(var(--soccer-green) / 0.4)' }}
          >
            ⚽ TAKE THE PENALTY
          </button>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 space-y-2">
          <p className="font-display text-sm text-muted-foreground">HOW TO PLAY</p>
          <ul className="text-sm text-foreground space-y-1.5">
            <li>🖱️ Move cursor inside the goal — the <span className="text-destructive font-semibold">red reticle drifts wildly</span></li>
            <li>⚽ <span className="font-semibold">Click</span> when the reticle hits a top corner</li>
            <li>⏱️ Only <span className="text-destructive font-semibold">2 seconds</span> — then it auto-shoots!</li>
            <li>🧤 Keeper saves <span className="text-destructive font-semibold">75%+ of shots</span> — low shots always saved</li>
            <li>💨 Ball drifts slightly — precision is everything</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

const SoccerGame: React.FC = () => {
  const [gamePhase, setGamePhase] = useState<GamePhase>('setup');
  const [playerName, setPlayerName] = useState('Player 1');
  const [totalRounds, setTotalRounds] = useState(5);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [kickPhase, setKickPhase] = useState<KickPhase>('aiming');
  const [aimPos, setAimPos] = useState<AimPosition | null>(null);
  // Wobble state: autonomous reticle that drifts around
  const [wobble, setWobble] = useState<WobbleState>({ x: 0.5, y: 0.5 });
  const [goalkeeperAction, setGoalkeeperAction] = useState<GoalkeeperAction>('idle');
  const [gkLeaning, setGkLeaning] = useState(0);
  const [ballProgress, setBallProgress] = useState(0);
  const [shotResult, setShotResult] = useState<boolean | null>(null);
  const [shotTimer, setShotTimer] = useState(1);
  const [message, setMessage] = useState('');
  const [lockedAim, setLockedAim] = useState<AimPosition | null>(null);
  const [tick, setTick] = useState(0); // forces canvas redraws for feint/flash animations

  const animFrameRef = useRef<number>();
  const shotStartRef = useRef<number>(0);
  const wobbleTimeRef = useRef<number>(0);
  const wobbleAnimRef = useRef<number>();
  const timerStartRef = useRef<number>(0);
  const timerAnimRef = useRef<number>();
  const kickPhaseRef = useRef(kickPhase);
  const aimPosRef = useRef(aimPos);
  const wobbleRef = useRef(wobble);
  const gkLeaningRef = useRef(gkLeaning);
  kickPhaseRef.current = kickPhase;
  aimPosRef.current = aimPos;
  wobbleRef.current = wobble;
  gkLeaningRef.current = gkLeaning;

  const goals = rounds.filter((r) => r.goal === true).length;
  const misses = rounds.filter((r) => r.goal === false).length;

  // Wobble animation — chaotic multi-frequency drift
  useEffect(() => {
    if (kickPhase !== 'aiming') {
      cancelAnimationFrame(wobbleAnimRef.current!);
      return;
    }
    const animateWobble = (now: number) => {
      if (wobbleTimeRef.current === 0) wobbleTimeRef.current = now;
      const t = (now - wobbleTimeRef.current) / 1000;
      const cursor = aimPosRef.current ?? { x: 0.5, y: 0.5 };
      // Three overlapping frequencies for unpredictable chaos
      const wx = cursor.x
        + Math.sin(t * WOBBLE_SPEED) * WOBBLE_RADIUS * 0.45
        + Math.sin(t * WOBBLE_SPEED * 2.3 + 1.2) * WOBBLE_RADIUS * 0.3
        + Math.sin(t * WOBBLE_SPEED * 0.7 + 2.8) * WOBBLE_RADIUS * 0.25;
      const wy = cursor.y
        + Math.cos(t * WOBBLE_SPEED * 0.9 + 0.5) * WOBBLE_RADIUS * 0.4
        + Math.cos(t * WOBBLE_SPEED * 1.8 + 1.0) * WOBBLE_RADIUS * 0.3
        + Math.cos(t * WOBBLE_SPEED * 3.1 + 0.2) * WOBBLE_RADIUS * 0.15;
      const clamped = {
        x: Math.max(0.02, Math.min(0.98, wx)),
        y: Math.max(0.02, Math.min(0.98, wy)),
      };
      setWobble(clamped);
      setGkLeaning((clamped.x - 0.5) * 2.5);
      setTick((n) => n + 1); // trigger canvas redraw for feint & flash
      wobbleAnimRef.current = requestAnimationFrame(animateWobble);
    };
    wobbleAnimRef.current = requestAnimationFrame(animateWobble);
    return () => cancelAnimationFrame(wobbleAnimRef.current!);
  }, [kickPhase]);

  // Shot timer countdown
  useEffect(() => {
    if (kickPhase !== 'aiming') return;
    timerStartRef.current = performance.now();
    const animateTimer = (now: number) => {
      const elapsed = now - timerStartRef.current;
      const remaining = Math.max(0, 1 - elapsed / SHOT_TIMER_MS);
      setShotTimer(remaining);
      if (remaining <= 0) {
        // Time's up — auto shoot at current wobble position
        executeShot(wobbleRef.current);
        return;
      }
      timerAnimRef.current = requestAnimationFrame(animateTimer);
    };
    timerAnimRef.current = requestAnimationFrame(animateTimer);
    return () => cancelAnimationFrame(timerAnimRef.current!);
  }, [kickPhase]);

  const executeShot = useCallback((shootAt: AimPosition) => {
    cancelAnimationFrame(timerAnimRef.current!);
    cancelAnimationFrame(wobbleAnimRef.current!);
    const currentLeaning = gkLeaningRef.current;
    // Apply random ball drift — your aim isn't perfect under pressure!
    const driftedShot = applyBallDrift(shootAt);
    const gkAction = getGKAction(driftedShot, currentLeaning);
    const scored = didScore(driftedShot, gkAction);
    setLockedAim(driftedShot);
    setGoalkeeperAction(gkAction);
    setKickPhase('flying');
    setShotResult(null);
    setBallProgress(0);
    shotStartRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - shotStartRef.current;
      const progress = Math.min(elapsed / BALL_FLIGHT_MS, 1);
      setBallProgress(progress);
      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setShotResult(scored);
        setKickPhase('result');
        setMessage(scored
          ? `⚽ GOAL! ${SHOT_ZONE_LABEL(driftedShot.x, driftedShot.y)} — nice!`
          : `🧤 SAVED! Aim top corners ONLY!`
        );
        const newRound: Round = { kicked: true, goal: scored };
        setRounds((prev) => {
          const updated = [...prev, newRound];
          if (updated.length >= totalRounds) {
            setTimeout(() => setGamePhase('result'), 2400);
          } else {
            setTimeout(() => {
              setCurrentRound((r) => r + 1);
              setKickPhase('aiming');
              setAimPos(null);
              setLockedAim(null);
              setGoalkeeperAction('idle');
              setGkLeaning(0);
              setBallProgress(0);
              setShotResult(null);
              setShotTimer(1);
              setMessage('');
              wobbleTimeRef.current = 0;
            }, 2400);
          }
          return updated;
        });
      }
    };
    animFrameRef.current = requestAnimationFrame(animate);
  }, [totalRounds]);

  const handleShoot = useCallback(() => {
    if (kickPhaseRef.current !== 'aiming') return;
    // Shoot at the wobble reticle position, not the cursor
    executeShot(wobbleRef.current);
  }, [executeShot]);

  const handleAim = useCallback((pos: AimPosition) => {
    setAimPos(pos);
  }, []);

  const handleStart = (name: string, rnds: number) => {
    setPlayerName(name);
    setTotalRounds(rnds);
    setRounds([]);
    setCurrentRound(0);
    setKickPhase('aiming');
    setAimPos(null);
    setLockedAim(null);
    setGoalkeeperAction('idle');
    setGkLeaning(0);
    setBallProgress(0);
    setShotResult(null);
    setShotTimer(1);
    setMessage('');
    wobbleTimeRef.current = 0;
    setWobble({ x: 0.5, y: 0.5 });
    setGamePhase('playing');
  };

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current!);
      cancelAnimationFrame(wobbleAnimRef.current!);
      cancelAnimationFrame(timerAnimRef.current!);
    };
  }, []);

  if (gamePhase === 'setup') return <Setup onStart={handleStart} />;

  if (gamePhase === 'result') {
    const finalGoals = rounds.filter((r) => r.goal === true).length;
    const finalMisses = rounds.filter((r) => r.goal === false).length;
    const pct = Math.round((finalGoals / totalRounds) * 100);
    const rating = pct >= 80 ? '⭐⭐⭐ WORLD CLASS' : pct >= 60 ? '⭐⭐ PROFESSIONAL' : pct >= 40 ? '⭐ AMATEUR' : '💤 SUNDAY LEAGUE';
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
        <div className="text-center space-y-6 max-w-sm w-full">
          <div className="text-8xl">{pct >= 60 ? '🏆' : '😅'}</div>
          <h1 className="font-display text-5xl text-[hsl(var(--soccer-green))]">FULL TIME</h1>
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <p className="font-display text-2xl text-foreground">{playerName}</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-muted rounded-xl p-3">
                <p className="font-display text-3xl text-[hsl(var(--soccer-green))]">{finalGoals}</p>
                <p className="text-xs text-muted-foreground font-display">GOALS</p>
              </div>
              <div className="bg-muted rounded-xl p-3">
                <p className="font-display text-3xl text-destructive">{finalMisses}</p>
                <p className="text-xs text-muted-foreground font-display">SAVED</p>
              </div>
              <div className="bg-muted rounded-xl p-3">
                <p className="font-display text-3xl text-accent">{pct}%</p>
                <p className="text-xs text-muted-foreground font-display">RATE</p>
              </div>
            </div>
            <div className="bg-muted rounded-xl py-3 px-4">
              <p className="font-display text-sm text-accent">{rating}</p>
            </div>
          </div>
          <button
            onClick={() => setGamePhase('setup')}
            className="w-full py-4 bg-[hsl(var(--soccer-green))] text-[hsl(var(--soccer-green-fg))] font-display text-2xl rounded-xl hover:brightness-110 active:scale-95 transition-all"
            style={{ boxShadow: '0 0 30px hsl(var(--soccer-green) / 0.4)' }}
          >
            ⚽ PLAY AGAIN
          </button>
        </div>
      </div>
    );
  }

  const currentPlayer = playerName;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <h1 className="font-display text-2xl text-[hsl(var(--soccer-green))]" style={{ textShadow: '0 0 20px hsl(var(--soccer-green) / 0.5)' }}>
          ⚽ PENALTY KICKS
        </h1>
        <div className="flex items-center gap-3">
          <span className="font-display text-lg text-foreground">{goals} <span className="text-muted-foreground text-sm">/ {totalRounds}</span></span>
        </div>
        <button onClick={() => setGamePhase('setup')} className="text-muted-foreground hover:text-foreground text-sm font-display transition-colors">QUIT</button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 max-w-5xl mx-auto w-full">
        <div className="flex-1 flex flex-col gap-4">
          <div
            className="relative w-full rounded-2xl overflow-hidden border border-border"
            style={{ aspectRatio: '700/460' }}
          >
            <GoalCanvas
              aimPos={aimPos}
              wobble={wobble}
              kickPhase={kickPhase}
              ballProgress={ballProgress}
              goalkeeperAction={goalkeeperAction}
              gkLeaning={gkLeaning}
              shotResult={shotResult}
              shotTimer={shotTimer}
              tick={tick}
              onAim={handleAim}
              onShoot={handleShoot}
            />
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs font-display">ROUND</p>
                <p className="font-display text-2xl text-foreground">{Math.min(currentRound + 1, totalRounds)} <span className="text-muted-foreground text-base">/ {totalRounds}</span></p>
              </div>
              <div className="text-center">
                {kickPhase === 'aiming' && (
                  <p className="font-display text-sm animate-pulse" style={{ color: shotTimer < 0.4 ? 'hsl(0, 84%, 55%)' : shotTimer < 0.7 ? 'hsl(45, 95%, 55%)' : 'hsl(var(--soccer-green))' }}>
                    {shotTimer < 0.25 ? '🚨 SHOOT NOW!' : shotTimer < 0.5 ? '⚠️ HURRY!' : '🎯 AIM TOP CORNER'}
                  </p>
                )}
                {kickPhase === 'flying' && <p className="text-accent font-display text-sm">BALL IN THE AIR...</p>}
                {kickPhase === 'result' && (
                  <p className={`font-display text-sm ${shotResult ? 'text-[hsl(var(--soccer-green))]' : 'text-destructive'}`}>
                    {shotResult ? '✅ GOAL!' : '❌ SAVED!'}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-muted-foreground text-xs font-display">SCORE</p>
                <p className="font-display text-2xl text-[hsl(var(--soccer-green))]">{goals}</p>
              </div>
            </div>

            {message && (
              <div className={`text-center font-display py-2 px-4 rounded-xl text-sm ${
                shotResult
                  ? 'text-[hsl(var(--soccer-green))] bg-[hsl(var(--soccer-green)/0.1)] border border-[hsl(var(--soccer-green)/0.3)]'
                  : 'text-destructive bg-destructive/10 border border-destructive/30'
              }`}>
                {message}
              </div>
            )}
          </div>
        </div>

        <div className="lg:w-52 flex flex-col gap-3">
          <p className="font-display text-sm text-muted-foreground">KICK HISTORY</p>
          <div className="grid grid-cols-1 gap-2">
            {Array.from({ length: totalRounds }).map((_, i) => {
              const round = rounds[i];
              return (
                <div
                  key={i}
                  className={`rounded-xl p-3 border flex items-center justify-between transition-all ${
                    i === currentRound && kickPhase !== 'result'
                      ? 'border-[hsl(var(--soccer-green))] bg-card'
                      : round
                      ? round.goal
                        ? 'border-[hsl(var(--soccer-green)/0.5)] bg-[hsl(var(--soccer-green)/0.08)]'
                        : 'border-destructive/40 bg-destructive/5'
                      : 'border-border bg-muted opacity-50'
                  }`}
                >
                  <span className="font-display text-sm text-muted-foreground">KICK {i + 1}</span>
                  <span className="text-lg">
                    {round ? (round.goal ? '⚽' : '🧤') : i === currentRound ? '▶' : '·'}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="bg-card border border-border rounded-xl p-3 mt-auto space-y-2">
            <div className="flex justify-between">
              <span className="text-xs font-display text-muted-foreground">GOALS</span>
              <span className="text-sm font-display text-[hsl(var(--soccer-green))]">{goals}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs font-display text-muted-foreground">SAVED</span>
              <span className="text-sm font-display text-destructive">{misses}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SoccerGame;
