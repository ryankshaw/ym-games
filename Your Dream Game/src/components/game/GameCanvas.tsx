import { useEffect, useRef, useState, useCallback } from 'react';
import { GameState, Keys, VIEW_W, VIEW_H } from './types';
import { createInitialState, createLevel2State, updateGame } from './engine';
import { render } from './renderer';

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const keysRef = useRef<Keys>({
    left: false, right: false, up: false,
    z: false, x: false, c: false, space: false, e: false,
  });
  const animRef = useRef<number>(0);
  const lastERef = useRef(false);
  const [started, setStarted] = useState(false);
  const [levelComplete, setLevelComplete] = useState(false);
  const [scale, setScale] = useState(1);

  // Responsive scaling
  useEffect(() => {
    const resize = () => {
      const isMobile = window.innerWidth < 768;
      const controlsH = isMobile ? 160 : 0;
      const maxW = window.innerWidth;
      const maxH = window.innerHeight - controlsH - 8;
      const sx = maxW / VIEW_W;
      const sy = maxH / VIEW_H;
      setScale(Math.min(sx, sy, 1.4));
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const keys = { ...keysRef.current };
    const ePressed = keys.e && !lastERef.current;
    lastERef.current = keys.e;
    const effectiveKeys = { ...keys, e: ePressed };

    stateRef.current = updateGame(stateRef.current, effectiveKeys, 1);

    if (stateRef.current.levelComplete && !levelComplete) {
      setLevelComplete(true);
    }

    render(ctx, stateRef.current, VIEW_W, VIEW_H);
    animRef.current = requestAnimationFrame(gameLoop);
  }, [levelComplete]);

  useEffect(() => {
    if (!started) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const k = keysRef.current;
      if (e.key === 'ArrowLeft'  || e.key === 'a') k.left  = true;
      if (e.key === 'ArrowRight' || e.key === 'd') k.right = true;
      if (e.key === 'ArrowUp'    || e.key === 'w') k.up    = true;
      if (e.key === 'z' || e.key === 'Z') k.z = true;
      if (e.key === 'x' || e.key === 'X') k.x = true;
      if (e.key === 'c' || e.key === 'C') k.c = true;
      if (e.key === ' ') { k.space = true; e.preventDefault(); }
      if (e.key === 'e' || e.key === 'E') k.e = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = keysRef.current;
      if (e.key === 'ArrowLeft'  || e.key === 'a') k.left  = false;
      if (e.key === 'ArrowRight' || e.key === 'd') k.right = false;
      if (e.key === 'ArrowUp'    || e.key === 'w') k.up    = false;
      if (e.key === 'z' || e.key === 'Z') k.z = false;
      if (e.key === 'x' || e.key === 'X') k.x = false;
      if (e.key === 'c' || e.key === 'C') k.c = false;
      if (e.key === ' ') k.space = false;
      if (e.key === 'e' || e.key === 'E') k.e = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    animRef.current = requestAnimationFrame(gameLoop);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      cancelAnimationFrame(animRef.current);
    };
  }, [started, gameLoop]);

  const handleRestart = () => {
    stateRef.current = createInitialState();
    setLevelComplete(false);
  };

  const handleNextLevel = () => {
    stateRef.current = createLevel2State();
    setLevelComplete(false);
  };

  // Touch helpers — prevent default to stop scroll
  const press = (key: keyof Keys) => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    keysRef.current[key] = true;
  };
  const release = (key: keyof Keys) => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    keysRef.current[key] = false;
  };

  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a14] px-4">
        <div className="text-center max-w-md w-full">
          <div className="mb-2 text-[#ffd700] text-xs tracking-widest uppercase font-mono opacity-60">
            an atmospheric puzzle-adventure
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif italic text-[#c8d8f8] mb-2">
            Shadows & Song
          </h1>
          <div className="w-32 h-px bg-gradient-to-r from-transparent via-[#ffd700] to-transparent mx-auto mb-5 opacity-50" />

          <p className="text-[#8090b0] text-sm mb-4 font-serif italic leading-relaxed">
            "In a fading world where light creates shadows —<br/>
            and shadows remember songs."
          </p>

          {/* Controls grid */}
          <div className="my-5 grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="bg-[#ffffff06] rounded-lg p-3 border border-[#ffffff10]">
              <div className="text-[#ffffff40] mb-2 text-[10px] uppercase tracking-wider">Move</div>
              <div className="text-[#a0b8e0]">← → Walk &nbsp; ↑ Jump</div>
            </div>
            <div className="bg-[#ffffff06] rounded-lg p-3 border border-[#ffffff10]">
              <div className="text-[#ffffff40] mb-2 text-[10px] uppercase tracking-wider">Interact</div>
              <div className="text-[#a0b8e0]">[E] Grab candle</div>
            </div>
            <div className="bg-[#ffffff06] rounded-lg p-3 border border-[#c6864220] col-span-2">
              <div className="text-[#ffffff40] mb-2 text-[10px] uppercase tracking-wider">Sing</div>
              <div className="flex justify-around">
                <span className="text-[#c68642]">Z Low</span>
                <span className="text-[#87ceeb]">X High</span>
                <span className="text-[#dda0dd]">C Whisper</span>
                <span className="text-[#e8e8e8]">Space Silence</span>
              </div>
            </div>
          </div>

          <p className="text-[#5060a0] text-xs mb-8 font-serif italic">
            Carry the candle. Sing to cast shadow platforms. Climb to the star.
          </p>

          <button
            onClick={() => setStarted(true)}
            className="w-full sm:w-auto px-12 py-4 border border-[#ffd700]/30 text-[#ffd700]
                       font-serif italic text-xl hover:bg-[#ffd700]/10 hover:border-[#ffd700]/60
                       transition-all duration-300 rounded-sm tracking-wide"
          >
            ✦ Begin ✦
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center bg-[#060610] overflow-hidden"
      style={{ height: '100dvh', touchAction: 'none' }}
    >
      {/* Canvas */}
      <div className="relative flex-shrink-0" style={{ marginTop: 4 }}>
        <canvas
          ref={canvasRef}
          width={VIEW_W}
          height={VIEW_H}
          className="block rounded-md shadow-2xl border border-[#ffffff08]"
          style={{
            width: VIEW_W * scale,
            height: VIEW_H * scale,
            imageRendering: 'crisp-edges',
          }}
        />
        {levelComplete && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
            {stateRef.current.level === 1 && (
              <button
                onClick={handleNextLevel}
                className="px-8 py-2 border border-[#c0d8ff]/50 text-[#c0d8ff] font-mono text-sm
                           hover:bg-[#c0d8ff]/10 transition-all duration-200 rounded-sm"
              >
                ✦ Chapter II: The Window Harp
              </button>
            )}
            <button
              onClick={handleRestart}
              className="px-6 py-2 border border-[#ffd700]/40 text-[#ffd700] font-mono text-sm
                         hover:bg-[#ffd700]/10 transition-all duration-200 rounded-sm"
            >
              ↺ Restart
            </button>
          </div>
        )}
      </div>

      {/* ── Mobile Controls ── */}
      <div
        className="flex w-full items-center justify-between px-3 py-2 gap-2 flex-shrink-0"
        style={{ maxWidth: VIEW_W * scale }}
      >
        {/* Left: D-pad */}
        <div className="flex flex-col items-center gap-1">
          {/* Jump row */}
          <TouchBtn label="↑" onPress={press('up')} onRelease={release('up')} size={52} />
          {/* Left / Right row */}
          <div className="flex gap-1">
            <TouchBtn label="←" onPress={press('left')} onRelease={release('left')} size={52} />
            <TouchBtn label="→" onPress={press('right')} onRelease={release('right')} size={52} />
          </div>
        </div>

        {/* Center: Grab */}
        <div className="flex flex-col items-center gap-1">
          <div className="text-[#ffffff30] text-[9px] font-mono uppercase tracking-wider mb-1">Grab</div>
          <TouchBtn
            label="⬡"
            onPress={press('e')}
            onRelease={release('e')}
            size={52}
            color="#a0b8e0"
            border="#a0b8e044"
          />
        </div>

        {/* Right: Tone buttons */}
        <div className="flex flex-col gap-1 items-end">
          <div className="text-[#ffffff30] text-[9px] font-mono uppercase tracking-wider mb-1">Sing</div>
          <div className="flex gap-1">
            <TouchBtn label="♩" sublabel="Low" onPress={press('z')} onRelease={release('z')} size={52} color="#c68642" border="#c6864244" />
            <TouchBtn label="♪" sublabel="High" onPress={press('x')} onRelease={release('x')} size={52} color="#87ceeb" border="#87ceeb44" />
          </div>
          <div className="flex gap-1">
            <TouchBtn label="♫" sublabel="Whisper" onPress={press('c')} onRelease={release('c')} size={52} color="#dda0dd" border="#dda0dd44" />
            <TouchBtn label="◼" sublabel="Silence" onPress={press('space')} onRelease={release('space')} size={52} color="#c8d8f8" border="#c8d8f844" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Reusable touch button ───────────────────
interface TouchBtnProps {
  label: string;
  sublabel?: string;
  onPress: (e: React.TouchEvent | React.MouseEvent) => void;
  onRelease: (e: React.TouchEvent | React.MouseEvent) => void;
  size?: number;
  color?: string;
  border?: string;
}

function TouchBtn({ label, sublabel, onPress, onRelease, size = 48, color = '#a0b0c8', border = '#ffffff22' }: TouchBtnProps) {
  return (
    <button
      className="flex flex-col items-center justify-center select-none rounded-lg
                 active:brightness-150 transition-colors duration-75 font-mono"
      style={{
        width: size,
        height: size,
        background: 'rgba(255,255,255,0.05)',
        border: `1.5px solid ${border}`,
        color,
        WebkitUserSelect: 'none',
        userSelect: 'none',
        touchAction: 'none',
      }}
      onTouchStart={onPress}
      onTouchEnd={onRelease}
      onTouchCancel={onRelease}
      onMouseDown={onPress}
      onMouseUp={onRelease}
      onMouseLeave={onRelease}
    >
      <span style={{ fontSize: size > 50 ? 18 : 15, lineHeight: 1 }}>{label}</span>
      {sublabel && (
        <span style={{ fontSize: 8, opacity: 0.5, marginTop: 2, lineHeight: 1 }}>{sublabel}</span>
      )}
    </button>
  );
}
