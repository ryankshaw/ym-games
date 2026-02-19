import { useEffect, useRef, useCallback } from "react";

export function useGameLoop(callback: (dt: number) => void, running: boolean) {
  const callbackRef = useRef(callback);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  callbackRef.current = callback;

  const loop = useCallback((time: number) => {
    const dt = Math.min((time - lastTimeRef.current) / 1000, 0.1);
    lastTimeRef.current = time;
    callbackRef.current(dt);
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => {
    if (!running) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, loop]);
}
