"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
  pulse: number;
  pulseSpeed: number;
};

const COLORS = ["#E8390E", "#3B82F6", "#ffffff", "#10B981", "#8B5CF6"];

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

export function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Use local variables so TypeScript knows they are non-null inside draw()
    const cv = canvas;
    const cx = ctx;

    const resize = () => {
      cv.width = window.innerWidth;
      cv.height = Math.max(window.innerHeight, cv.parentElement?.offsetHeight ?? 900);
    };
    resize();
    window.addEventListener("resize", resize);

    const COUNT = 90;
    const particles: Particle[] = Array.from({ length: COUNT }, () => ({
      x: Math.random() * cv.width,
      y: Math.random() * cv.height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      size: Math.random() * 1.8 + 0.3,
      opacity: Math.random() * 0.45 + 0.1,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: 0.008 + Math.random() * 0.012,
    }));

    let animId: number;

    function draw() {
      cx.clearRect(0, 0, cv.width, cv.height);

      // Connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            cx.beginPath();
            cx.moveTo(particles[i].x, particles[i].y);
            cx.lineTo(particles[j].x, particles[j].y);
            cx.strokeStyle = `rgba(232,57,14,${(0.06 * (1 - dist / 130)).toFixed(3)})`;
            cx.lineWidth = 0.6;
            cx.stroke();
          }
        }
      }

      // Particles
      for (const p of particles) {
        p.pulse += p.pulseSpeed;
        const alpha = p.opacity * (0.6 + 0.4 * Math.sin(p.pulse));
        const rgb = hexToRgb(p.color);

        // Glow halo
        const grd = cx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
        grd.addColorStop(0, `rgba(${rgb},${alpha.toFixed(3)})`);
        grd.addColorStop(1, "rgba(0,0,0,0)");
        cx.beginPath();
        cx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
        cx.fillStyle = grd;
        cx.fill();

        // Core dot
        cx.beginPath();
        cx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        cx.fillStyle = p.color;
        cx.globalAlpha = Math.min(alpha * 1.5, 1);
        cx.fill();
        cx.globalAlpha = 1;

        // Move
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = cv.width;
        if (p.x > cv.width) p.x = 0;
        if (p.y < 0) p.y = cv.height;
        if (p.y > cv.height) p.y = 0;
      }

      animId = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.55 }}
    />
  );
}
