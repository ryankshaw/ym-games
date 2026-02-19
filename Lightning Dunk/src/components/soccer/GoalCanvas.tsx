import React, { useRef, useEffect, useCallback } from 'react';
import { AimPosition, GoalkeeperAction, KickPhase, WobbleState } from './types';

interface GoalCanvasProps {
  aimPos: AimPosition | null;
  wobble: WobbleState;
  kickPhase: KickPhase;
  ballProgress: number;
  goalkeeperAction: GoalkeeperAction;
  gkLeaning: number;
  shotResult: boolean | null;
  shotTimer: number;
  tick: number; // forces canvas re-render every frame for animations
  onAim: (pos: AimPosition) => void;
  onShoot: () => void;
}

const GOAL = { x: 0.15, y: 0.15, w: 0.70, h: 0.45 };
const BALL_START = { x: 0.50, y: 0.92 };
const GK_BASE_Y = 0.52;

const GoalCanvas: React.FC<GoalCanvasProps> = ({
  aimPos,
  wobble,
  kickPhase,
  ballProgress,
  goalkeeperAction,
  gkLeaning,
  shotResult,
  shotTimer,
  tick,
  onAim,
  onShoot,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const getCanvasPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0]?.clientX ?? 0;
      clientY = e.touches[0]?.clientY ?? 0;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;
    const W = canvas.width;
    const H = canvas.height;
    const goalLeft = GOAL.x * W;
    const goalTop = GOAL.y * H;
    const goalW = GOAL.w * W;
    const goalH = GOAL.h * H;
    const relX = Math.max(0, Math.min(1, (canvasX - goalLeft) / goalW));
    const relY = Math.max(0, Math.min(1, (canvasY - goalTop) / goalH));
    return { x: relX, y: relY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (kickPhase !== 'aiming') return;
    const pos = getCanvasPos(e);
    if (pos) onAim({ x: pos.x, y: pos.y });
  }, [kickPhase, getCanvasPos, onAim]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (kickPhase !== 'aiming') return;
    onShoot();
  }, [kickPhase, onShoot]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (kickPhase !== 'aiming') return;
    e.preventDefault();
    onShoot();
  }, [kickPhase, onShoot]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (kickPhase !== 'aiming') return;
    e.preventDefault();
    const pos = getCanvasPos(e);
    if (pos) onAim({ x: pos.x, y: pos.y });
  }, [kickPhase, getCanvasPos, onAim]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    // --- SKY / STADIUM ---
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.6);
    skyGrad.addColorStop(0, 'hsl(220, 50%, 8%)');
    skyGrad.addColorStop(1, 'hsl(220, 40%, 14%)');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H * 0.65);

    // Stadium lights glow
    const lightPositions = [{ x: 0.05, y: 0.08 }, { x: 0.95, y: 0.08 }];
    lightPositions.forEach(({ x, y }) => {
      const grd = ctx.createRadialGradient(x * W, y * H, 2, x * W, y * H, W * 0.25);
      grd.addColorStop(0, 'hsl(55, 100%, 90%, 0.8)');
      grd.addColorStop(0.3, 'hsl(55, 100%, 80%, 0.15)');
      grd.addColorStop(1, 'hsl(55, 100%, 70%, 0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H * 0.5);
      ctx.fillStyle = 'hsl(200, 10%, 55%)';
      ctx.fillRect(x * W - 3, y * H + 15, 6, H * 0.5);
      ctx.fillStyle = 'hsl(55, 100%, 90%)';
      ctx.fillRect(x * W - 12, y * H, 24, 10);
    });

    // Crowd silhouettes
    ctx.fillStyle = 'hsl(220, 30%, 18%)';
    ctx.fillRect(0, H * 0.04, W, H * 0.12);
    for (let i = 0; i < 60; i++) {
      const cx = (i / 60) * W + Math.sin(i * 2.1) * 5;
      const cy = H * 0.05 + Math.sin(i * 3.7) * 10;
      ctx.fillStyle = `hsl(${220 + (i % 20) * 5}, 30%, ${15 + (i % 5) * 2}%)`;
      ctx.beginPath();
      ctx.arc(cx, cy + 14, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - 5, cy + 18, 10, 14);
    }

    // --- GRASS ---
    const grassGrad = ctx.createLinearGradient(0, H * 0.55, 0, H);
    grassGrad.addColorStop(0, 'hsl(130, 55%, 22%)');
    grassGrad.addColorStop(1, 'hsl(130, 50%, 17%)');
    ctx.fillStyle = grassGrad;
    ctx.fillRect(0, H * 0.55, W, H * 0.45);
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'hsl(130, 55%, 23%)' : 'hsl(128, 52%, 20%)';
      ctx.fillRect(i * (W / 8), H * 0.55, W / 8, H * 0.45);
    }

    // Penalty spot
    ctx.strokeStyle = 'hsl(0, 0%, 90%, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(W * 0.5, H * 0.76, 40, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'hsl(0, 0%, 90%, 0.6)';
    ctx.beginPath();
    ctx.arc(W * 0.5, H * 0.82, 4, 0, Math.PI * 2);
    ctx.fill();

    // Goal line
    ctx.strokeStyle = 'hsl(0, 0%, 90%, 0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, H * 0.62);
    ctx.lineTo(W, H * 0.62);
    ctx.stroke();

    // --- GOAL NET ---
    const gx = GOAL.x * W;
    const gy = GOAL.y * H;
    const gw = GOAL.w * W;
    const gh = GOAL.h * H;

    ctx.fillStyle = 'hsl(220, 30%, 5%, 0.6)';
    ctx.fillRect(gx, gy, gw, gh);

    ctx.strokeStyle = 'hsl(0, 0%, 75%, 0.25)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= 18; c++) {
      ctx.beginPath();
      ctx.moveTo(gx + (c / 18) * gw, gy);
      ctx.lineTo(gx + (c / 18) * gw, gy + gh);
      ctx.stroke();
    }
    for (let r = 0; r <= 10; r++) {
      ctx.beginPath();
      ctx.moveTo(gx, gy + (r / 10) * gh);
      ctx.lineTo(gx + gw, gy + (r / 10) * gh);
      ctx.stroke();
    }

    // Goalposts
    ctx.strokeStyle = 'hsl(0, 0%, 95%)';
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + gh); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(gx + gw, gy); ctx.lineTo(gx + gw, gy + gh); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + gw, gy); ctx.stroke();
    ctx.strokeStyle = 'hsl(0, 0%, 50%, 0.4)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(gx + 6, gy + 6); ctx.lineTo(gx + 6, gy + gh + 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(gx + gw - 6, gy + 6); ctx.lineTo(gx + gw - 6, gy + gh + 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(gx, gy + 6); ctx.lineTo(gx + gw, gy + 6); ctx.stroke();

    // --- GOALKEEPER ---
    const gkCenterX = W * 0.5;
    let gkX = gkCenterX;
    const gkDiveAmt = gw * 0.38; // wider dive range

    // Strong visual lean + small feint bounce while aiming
    if (kickPhase === 'aiming' && Math.abs(gkLeaning) > 0.05) {
      const feintBounce = Math.sin(Date.now() / 180) * 6; // oscillating stutter
      gkX = gkCenterX + gkLeaning * gkDiveAmt * 0.45 + feintBounce;
    }

    // Full dive during flight — fast
    if (goalkeeperAction === 'left') gkX = gkCenterX - gkDiveAmt * Math.min(ballProgress * 2.8, 1);
    else if (goalkeeperAction === 'right') gkX = gkCenterX + gkDiveAmt * Math.min(ballProgress * 2.8, 1);

    const gkY = H * GK_BASE_Y;
    const gkW = 44;
    const gkH = 80;

    ctx.save();
    const jerseyGrad = ctx.createLinearGradient(gkX - gkW / 2, gkY - gkH, gkX + gkW / 2, gkY);
    jerseyGrad.addColorStop(0, 'hsl(55, 90%, 55%)');
    jerseyGrad.addColorStop(1, 'hsl(50, 80%, 40%)');
    ctx.fillStyle = jerseyGrad;
    ctx.beginPath();
    ctx.roundRect(gkX - gkW / 2, gkY - gkH + 28, gkW, gkH - 18, 4);
    ctx.fill();
    ctx.fillStyle = 'hsl(220, 60%, 30%)';
    ctx.fillRect(gkX - gkW / 2 + 2, gkY - 28, gkW - 4, 20);
    ctx.fillStyle = 'hsl(35, 60%, 55%)';
    ctx.fillRect(gkX - gkW / 2 + 4, gkY - 10, 14, 16);
    ctx.fillRect(gkX + gkW / 2 - 18, gkY - 10, 14, 16);
    ctx.fillStyle = 'hsl(220, 20%, 15%)';
    ctx.fillRect(gkX - gkW / 2 + 2, gkY + 4, 18, 8);
    ctx.fillRect(gkX + gkW / 2 - 20, gkY + 4, 18, 8);
    ctx.fillStyle = 'hsl(35, 60%, 55%)';
    ctx.beginPath();
    ctx.arc(gkX, gkY - gkH + 16, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'hsl(220, 20%, 15%)';
    ctx.beginPath(); ctx.arc(gkX - 5, gkY - gkH + 14, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(gkX + 5, gkY - gkH + 14, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'hsl(0, 0%, 90%)';
    ctx.beginPath(); ctx.arc(gkX - gkW / 2 - 5, gkY - gkH + 50, 10, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(gkX + gkW / 2 + 5, gkY - gkH + 50, 10, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // --- BALL ---
    const ballStartX = BALL_START.x * W;
    const ballStartY = BALL_START.y * H;
    let ballX = ballStartX;
    let ballY = ballStartY;
    let ballScale = 1;

    // Use wobble position as the locked aim target during flight
    const targetAim = aimPos;
    if ((kickPhase === 'flying' || kickPhase === 'result') && targetAim) {
      const t = ballProgress;
      const targetX = gx + targetAim.x * gw;
      const targetY = gy + targetAim.y * gh;
      ballX = ballStartX + (targetX - ballStartX) * t;
      ballY = ballStartY + (targetY - ballStartY) * t;
      ballScale = 1 - t * 0.6;
    }

    const br = 22 * ballScale;
    ctx.save();
    ctx.fillStyle = 'hsl(0, 0%, 0%, 0.3)';
    ctx.beginPath();
    ctx.ellipse(ballX, ballStartY + 8, br * 0.8, br * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    const ballGrad = ctx.createRadialGradient(ballX - br * 0.3, ballY - br * 0.3, br * 0.1, ballX, ballY, br);
    ballGrad.addColorStop(0, 'hsl(0, 0%, 95%)');
    ballGrad.addColorStop(0.7, 'hsl(0, 0%, 85%)');
    ballGrad.addColorStop(1, 'hsl(0, 0%, 60%)');
    ctx.fillStyle = ballGrad;
    ctx.beginPath();
    ctx.arc(ballX, ballY, br, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'hsl(0, 0%, 15%)';
    ctx.lineWidth = 1 * ballScale;
    ctx.fillStyle = 'hsl(0, 0%, 15%)';
    ctx.beginPath(); ctx.arc(ballX, ballY, br * 0.28, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const px = ballX + Math.cos(angle) * br * 0.56;
      const py = ballY + Math.sin(angle) * br * 0.56;
      ctx.beginPath(); ctx.arc(px, py, br * 0.18, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // --- WOBBLING RETICLE (the actual shot target) ---
    if (kickPhase === 'aiming') {
      // Draw faint cursor where mouse is
      if (aimPos) {
        const ax = gx + aimPos.x * gw;
        const ay = gy + aimPos.y * gh;
        ctx.save();
        ctx.strokeStyle = 'hsl(0, 0%, 80%, 0.25)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 5]);
        ctx.beginPath(); ctx.arc(ax, ay, 14, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }

      // Draw the WOBBLING reticle (the real aim)
      const wx = gx + wobble.x * gw;
      const wy = gy + wobble.y * gh;
      ctx.save();
      ctx.strokeStyle = 'hsl(0, 95%, 60%)';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = 'hsl(0, 95%, 60%)';
      ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(wx, wy, 20, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'hsl(0, 95%, 60%)';
      ctx.beginPath(); ctx.arc(wx, wy, 4, 0, Math.PI * 2); ctx.fill();
      // Crosshair arms
      ctx.beginPath();
      ctx.moveTo(wx - 30, wy); ctx.lineTo(wx - 24, wy);
      ctx.moveTo(wx + 24, wy); ctx.lineTo(wx + 30, wy);
      ctx.moveTo(wx, wy - 30); ctx.lineTo(wx, wy - 24);
      ctx.moveTo(wx, wy + 24); ctx.lineTo(wx, wy + 30);
      ctx.stroke();
      ctx.restore();
    }

    // --- SHOT TIMER BAR ---
    if (kickPhase === 'aiming') {
      const barW = gw;
      const barH = 10;
      const barX = gx;
      const barY = gy - 22;

      // Flash red background when nearly expired
      const flashAlpha = shotTimer < 0.3 ? 0.4 + Math.sin(Date.now() / 80) * 0.3 : 0.5;
      ctx.fillStyle = `hsl(0, 0%, 15%, ${flashAlpha})`;
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW, barH, 5);
      ctx.fill();

      const timerColor = shotTimer > 0.6 ? 'hsl(130, 70%, 45%)' : shotTimer > 0.3 ? 'hsl(45, 95%, 55%)' : 'hsl(0, 84%, 55%)';
      if (shotTimer < 0.3) {
        ctx.save();
        ctx.shadowColor = 'hsl(0, 84%, 55%)';
        ctx.shadowBlur = 12;
      }
      ctx.fillStyle = timerColor;
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW * shotTimer, barH, 5);
      ctx.fill();
      if (shotTimer < 0.3) ctx.restore();

      // Label
      const labelText = shotTimer < 0.3 ? '⚡ SHOOT NOW!' : shotTimer < 0.6 ? '⏱ HURRY!' : '⏱ 2 SECONDS';
      ctx.fillStyle = shotTimer < 0.3 ? 'hsl(0, 84%, 70%)' : 'hsl(0, 0%, 75%)';
      ctx.font = 'bold 13px "Barlow Condensed", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(labelText, barX, barY - 5);
    }

    // --- RESULT OVERLAY ---
    if (kickPhase === 'result' && shotResult !== null) {
      ctx.save();
      const text = shotResult ? 'GOAL! ⚽' : 'SAVED!';
      const color = shotResult ? 'hsl(130, 80%, 55%)' : 'hsl(0, 84%, 55%)';
      ctx.font = `bold 900 54px "Barlow Condensed", sans-serif`;
      ctx.textAlign = 'center';
      ctx.shadowColor = color;
      ctx.shadowBlur = 30;
      ctx.fillStyle = color;
      ctx.fillText(text, W / 2, H * 0.85);
      ctx.restore();
    }

  }, [aimPos, wobble, kickPhase, ballProgress, goalkeeperAction, gkLeaning, shotResult, shotTimer, tick]);

  return (
    <canvas
      ref={canvasRef}
      width={700}
      height={460}
      className="w-full h-full rounded-xl cursor-crosshair"
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    />
  );
};

export default GoalCanvas;
export { GOAL, BALL_START };
