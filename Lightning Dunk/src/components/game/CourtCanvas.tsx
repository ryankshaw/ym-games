import React, { useRef, useEffect } from 'react';
import { BallState } from './types';

interface CourtCanvasProps {
  ballState: BallState;
  shotPhase: string;
  power: number;
}

const HOOP_X = 0.78;
const HOOP_Y = 0.38;
const BALL_START_X = 0.2;
const BALL_START_Y = 0.65;

const CourtCanvas: React.FC<CourtCanvasProps> = ({ ballState, shotPhase, power }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trailRef = useRef<{ x: number; y: number }[]>([]);

  useEffect(() => {
    if (ballState.visible && shotPhase === 'shooting') {
      trailRef.current.push({ x: ballState.x, y: ballState.y });
      if (trailRef.current.length > 12) trailRef.current.shift();
    } else if (!ballState.visible) {
      trailRef.current = [];
    }
  }, [ballState, shotPhase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    // Clear
    ctx.clearRect(0, 0, W, H);

    // ---- COURT FLOOR ----
    const floorGrad = ctx.createLinearGradient(0, H * 0.55, 0, H);
    floorGrad.addColorStop(0, 'hsl(30, 55%, 28%)');
    floorGrad.addColorStop(1, 'hsl(28, 50%, 18%)');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, H * 0.55, W, H * 0.45);

    // Court lines
    ctx.strokeStyle = 'hsl(35, 70%, 55%, 0.3)';
    ctx.lineWidth = 2;
    // Free throw line
    ctx.beginPath();
    ctx.moveTo(W * 0.05, H * 0.55);
    ctx.lineTo(W * 0.55, H * 0.55);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(W * 0.05, H * 0.55);
    ctx.lineTo(W * 0.05, H);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(W * 0.55, H * 0.55);
    ctx.lineTo(W * 0.55, H);
    ctx.stroke();

    // Lane lines
    ctx.strokeStyle = 'hsl(35, 70%, 55%, 0.2)';
    ctx.beginPath();
    ctx.moveTo(W * 0.12, H * 0.55);
    ctx.lineTo(W * 0.12, H);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(W * 0.48, H * 0.55);
    ctx.lineTo(W * 0.48, H);
    ctx.stroke();

    // ---- BACKBOARD ----
    const bx = W * HOOP_X + 30;
    const by = H * HOOP_Y - 45;
    ctx.fillStyle = 'hsl(200, 20%, 85%)';
    ctx.strokeStyle = 'hsl(200, 20%, 95%)';
    ctx.lineWidth = 3;
    ctx.fillRect(bx - 8, by, 16, 80);
    ctx.strokeRect(bx - 8, by, 16, 80);
    // Square on backboard
    ctx.strokeStyle = 'hsl(220, 60%, 60%)';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx - 6, by + 25, 12, 18);

    // ---- POLE ----
    ctx.fillStyle = 'hsl(200, 10%, 50%)';
    ctx.fillRect(bx - 5, H * 0.55, 10, H - H * 0.55);

    // ---- HOOP ----
    const hoopX = W * HOOP_X;
    const hoopY = H * HOOP_Y;
    const hoopR = 28;

    // Hoop shadow
    ctx.save();
    ctx.shadowColor = 'hsl(25, 95%, 53%)';
    ctx.shadowBlur = 15;
    ctx.strokeStyle = 'hsl(25, 95%, 53%)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(hoopX, hoopY, hoopR, 8, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Net
    ctx.strokeStyle = 'hsl(40, 80%, 85%, 0.7)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const topX = hoopX + Math.cos(angle) * hoopR;
      const topY = hoopY + Math.sin(angle) * 8;
      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.lineTo(hoopX + Math.cos(angle) * 10, hoopY + 40);
      ctx.stroke();
    }
    // Net bottom
    ctx.beginPath();
    ctx.ellipse(hoopX, hoopY + 40, 10, 3, 0, 0, Math.PI * 2);
    ctx.stroke();

    // ---- TRAJECTORY PREVIEW (when idle) ----
    if (shotPhase === 'idle' || shotPhase === 'charging') {
      const startX = W * BALL_START_X;
      const startY = H * BALL_START_Y;
      const t = Math.min(power / 100, 1);
      ctx.save();
      ctx.setLineDash([6, 8]);
      ctx.strokeStyle = `hsl(45, 95%, 55%, ${0.15 + t * 0.3})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      // Simple parabola preview
      for (let i = 0; i <= 20; i++) {
        const frac = i / 20;
        const px = startX + (hoopX - startX) * frac;
        const py = startY + (hoopY - startY) * frac - Math.sin(Math.PI * frac) * (150 + t * 80);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
    }

    // ---- BALL TRAIL ----
    if (shotPhase === 'shooting') {
      trailRef.current.forEach((pt, i) => {
        const alpha = (i / trailRef.current.length) * 0.4;
        const radius = 14 * (i / trailRef.current.length);
        ctx.beginPath();
        ctx.arc(pt.x * W, pt.y * H, radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(25, 95%, 53%, ${alpha})`;
        ctx.fill();
      });
    }

    // ---- BASKETBALL ----
    if (ballState.visible) {
      const bx = ballState.x * W;
      const by = ballState.y * H;
      const r = 18;

      // Ball glow
      ctx.save();
      ctx.shadowColor = 'hsl(25, 95%, 70%)';
      ctx.shadowBlur = 20;

      // Ball body
      const ballGrad = ctx.createRadialGradient(bx - 4, by - 4, 2, bx, by, r);
      ballGrad.addColorStop(0, 'hsl(30, 100%, 70%)');
      ballGrad.addColorStop(0.6, 'hsl(25, 95%, 53%)');
      ballGrad.addColorStop(1, 'hsl(20, 85%, 35%)');
      ctx.fillStyle = ballGrad;
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.fill();

      // Ball lines
      ctx.strokeStyle = 'hsl(15, 60%, 25%, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.stroke();
      // Vertical seam
      ctx.beginPath();
      ctx.moveTo(bx, by - r);
      ctx.bezierCurveTo(bx + r * 0.5, by - r * 0.3, bx + r * 0.5, by + r * 0.3, bx, by + r);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx, by - r);
      ctx.bezierCurveTo(bx - r * 0.5, by - r * 0.3, bx - r * 0.5, by + r * 0.3, bx, by + r);
      ctx.stroke();
      // Horizontal seam
      ctx.beginPath();
      ctx.moveTo(bx - r, by);
      ctx.bezierCurveTo(bx - r * 0.3, by - r * 0.4, bx + r * 0.3, by - r * 0.4, bx + r, by);
      ctx.stroke();

      ctx.restore();
    }

    // ---- STARTING POSITION MARKER ----
    if (shotPhase === 'idle' || shotPhase === 'charging') {
      const sx = W * BALL_START_X;
      const sy = H * BALL_START_Y;
      ctx.save();
      ctx.strokeStyle = 'hsl(45, 95%, 55%, 0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(sx, sy, 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // MADE / MISSED overlay text
    if (shotPhase === 'result' && ballState.made !== null) {
      ctx.save();
      const text = ballState.made ? 'SWISH!' : 'MISSED!';
      const color = ballState.made ? 'hsl(45, 95%, 55%)' : 'hsl(0, 84%, 55%)';
      ctx.font = 'bold 900 56px "Barlow Condensed", sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = color;
      ctx.shadowBlur = 30;
      ctx.fillStyle = color;
      ctx.fillText(text, W / 2, H * 0.3);
      ctx.restore();
    }
  }, [ballState, shotPhase, power]);

  return (
    <canvas
      ref={canvasRef}
      width={700}
      height={420}
      className="w-full h-full rounded-xl"
      style={{ background: 'linear-gradient(180deg, hsl(220 40% 8%) 0%, hsl(220 35% 12%) 50%, hsl(30 55% 28%) 55%)' }}
    />
  );
};

export default CourtCanvas;
export { HOOP_X, HOOP_Y, BALL_START_X, BALL_START_Y };
