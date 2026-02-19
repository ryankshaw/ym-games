import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CourtCanvas, { HOOP_X, HOOP_Y, BALL_START_X, BALL_START_Y } from './CourtCanvas';
import PlayerCard from './PlayerCard';
import PowerBar from './PowerBar';
import { Player, GamePhase, ShotPhase, BallState } from './types';

const MAX_STRIKES = 3;
const POWER_SPEED = 1.8; // how fast power oscillates

interface GameSetupProps {
  onStart: (players: Player[]) => void;
}

const GameSetup: React.FC<GameSetupProps> = ({ onStart }) => {
  const [playerCount, setPlayerCount] = useState(2);
  const [names, setNames] = useState<string[]>(['Player 1', 'Player 2', 'Player 3', 'Player 4']);

  const handleStart = () => {
    const players: Player[] = names.slice(0, playerCount).map((name, i) => ({
      id: i,
      name,
      strikes: 0,
      isEliminated: false,
      isActive: i === 0,
    }));
    onStart(players);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="text-8xl">🏀</div>
          <h1 className="font-display text-6xl text-primary text-glow">LIGHTNING</h1>
          <p className="text-muted-foreground font-display text-xl tracking-widest">BASKETBALL</p>
        </div>

        {/* Player count */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
          <div>
            <p className="font-display text-sm text-muted-foreground mb-3">NUMBER OF PLAYERS</p>
            <div className="grid grid-cols-3 gap-2">
              {[2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => setPlayerCount(n)}
                  className={`py-3 rounded-xl font-display text-2xl transition-all duration-200 border ${
                    playerCount === n
                      ? 'bg-primary text-primary-foreground border-primary glow-orange scale-105'
                      : 'bg-muted text-muted-foreground border-border hover:border-primary hover:text-foreground'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Player names */}
          <div className="space-y-3">
            <p className="font-display text-sm text-muted-foreground">PLAYER NAMES</p>
            {Array.from({ length: playerCount }).map((_, i) => (
              <div key={i} className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">🏀</span>
                <input
                  type="text"
                  value={names[i]}
                  onChange={(e) => {
                    const newNames = [...names];
                    newNames[i] = e.target.value;
                    setNames(newNames);
                  }}
                  className="w-full bg-muted border border-border rounded-xl pl-9 pr-4 py-2.5 text-foreground font-display text-base focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  placeholder={`Player ${i + 1}`}
                  maxLength={12}
                />
              </div>
            ))}
          </div>

          <button
            onClick={handleStart}
            className="w-full py-4 bg-primary text-primary-foreground font-display text-2xl rounded-xl border-2 border-primary hover:brightness-110 active:scale-95 transition-all duration-150 glow-orange"
          >
            ⚡ START GAME
          </button>
        </div>

        {/* Rules */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-2">
          <p className="font-display text-muted-foreground text-sm">HOW TO PLAY</p>
          <ul className="text-sm text-foreground space-y-1.5">
            <li>⚡ Press & hold <kbd className="bg-muted px-1.5 py-0.5 rounded text-xs">SPACE</kbd> or tap & hold to charge power</li>
            <li>🎯 Release in the <span className="text-primary font-semibold">sweet spot</span> to score</li>
            <li>❌ Miss 3 shots = <span className="text-destructive font-semibold">ELIMINATED</span></li>
            <li>🏆 Last player standing wins!</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// Physics simulation
function simulateBall(startX: number, startY: number, power: number, canvasW: number, canvasH: number) {
  const hoopX = HOOP_X * canvasW;
  const hoopY = HOOP_Y * canvasH;

  // Target: vary based on power. Perfect power = perfect arc
  const sweetSpot = 60; // ideal power
  const powerDiff = power - sweetSpot;
  const accuracy = 1 - Math.abs(powerDiff) / 60;

  // Add slight random miss
  const miss = (Math.random() - 0.5) * (1 - accuracy) * 40;
  const targetX = hoopX + miss;
  const targetY = hoopY + miss * 0.3;

  const dx = targetX - startX;
  const dy = targetY - startY;
  const t = 60; // frames
  const vx = dx / t;
  const gravity = 0.5;
  const vy = dy / t - 0.5 * gravity * t;

  const frames: { x: number; y: number }[] = [];
  let x = startX;
  let y = startY;
  let velY = vy;
  for (let i = 0; i < t; i++) {
    x += vx;
    y += velY;
    velY += gravity;
    frames.push({ x: x / canvasW, y: y / canvasH });
  }

  const finalX = frames[frames.length - 1].x;
  const finalY = frames[frames.length - 1].y;
  const made =
    accuracy > 0.55 &&
    Math.abs(finalX - HOOP_X) < 0.055 &&
    Math.abs(finalY - HOOP_Y) < 0.08;

  return { frames, made };
}

const BasketballGame: React.FC = () => {
  const navigate = useNavigate();
  const [gamePhase, setGamePhase] = useState<GamePhase>('setup');
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [shotPhase, setShotPhase] = useState<ShotPhase>('idle');
  const [power, setPower] = useState(0);
  const [powerDir, setPowerDir] = useState(1);
  const [ballState, setBallState] = useState<BallState>({
    x: BALL_START_X, y: BALL_START_Y, vx: 0, vy: 0, visible: false, made: null,
  });
  const [shotFrames, setShotFrames] = useState<{ x: number; y: number }[]>([]);
  const [frameIndex, setFrameIndex] = useState(0);
  const [message, setMessage] = useState('');
  const [winner, setWinner] = useState<Player | null>(null);

  const powerRef = useRef(power);
  const powerDirRef = useRef(powerDir);
  const shotPhaseRef = useRef(shotPhase);
  powerRef.current = power;
  powerDirRef.current = powerDir;
  shotPhaseRef.current = shotPhase;

  const CANVAS_W = 700;
  const CANVAS_H = 420;

  // Power bar animation
  useEffect(() => {
    if (shotPhase !== 'charging') return;
    const interval = setInterval(() => {
      setPower((p) => {
        const newP = p + powerDirRef.current * POWER_SPEED;
        if (newP >= 100) { setPowerDir(-1); return 100; }
        if (newP <= 0) { setPowerDir(1); return 0; }
        return newP;
      });
    }, 16);
    return () => clearInterval(interval);
  }, [shotPhase]);

  // Ball animation
  useEffect(() => {
    if (shotPhase !== 'shooting' || shotFrames.length === 0) return;
    const interval = setInterval(() => {
      setFrameIndex((i) => {
        if (i >= shotFrames.length - 1) {
          clearInterval(interval);
          return i;
        }
        return i + 1;
      });
    }, 16);
    return () => clearInterval(interval);
  }, [shotPhase, shotFrames]);

  useEffect(() => {
    if (shotPhase !== 'shooting' || shotFrames.length === 0) return;
    const frame = shotFrames[frameIndex];
    if (frame) {
      setBallState((b) => ({ ...b, x: frame.x, y: frame.y }));
    }
    if (frameIndex >= shotFrames.length - 1) {
      // Shot complete
      setTimeout(() => {
        const made = ballState.made !== null ? ballState.made : false;
        setShotPhase('result');
        setBallState((b) => ({ ...b, visible: true }));
      }, 100);
    }
  }, [frameIndex, shotFrames]);

  // After result, advance turn
  useEffect(() => {
    if (shotPhase !== 'result') return;
    const timer = setTimeout(() => {
      advanceTurn(ballState.made === true);
    }, 2000);
    return () => clearTimeout(timer);
  }, [shotPhase]);

  const getActivePlayers = (ps: Player[]) => ps.filter((p) => !p.isEliminated);

  const advanceTurn = useCallback(
    (made: boolean) => {
      setPlayers((prev) => {
        const updated = [...prev];
        const current = { ...updated[currentPlayerIndex] };
        if (!made) {
          current.strikes += 1;
          if (current.strikes >= MAX_STRIKES) {
            current.isEliminated = true;
            setMessage(`${current.name} is OUT! ⚡`);
          } else {
            setMessage(`${current.name} missed! ${MAX_STRIKES - current.strikes} strike${MAX_STRIKES - current.strikes !== 1 ? 's' : ''} left`);
          }
        } else {
          setMessage(`${current.name} scored! 🏀`);
        }
        updated[currentPlayerIndex] = current;

        // Check for winner
        const stillIn = updated.filter((p) => !p.isEliminated);
        if (stillIn.length === 1) {
          setTimeout(() => {
            setWinner(stillIn[0]);
            setGamePhase('result');
          }, 1500);
          return updated;
        }

        // Find next active player
        let next = (currentPlayerIndex + 1) % updated.length;
        while (updated[next].isEliminated) {
          next = (next + 1) % updated.length;
        }
        setTimeout(() => {
          setCurrentPlayerIndex(next);
          setShotPhase('idle');
          setPower(0);
          setPowerDir(1);
          setBallState({ x: BALL_START_X, y: BALL_START_Y, vx: 0, vy: 0, visible: false, made: null });
          setShotFrames([]);
          setFrameIndex(0);
          setMessage('');
        }, 1800);

        return updated;
      });
    },
    [currentPlayerIndex]
  );

  const handleShoot = useCallback(() => {
    if (shotPhaseRef.current === 'idle') {
      setShotPhase('charging');
      setPower(0);
      setPowerDir(1);
    } else if (shotPhaseRef.current === 'charging') {
      const p = powerRef.current;
      const { frames, made } = simulateBall(
        BALL_START_X * CANVAS_W,
        BALL_START_Y * CANVAS_H,
        p,
        CANVAS_W,
        CANVAS_H
      );
      setShotFrames(frames);
      setFrameIndex(0);
      setBallState({ x: BALL_START_X, y: BALL_START_Y, vx: 0, vy: 0, visible: true, made });
      setShotPhase('shooting');
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleShoot();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleShoot]);

  const handleStart = (newPlayers: Player[]) => {
    setPlayers(newPlayers);
    setCurrentPlayerIndex(0);
    setShotPhase('idle');
    setPower(0);
    setBallState({ x: BALL_START_X, y: BALL_START_Y, vx: 0, vy: 0, visible: false, made: null });
    setWinner(null);
    setMessage('');
    setGamePhase('playing');
  };

  if (gamePhase === 'setup') {
    return <GameSetup onStart={handleStart} />;
  }

  if (gamePhase === 'result' && winner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
        <div className="text-center space-y-6 max-w-sm">
          <div className="text-8xl animate-bounce">🏆</div>
          <h1 className="font-display text-5xl text-accent text-glow">WINNER!</h1>
          <div className="bg-card border border-accent rounded-2xl p-8">
            <p className="font-display text-4xl text-foreground">{winner.name}</p>
            <p className="text-muted-foreground mt-2">Last player standing!</p>
          </div>
          <button
            onClick={() => setGamePhase('setup')}
            className="w-full py-4 bg-primary text-primary-foreground font-display text-2xl rounded-xl border-2 border-primary hover:brightness-110 active:scale-95 transition-all glow-orange"
          >
            ⚡ PLAY AGAIN
          </button>
        </div>
      </div>
    );
  }

  const currentPlayer = players[currentPlayerIndex];
  const activePlayers = getActivePlayers(players);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <h1 className="font-display text-2xl text-primary text-glow">⚡ LIGHTNING</h1>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm font-display">{activePlayers.length} PLAYERS LEFT</span>
        </div>
        <button
          onClick={() => navigate('/')}
          className="text-muted-foreground hover:text-foreground text-sm font-display transition-colors"
        >
          QUIT
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 max-w-6xl mx-auto w-full">
        {/* Court */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Canvas */}
          <div
            className="relative w-full rounded-2xl overflow-hidden border border-border"
            style={{ aspectRatio: '700/420' }}
            onClick={handleShoot}
            onTouchStart={(e) => { e.preventDefault(); handleShoot(); }}
          >
            <CourtCanvas ballState={ballState} shotPhase={shotPhase} power={power} />
          </div>

          {/* Controls */}
          <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
            {/* Current player info */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs font-display">NOW SHOOTING</p>
                <p className="font-display text-2xl text-primary">{currentPlayer?.name}</p>
              </div>
              <div className="text-right">
                {shotPhase === 'idle' && (
                  <p className="text-muted-foreground text-sm font-display">PRESS SPACE OR TAP COURT</p>
                )}
                {shotPhase === 'charging' && (
                  <p className="text-accent text-sm font-display animate-pulse">RELEASE TO SHOOT!</p>
                )}
                {shotPhase === 'shooting' && (
                  <p className="text-primary text-sm font-display">IN THE AIR...</p>
                )}
                {shotPhase === 'result' && (
                  <p className={`text-sm font-display ${ballState.made ? 'text-accent' : 'text-destructive'}`}>
                    {ballState.made ? '✅ MADE IT!' : '❌ MISSED!'}
                  </p>
                )}
              </div>
            </div>

            {/* Power bar - show when charging or idle */}
            {(shotPhase === 'charging' || shotPhase === 'idle') && (
              <PowerBar power={power} isCharging={shotPhase === 'charging'} />
            )}

            {/* Message */}
            {message && (
              <div className={`text-center font-display text-lg py-2 rounded-xl ${
                message.includes('OUT') ? 'text-destructive bg-destructive/10 border border-destructive/30' :
                message.includes('scored') ? 'text-accent bg-accent/10 border border-accent/30' :
                'text-muted-foreground bg-muted border border-border'
              }`}>
                {message}
              </div>
            )}

            {/* Shoot button for mobile */}
            <button
              onClick={handleShoot}
              className={`w-full py-4 font-display text-xl rounded-xl transition-all duration-150 active:scale-95 border-2 ${
                shotPhase === 'idle'
                  ? 'bg-primary text-primary-foreground border-primary glow-orange'
                  : shotPhase === 'charging'
                  ? 'bg-accent text-accent-foreground border-accent animate-pulse'
                  : 'bg-muted text-muted-foreground border-border opacity-50 cursor-not-allowed'
              }`}
              disabled={shotPhase === 'shooting' || shotPhase === 'result'}
            >
              {shotPhase === 'idle' ? '🏀 CHARGE SHOT' : shotPhase === 'charging' ? '🚀 RELEASE!' : '...'}
            </button>
          </div>
        </div>

        {/* Players sidebar */}
        <div className="lg:w-56 flex flex-col gap-3">
          <p className="font-display text-sm text-muted-foreground">PLAYERS</p>
          {players.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              isCurrentTurn={player.id === currentPlayer?.id && shotPhase !== 'result'}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default BasketballGame;
