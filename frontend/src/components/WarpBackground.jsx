import React, { useEffect, useRef } from 'react';

const WarpBackground = ({ phase }) => {
  const canvasRef = useRef(null);
  const progressRef = useRef(0);
  const starsRef = useRef([]);
  const shootingStarsRef = useRef([]);
  const warpStartRef = useRef(null);
  const phaseRef = useRef(phase);

  useEffect(() => {
    phaseRef.current = phase;
    if (phase === 'onboarding') {
      warpStartRef.current = performance.now();
    }
  }, [phase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let w, h;
    let lastTime = performance.now();

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
      initStars();
    };

    const initStars = () => {
      const stars = [];
      for (let i = 0; i < 700; i++) {
        stars.push({
          x: Math.random() * w - w / 2,
          y: Math.random() * h - h / 2,
          z: Math.random() * w,
          prevZ: 0,
          size: Math.random() * 1.5 + 0.5,
          color: Math.random() > 0.8 ? '100, 200, 255' : '255, 255, 255'
        });
      }
      starsRef.current = stars;
    };

    const createShootingStar = () => {
      shootingStarsRef.current.push({
        x: Math.random() * w,
        y: Math.random() * h * 0.5,
        len: Math.random() * 80 + 50,
        speed: Math.random() * 15 + 10,
        opacity: 1,
        angle: Math.random() * 0.2 + 0.1
      });
    };

    const draw = (time) => {
      const dt = Math.min(time - lastTime, 50);
      lastTime = time;

      let targetSpeed = 0.5;
      let shakeX = 0, shakeY = 0;

      const p = phaseRef.current;
      if (p === 'onboarding' && warpStartRef.current !== null) {
        const elapsed = (time - warpStartRef.current) / 1000;

        if (elapsed < 0.6) {
          const vibAmp = 4 + elapsed * 10;
          shakeX = Math.sin(time * 0.4) * vibAmp;
          shakeY = Math.cos(time * 0.5) * vibAmp * 0.6;
          targetSpeed = 0.5 + elapsed * 3 + Math.abs(Math.sin(time * 0.05)) * 2;
        } else if (elapsed < 1.2) {
          const t = (elapsed - 0.6) / 0.6;
          const vibAmp = 8 * (1 - t);
          shakeX = Math.sin(time * 0.3) * vibAmp;
          shakeY = Math.cos(time * 0.37) * vibAmp * 0.5;
          targetSpeed = 2 + t * t * 25;
        } else {
          targetSpeed = 28;
        }
      } else if (p === 'station') {
        targetSpeed = 0.05;
      }

      // Lerp toward target speed
      const lerpRate = p === 'onboarding' ? 0.08 : 0.02;
      progressRef.current += (targetSpeed - progressRef.current) * lerpRate;
      const speed = progressRef.current;

      // trailAlpha: speed가 오를수록 잔상 길어짐 — 끊김 없이 연속
      const trailAlpha = Math.max(0.12, 0.92 - speed * 0.03);

      // Screen shake via canvas transform
      ctx.save();
      ctx.translate(w / 2 + shakeX, h / 2 + shakeY);
      ctx.translate(-w / 2, -h / 2);

      // Background trail
      ctx.fillStyle = `rgba(2, 2, 5, ${trailAlpha})`;
      ctx.fillRect(0, 0, w, h);

      // Nebula glow (station only) — subtle radial color blobs
      if (p === 'station') {
        const nb = [
          { x: w * 0.15, y: h * 0.25, r: w * 0.35, c: '80,40,160' },
          { x: w * 0.82, y: h * 0.65, r: w * 0.28, c: '0,100,140' },
          { x: w * 0.5,  y: h * 0.85, r: w * 0.22, c: '60,20,100' },
        ];
        nb.forEach(({ x, y, r, c }) => {
          const g = ctx.createRadialGradient(x, y, 0, x, y, r);
          g.addColorStop(0, `rgba(${c}, 0.07)`);
          g.addColorStop(1, `rgba(${c}, 0)`);
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, w, h);
        });
      }

      const cx = w / 2;
      const cy = h / 2;

      // Stars
      starsRef.current.forEach(s => {
        s.prevZ = s.z;
        s.z -= speed;

        if (s.z <= 0) {
          s.z = w;
          s.x = Math.random() * w - w / 2;
          s.y = Math.random() * h - h / 2;
          s.prevZ = s.z;
        }

        const x = (s.x / s.z) * w + cx;
        const y = (s.y / s.z) * h + cy;
        const px = (s.x / s.prevZ) * w + cx;
        const py = (s.y / s.prevZ) * h + cy;
        const alpha = 1 - s.z / w;

        ctx.beginPath();
        if (speed > 4) {
          ctx.moveTo(px, py);
          ctx.lineTo(x, y);
          ctx.strokeStyle = `rgba(${s.color}, ${alpha * 0.85})`;
          ctx.lineWidth = s.size * (1 - s.z / w) * 2;
          ctx.stroke();
        } else {
          ctx.arc(x, y, s.size * (1 - s.z / w) * 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${s.color}, ${alpha})`;
          ctx.fill();
        }
      });

      ctx.restore();

      // Shooting Stars (station only)
      if (p === 'station') {
        if (Math.random() < 0.005) createShootingStar();
        shootingStarsRef.current.forEach((ss, i) => {
          ss.x += ss.speed;
          ss.y += ss.speed * ss.angle;
          ss.opacity -= 0.01;
          if (ss.opacity <= 0) { shootingStarsRef.current.splice(i, 1); return; }
          const grad = ctx.createLinearGradient(ss.x, ss.y, ss.x - ss.len, ss.y - ss.len * ss.angle);
          grad.addColorStop(0, `rgba(255,255,255,${ss.opacity})`);
          grad.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.beginPath();
          ctx.moveTo(ss.x, ss.y);
          ctx.lineTo(ss.x - ss.len, ss.y - ss.len * ss.angle);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 2;
          ctx.stroke();
        });
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    resize();
    animationFrameId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: -1, background: '#020205' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default WarpBackground;
