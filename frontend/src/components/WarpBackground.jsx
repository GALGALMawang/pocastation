import React, { useEffect, useRef } from 'react';

const WarpBackground = ({ phase }) => {
  const canvasRef = useRef(null);
  const progressRef = useRef(0);
  const starsRef = useRef([]);
  const shootingStarsRef = useRef([]);

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
      const numStars = 600;
      const stars = [];
      for (let i = 0; i < numStars; i++) {
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
      if (phase !== 'station') return; // Only in station phase
      shootingStarsRef.current.push({
        x: Math.random() * w,
        y: Math.random() * h * 0.5,
        len: Math.random() * 80 + 50,
        speed: Math.random() * 15 + 10,
        opacity: 1,
        angle: Math.random() * 0.2 + 0.1 // Slight downward angle
      });
    };

    const draw = (time) => {
      const dt = time - lastTime;
      lastTime = time;

      // Target warp speed logic
      let targetRatio = 0.5; 
      if (phase === 'onboarding') targetRatio = 22; 
      else if (phase === 'station') targetRatio = 0.05; // ALMOST STOPPED

      if (progressRef.current < targetRatio) {
        progressRef.current += (targetRatio - progressRef.current) * 0.03;
      } else {
        progressRef.current -= (progressRef.current - targetRatio) * 0.015;
      }

      const speed = progressRef.current;

      // Draw background
      ctx.fillStyle = `rgba(2, 2, 5, ${phase === 'onboarding' ? 0.2 : 0.9})`;
      ctx.fillRect(0, 0, w, h);

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
        if (phase === 'onboarding' && speed > 5) {
          ctx.moveTo(px, py);
          ctx.lineTo(x, y);
          ctx.strokeStyle = `rgba(${s.color}, ${alpha * 0.8})`;
          ctx.lineWidth = s.size * (1 - s.z / w) * 2;
          ctx.stroke();
        } else {
          ctx.arc(x, y, s.size * (1 - s.z / w) * 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${s.color}, ${alpha})`;
          ctx.fill();
        }
      });

      // Shooting Stars
      if (phase === 'station') {
        if (Math.random() < 0.005) createShootingStar(); // Randomly spawn

        shootingStarsRef.current.forEach((ss, index) => {
          ss.x += ss.speed;
          ss.y += ss.speed * ss.angle;
          ss.opacity -= 0.01;

          if (ss.opacity <= 0) {
            shootingStarsRef.current.splice(index, 1);
            return;
          }

          const grad = ctx.createLinearGradient(ss.x, ss.y, ss.x - ss.len, ss.y - ss.len * ss.angle);
          grad.addColorStop(0, `rgba(255, 255, 255, ${ss.opacity})`);
          grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

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
  }, [phase]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: -1, background: '#020205',
      backgroundImage: 'url("https://www.transparenttextures.com/patterns/stardust.png")',
    }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default WarpBackground;
