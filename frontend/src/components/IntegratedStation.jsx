import React, { useState, useEffect, useRef } from 'react';

const IntegratedStation = ({ onSectorSelect }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [activeMenu, setActiveMenu] = useState(null);
  const [activeNode, setActiveNode] = useState(null);
  const stateRef = useRef({ activeMenu: null, activeNode: null });
  const mousePos = useRef({ x: 0, y: 0 });
  const angleRef = useRef({ x: 0.3, y: 0 });
  const animRef = useRef(null);
  const particlesRef = useRef([]);
  const arcsRef = useRef([]);

  const sectors = [
    {
      id: 'auctions', title: 'AUCTION_HUB', color: '0, 240, 255',
      centerLat: 0.3, centerLon: 0.8, radius: 0.75,
      nodes: [
        { id: 'bts', label: 'BTS_TRACK', lat: 0.5, lon: 0.95 },
        { id: 'aespa', label: 'AESPA_ZONE', lat: 0.1, lon: 0.65 },
        { id: 'ive', label: 'IVE_ORBIT', lat: -0.05, lon: 0.9 }
      ]
    },
    {
      id: 'register', title: 'CARGO_BAY', color: '255, 215, 0',
      centerLat: -0.5, centerLon: -0.3, radius: 0.6,
      nodes: [
        { id: 'new', label: 'NEW_CARGO', lat: -0.3, lon: -0.1 },
        { id: 'log', label: 'DATA_LOG', lat: -0.65, lon: -0.45 }
      ]
    },
    {
      id: 'mypage', title: 'USER_STATION', color: '180, 100, 255',
      centerLat: 0.4, centerLon: -0.9, radius: 0.6,
      nodes: [
        { id: 'bio', label: 'BIO_DATA', lat: 0.55, lon: -0.7 },
        { id: 'wallet', label: 'WALLET_V', lat: 0.25, lon: -1.05 }
      ]
    }
  ];

  useEffect(() => {
    stateRef.current = { activeMenu, activeNode };
  }, [activeMenu, activeNode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, baseRadius = 0;
    const fov = 900;

    const initParticles = () => {
      const NUM = 2800;
      const phi = Math.PI * (3 - Math.sqrt(5));
      const ps = [];
      for (let i = 0; i < NUM; i++) {
        const lat = Math.asin(1 - (i / (NUM - 1)) * 2);
        const lon = phi * i;
        let sectorId = null;
        sectors.forEach(s => {
          const d = Math.sqrt((lat - s.centerLat) ** 2 + (lon - s.centerLon) ** 2);
          if (d < s.radius) sectorId = s.id;
        });
        ps.push({
          lat, lon,
          x: Math.cos(lat) * Math.cos(lon),
          y: Math.sin(lat),
          z: Math.cos(lat) * Math.sin(lon),
          size: Math.random() * 0.7 + 0.3,
          sectorId,
        });
      }
      particlesRef.current = ps;
    };

    const initArcs = () => {
      const arcs = [];
      // Create arcs between all nodes across sectors
      const allNodes = sectors.flatMap(s => s.nodes.map(n => ({ ...n, sectorColor: s.color })));
      for (let i = 0; i < allNodes.length; i++) {
        for (let j = i + 1; j < allNodes.length; j++) {
          if (Math.random() > 0.5) continue;
          arcs.push({
            from: allNodes[i],
            to: allNodes[j],
            color: allNodes[i].sectorColor,
            progress: Math.random(),
            speed: 0.003 + Math.random() * 0.003,
            active: false,
          });
        }
      }
      arcsRef.current = arcs;
    };

    const resize = () => {
      const rect = container.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      if (w === 0 || h === 0) return;
      canvas.width = w;
      canvas.height = h;
      baseRadius = Math.min(w, h) * 0.4;
    };

    const project = (lat, lon, r) => {
      const { x: ax, y: ay } = angleRef.current;
      const cosY = Math.cos(ay), sinY = Math.sin(ay);
      const cosX = Math.cos(ax), sinX = Math.sin(ax);
      const px3 = Math.cos(lat) * Math.cos(lon);
      const py3 = Math.sin(lat);
      const pz3 = Math.cos(lat) * Math.sin(lon);
      const x1 = px3 * r * cosY - pz3 * r * sinY;
      const z1 = pz3 * r * cosY + px3 * r * sinY;
      const y2 = py3 * r * cosX - z1 * sinX;
      const z2 = z1 * cosX + py3 * r * sinX;
      const scale = fov / (fov + z2);
      return { px: w / 2 + x1 * scale, py: h / 2 + y2 * scale, z: z2, scale };
    };

    const drawGrid = () => {
      const { x: ax, y: ay } = angleRef.current;
      ctx.save();

      // Latitude lines
      const latLines = 8;
      for (let i = 0; i <= latLines; i++) {
        const lat = -Math.PI / 2 + (Math.PI / latLines) * i;
        const pts = [];
        const steps = 80;
        for (let j = 0; j <= steps; j++) {
          const lon = (j / steps) * Math.PI * 2 - Math.PI;
          const { px, py, z } = project(lat, lon, baseRadius);
          if (z < 0) pts.push({ px, py, visible: true });
          else pts.push({ px, py, visible: false });
        }
        let drawing = false;
        ctx.beginPath();
        for (let j = 0; j <= steps; j++) {
          const p = pts[j];
          if (p.visible) {
            if (!drawing) { ctx.moveTo(p.px, p.py); drawing = true; }
            else ctx.lineTo(p.px, p.py);
          } else {
            drawing = false;
          }
        }
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.06)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Longitude lines
      const lonLines = 12;
      for (let i = 0; i < lonLines; i++) {
        const lon = (i / lonLines) * Math.PI * 2 - Math.PI;
        ctx.beginPath();
        let drawing = false;
        const steps = 60;
        for (let j = 0; j <= steps; j++) {
          const lat = -Math.PI / 2 + (Math.PI / steps) * j;
          const { px, py, z } = project(lat, lon, baseRadius);
          if (z < 0) {
            if (!drawing) { ctx.moveTo(px, py); drawing = true; }
            else ctx.lineTo(px, py);
          } else {
            drawing = false;
          }
        }
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.06)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      ctx.restore();
    };

    const drawAtmosphere = () => {
      const cx = w / 2, cy = h / 2;
      const grd = ctx.createRadialGradient(cx, cy, baseRadius * 0.85, cx, cy, baseRadius * 1.25);
      grd.addColorStop(0, 'rgba(0, 180, 255, 0.07)');
      grd.addColorStop(0.5, 'rgba(0, 100, 200, 0.04)');
      grd.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius * 1.25, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
    };

    const drawArc = (fromLat, fromLon, toLat, toLon, color, progress) => {
      const STEPS = 50;
      const pts = [];
      for (let t = 0; t <= STEPS; t++) {
        const tf = t / STEPS;
        const lat = fromLat + (toLat - fromLat) * tf;
        const lon = fromLon + (toLon - fromLon) * tf;
        // Slight arc lift above surface
        const lift = Math.sin(tf * Math.PI) * 0.18;
        const r = baseRadius * (1 + lift);
        const { px, py, z } = project(lat, lon, r);
        pts.push({ px, py, z });
      }

      const headIdx = Math.floor(progress * STEPS);
      const tailIdx = Math.max(0, headIdx - 20);
      if (headIdx <= 0) return;

      ctx.save();
      for (let i = tailIdx; i < headIdx && i < pts.length - 1; i++) {
        const p = pts[i], np = pts[i + 1];
        if (p.z > 20 || np.z > 20) continue;
        const alpha = ((i - tailIdx) / (headIdx - tailIdx)) * 0.7;
        ctx.beginPath();
        ctx.moveTo(p.px, p.py);
        ctx.lineTo(np.px, np.py);
        ctx.strokeStyle = `rgba(${color}, ${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.restore();
    };

    const draw = (time) => {
      if (w === 0 || h === 0) { resize(); }
      if (w === 0 || h === 0) { animRef.current = requestAnimationFrame(draw); return; }

      ctx.clearRect(0, 0, w, h);

      const { activeMenu: am } = stateRef.current;

      // Smooth mouse-driven rotation + auto drift
      const targetY = (mousePos.current.x / window.innerWidth - 0.5) * 0.5;
      const targetX = (mousePos.current.y / window.innerHeight - 0.5) * 0.35;
      angleRef.current.y += (targetY - angleRef.current.y) * 0.04 + 0.0018;
      angleRef.current.x += (targetX - angleRef.current.x) * 0.04;

      // Atmosphere
      drawAtmosphere();

      // Globe edge glow (outer ring)
      const cx = w / 2, cy = h / 2;
      const edgeGrd = ctx.createRadialGradient(cx, cy, baseRadius * 0.96, cx, cy, baseRadius * 1.04);
      edgeGrd.addColorStop(0, 'rgba(0, 200, 255, 0.15)');
      edgeGrd.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius * 1.04, 0, Math.PI * 2);
      ctx.fillStyle = edgeGrd;
      ctx.fill();

      // Grid lines
      drawGrid();

      // Particles
      particlesRef.current.forEach(p => {
        const { px, py, z, scale } = project(p.lat, p.lon, baseRadius);
        const isFront = z < 0;
        if (!isFront) return;

        let color = '160, 200, 240';
        let alpha = 0.18 * (1 - z / -baseRadius * 0.5);

        if (p.sectorId) {
          const sector = sectors.find(s => s.id === p.sectorId);
          color = sector.color;
          const isActive = am === p.sectorId;
          alpha = isActive ? 0.6 : 0.28;
          alpha *= (1 - z / -baseRadius * 0.3);
        }

        ctx.beginPath();
        ctx.arc(px, py, (p.sectorId ? p.size * 1.8 : p.size) * scale, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color}, ${alpha})`;
        ctx.fill();
      });

      // Arcs
      arcsRef.current.forEach(arc => {
        arc.progress += arc.speed;
        if (arc.progress > 1.3) arc.progress = 0;
        if (arc.progress > 0 && arc.progress <= 1) {
          drawArc(arc.from.lat, arc.from.lon, arc.to.lat, arc.to.lon, arc.color, arc.progress);
        }
      });

      // Nodes
      sectors.forEach(s => {
        const { activeMenu: am, activeNode: an } = stateRef.current;
        const isSectorActive = am === s.id;

        s.nodes.forEach(node => {
          const { px, py, z, scale } = project(node.lat, node.lon, baseRadius + 4);
          if (z > 0) return;

          const isNodeActive = an === node.id;
          const ps = isNodeActive ? 5 : 3.5;

          // Glow halo
          const grd = ctx.createRadialGradient(px, py, 0, px, py, ps * 6);
          grd.addColorStop(0, `rgba(${s.color}, ${isNodeActive ? 0.7 : 0.3})`);
          grd.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(px, py, ps * 6, 0, Math.PI * 2);
          ctx.fillStyle = grd;
          ctx.fill();

          // Core dot
          ctx.beginPath();
          ctx.arc(px, py, ps * scale, 0, Math.PI * 2);
          ctx.fillStyle = isNodeActive ? '#fff' : `rgba(${s.color}, 1)`;
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.8)';
          ctx.lineWidth = 0.8;
          ctx.stroke();

          // Label
          if (isSectorActive) {
            ctx.font = `700 ${9 * scale}px monospace`;
            ctx.fillStyle = isNodeActive ? '#fff' : `rgba(${s.color}, 0.9)`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(node.label, px, py + ps * 2 + 4);
          }
        });

        // Sector title
        const { px, py, z, scale } = project(s.centerLat, s.centerLon, baseRadius + 18);
        if (z < 0) {
          const isActive = isSectorActive;
          ctx.font = `900 ${11 * scale}px monospace`;
          ctx.fillStyle = isActive ? `rgba(${s.color}, 1)` : 'rgba(255,255,255,0.55)';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          if (isActive) {
            ctx.shadowColor = `rgba(${s.color}, 0.8)`;
            ctx.shadowBlur = 12;
          }
          ctx.fillText(s.title, px, py);
          ctx.shadowBlur = 0;
        }
      });

      animRef.current = requestAnimationFrame(draw);
    };

    const onMouseMove = (e) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      let foundSector = null, foundNode = null;
      sectors.forEach(s => {
        s.nodes.forEach(node => {
          const { px, py, z } = project(node.lat, node.lon, baseRadius);
          if (z < 0) {
            const d = Math.hypot(px - mx, py - my);
            if (d < 18) { foundNode = node.id; foundSector = s.id; }
          }
        });
        if (!foundSector) {
          const { px, py, z } = project(s.centerLat, s.centerLon, baseRadius);
          if (z < 0 && Math.hypot(px - mx, py - my) < 50) foundSector = s.id;
        }
      });

      setActiveMenu(foundSector);
      setActiveNode(foundNode);
    };

    const ro = new ResizeObserver(() => { resize(); });
    ro.observe(container);

    window.addEventListener('mousemove', onMouseMove);
    resize();
    initParticles();
    initArcs();
    animRef.current = requestAnimationFrame(draw);

    return () => {
      ro.disconnect();
      window.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', position: 'relative' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />

      {/* Side menu */}
      <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 10 }}>
        {sectors.map(s => (
          <div
            key={s.id}
            onMouseEnter={() => setActiveMenu(s.id)}
            onMouseLeave={() => { setActiveMenu(null); setActiveNode(null); }}
            onClick={() => onSectorSelect(s.id)}
            style={{
              cursor: 'pointer',
              background: activeMenu === s.id ? `rgba(${s.color}, 0.15)` : 'rgba(255,255,255,0.02)',
              borderLeft: `3px solid rgba(${s.color}, ${activeMenu === s.id ? 1 : 0.3})`,
              padding: '10px 16px',
              transition: 'all 0.25s',
              borderRadius: '0 6px 6px 0',
              backdropFilter: activeMenu === s.id ? 'blur(8px)' : 'none',
              boxShadow: activeMenu === s.id ? `0 0 20px rgba(${s.color}, 0.15)` : 'none',
            }}
          >
            <div style={{ color: '#fff', fontSize: '10px', fontWeight: '900', letterSpacing: '2px', opacity: activeMenu === s.id ? 1 : 0.55 }}>{s.title}</div>
            {activeMenu === s.id && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '7px' }}>
                {s.nodes.map(node => (
                  <span
                    key={node.id}
                    onMouseEnter={() => setActiveNode(node.id)}
                    style={{
                      fontSize: '8px',
                      color: activeNode === node.id ? '#fff' : `rgba(${s.color}, 1)`,
                      background: activeNode === node.id ? `rgba(${s.color}, 0.5)` : 'transparent',
                      border: `1px solid rgba(${s.color}, 0.4)`,
                      padding: '2px 7px', borderRadius: '3px',
                    }}
                  >
                    {node.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default IntegratedStation;
