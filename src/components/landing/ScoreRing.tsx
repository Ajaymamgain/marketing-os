import React, { useEffect, useRef } from 'react';

type ScoreRingProps = {
  fit: number;
  intent: number;
  coverage: number;
  composite: number;
  grade: string;
};

const WEIGHTS = [0.35, 0.4, 0.25];
const COLORS = ['#1d4ed8', '#60a5fa', '#1e3a8a'];

export function ScoreRing({ fit, intent, coverage, composite, grade }: ScoreRingProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scores = useRef({ fit, intent, coverage });
  scores.current = { fit, intent, coverage };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const shown = [scores.current.fit, scores.current.intent, scores.current.coverage];
    let frame = 0;
    let stopped = false;

    const draw = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const size = 92;
      canvas.width = size * ratio;
      canvas.height = size * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, size, size);

      const target = [scores.current.fit, scores.current.intent, scores.current.coverage];
      const gap = 0.08;
      let angle = -Math.PI / 2;
      target.forEach((value, index) => {
        const sweep = WEIGHTS[index] * Math.PI * 2 - gap;
        const step = motion.matches ? 1 : 0.14;
        shown[index] += (value - shown[index]) * step;
        context.lineWidth = 7;
        context.lineCap = 'butt';
        context.beginPath();
        context.arc(46, 46, 38, angle, angle + sweep);
        context.strokeStyle = index === 2 && value <= 0 ? '#f3e2b8' : '#e6e8ee';
        context.stroke();
        const filled = sweep * (Math.max(shown[index], 0) / 100);
        if (filled > 0.02 && !(index === 2 && value <= 0)) {
          context.beginPath();
          context.arc(46, 46, 38, angle, angle + filled);
          context.strokeStyle = COLORS[index];
          context.stroke();
        }
        angle += sweep + gap;
      });
    };

    const tick = () => {
      if (stopped) return;
      draw();
      frame = window.requestAnimationFrame(tick);
    };
    tick();
    return () => {
      stopped = true;
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="op-ring">
      <canvas ref={canvasRef} width={184} height={184} aria-hidden="true" />
      <div className="op-grade">
        <strong>{composite.toFixed(1)}</strong>
        <span>{grade}</span>
      </div>
    </div>
  );
}
