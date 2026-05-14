import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import gsap from 'gsap';

const VERTEX_SHADER = `
  uniform sampler2D u_map_tex;
  uniform float u_dot_size;
  uniform float u_time_since_click;
  uniform vec3 u_pointer;

  #define PI 3.14159265359

  varying float vOpacity;
  varying vec2 vUv;

  void main() {
    vUv = uv;

    float visibility = step(.2, texture2D(u_map_tex, uv).r);
    gl_PointSize = visibility * u_dot_size;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vOpacity = (1. / length(mvPosition.xyz) - .7);
    vOpacity = clamp(vOpacity, .03, 1.);

    float t = u_time_since_click - .1;
    t = max(0., t);
    float max_amp = .15;
    float dist = 1. - .5 * length(position - u_pointer);
    float damping = 1. / (1. + 20. * t);
    float delta = max_amp * damping * sin(5. * t * (1. + 2. * dist) - PI);
    delta *= 1. - smoothstep(.8, 1., dist);
    vec3 pos = position;
    pos *= (1. + delta);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.);
  }
`;

const FRAGMENT_SHADER = `
  uniform sampler2D u_map_tex;

  varying float vOpacity;
  varying vec2 vUv;

  void main() {
    vec3 color = texture2D(u_map_tex, vUv).rgb;
    color -= .2 * length(gl_PointCoord.xy - vec2(.5));
    float dot = 1. - smoothstep(.38, .4, length(gl_PointCoord.xy - vec2(.5)));
    if (dot < 0.5) discard;
    gl_FragColor = vec4(color, dot * vOpacity);
  }
`;

const sectors = [
  {
    id: 'auctions', title: 'AUCTION_HUB', color: '0, 240, 255',
    nodes: [
      { id: 'bts', label: 'BTS_TRACK' },
      { id: 'aespa', label: 'AESPA_ZONE' },
      { id: 'ive', label: 'IVE_ORBIT' }
    ]
  },
  {
    id: 'register', title: 'CARGO_BAY', color: '255, 215, 0',
    nodes: [
      { id: 'new', label: 'NEW_CARGO' },
      { id: 'log', label: 'DATA_LOG' }
    ]
  },
  {
    id: 'mypage', title: 'USER_STATION', color: '180, 100, 255',
    nodes: [
      { id: 'bio', label: 'BIO_DATA' },
      { id: 'wallet', label: 'WALLET_V' }
    ]
  }
];

// Death Star under-construction texture (equirectangular 2048x1024)
// White = built surface (dots), Black = void / unbuilt zones
function generateFictionalMap() {
  const W = 2048, H = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Base: full white — every dot is on the surface
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);

  // --- Panel grid (trench lines cut through everything) ---
  const G = 80, gap = 5;
  ctx.fillStyle = '#000';
  for (let x = 0; x < W; x += G) ctx.fillRect(x, 0, gap, H);
  for (let y = 0; y < H; y += G) ctx.fillRect(0, y, W, gap);

  // --- Deep equatorial trench ---
  ctx.fillRect(0, H * 0.50, W, 20);

  // --- Under-construction gaps: large black zones cut into surface ---
  // These represent sections not yet built — dots disappear here
  const voids = [
    [W*0.30, H*0.18, W*0.08, H*0.32],  // gap between alpha & beta
    [W*0.66, H*0.18, W*0.06, H*0.32],  // gap between gamma & delta
    [W*0.32, H*0.52, W*0.13, H*0.13],  // southern construction gap
    [W*0.61, H*0.52, W*0.14, H*0.13],  // southern construction gap
    [W*0.00, H*0.80, W*0.10, H*0.20],  // far south void
    [W*0.35, H*0.80, W*0.10, H*0.20],
    [W*0.62, H*0.80, W*0.13, H*0.20],
  ];
  voids.forEach(([x, y, w, h]) => ctx.fillRect(x, y, w, h));

  // --- Superlaser dish ---
  const dishX = W * 0.55, dishY = H * 0.38, dishR = 130;
  ctx.beginPath();
  ctx.arc(dishX, dishY, dishR, 0, Math.PI * 2);
  ctx.fillStyle = '#000';
  ctx.fill();
  // Partial ring (under construction — only 3/4 complete)
  ctx.beginPath();
  ctx.arc(dishX, dishY, dishR * 0.68, 0.3, Math.PI * 1.8);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 12;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(dishX, dishY, dishR * 0.18, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();

  return canvas;
}

export default function GlobeStation({ onSectorSelect }) {
  const containerRef = useRef(null);
  const canvas3DRef = useRef(null);
  const canvas2DRef = useRef(null);
  const popupRef = useRef(null);
  const sceneRef = useRef({});
  const [activeMenu, setActiveMenu] = useState(null);
  const [activeNode, setActiveNode] = useState(null);

  useEffect(() => {
    const containerEl = containerRef.current;
    const canvas3D = canvas3DRef.current;
    const canvas2D = canvas2DRef.current;
    const popupEl = popupRef.current;
    const overlayCtx = canvas2D.getContext('2d');
    const s = sceneRef.current;

    let dragged = false;
    let popupVisible = false;
    let coordinates2D = [0, 0];
    let rafId;

    // Renderer
    s.renderer = new THREE.WebGLRenderer({ canvas: canvas3D, alpha: true });
    s.renderer.setPixelRatio(2);

    s.scene = new THREE.Scene();
    s.camera = new THREE.OrthographicCamera(-1.1, 1.1, 1.1, -1.1, 0, 3);
    s.camera.position.z = 1.1;

    s.rayCaster = new THREE.Raycaster();
    s.rayCaster.far = 1.15;
    s.mouse = new THREE.Vector2(-1, -1);
    s.clock = new THREE.Clock();

    // OrbitControls
    s.controls = new OrbitControls(s.camera, canvas3D);
    s.controls.enablePan = false;
    s.controls.enableZoom = false;
    s.controls.enableDamping = true;
    s.controls.minPolarAngle = 0.4 * Math.PI;
    s.controls.maxPolarAngle = 0.4 * Math.PI;
    s.controls.autoRotate = true;
    s.controls.autoRotateSpeed = 0.4;

    let timestamp;
    s.controls.addEventListener('start', () => { timestamp = Date.now(); });
    s.controls.addEventListener('end', () => { dragged = (Date.now() - timestamp) > 600; });

    // Regular latitude/longitude grid geometry — uniform dot spacing
    const createGridSphereGeometry = (latSteps, lonSteps) => {
      const positions = [], uvs = [];
      for (let lat = 0; lat <= latSteps; lat++) {
        const phi = (lat / latSteps) * Math.PI;
        const v = lat / latSteps;
        for (let lon = 0; lon < lonSteps; lon++) {
          const theta = (lon / lonSteps) * Math.PI * 2;
          const u = lon / lonSteps;
          positions.push(
            Math.sin(phi) * Math.cos(theta),
            Math.cos(phi),
            Math.sin(phi) * Math.sin(theta)
          );
          uvs.push(u, 1 - v);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      return geo;
    };

    // Globe
    const createGlobe = (mapTex) => {
      const geo = createGridSphereGeometry(36, 72);
      s.mapMaterial = new THREE.ShaderMaterial({
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        uniforms: {
          u_map_tex: { type: 't', value: mapTex },
          u_dot_size: { type: 'f', value: 0 },
          u_pointer: { type: 'v3', value: new THREE.Vector3(0, 0, 1) },
          u_time_since_click: { value: 0 },
        },
        alphaTest: false,
        transparent: true,
      });
      s.globe = new THREE.Points(geo, s.mapMaterial);
      s.scene.add(s.globe);

      s.globeMesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        color: 0x222222, transparent: true, opacity: 0.05,
      }));
      s.scene.add(s.globeMesh);
    };

    // Pointer
    const createPointer = () => {
      const geo = new THREE.SphereGeometry(0.04, 16, 16);
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
      s.pointer = new THREE.Mesh(geo, mat);
      s.scene.add(s.pointer);
    };

    // Popup timelines
    const createPopupTimelines = () => {
      s.popupOpenTl = gsap.timeline({ paused: true })
        .to(s.pointer.material, { duration: 0.2, opacity: 1 }, 0)
        .fromTo(canvas2D, { opacity: 0 }, { duration: 0.3, opacity: 1 }, 0.15)
        .fromTo(popupEl, { opacity: 0, scale: 0.9, transformOrigin: 'center bottom' }, { duration: 0.1, opacity: 1, scale: 1 }, 0.25);

      s.popupCloseTl = gsap.timeline({ paused: true })
        .to(s.pointer.material, { duration: 0.3, opacity: 0.2 }, 0)
        .to(canvas2D, { duration: 0.3, opacity: 0 }, 0)
        .to(popupEl, { duration: 0.3, opacity: 0, scale: 0.9, transformOrigin: 'center bottom' }, 0);
    };

    // Zones defined by equirectangular UV ranges matching the plate layout
    // u: 0~1 (lon -180→+180), v: 0~1 (lat +90→-90)
    // Zones cover the entire surface — every visible dot belongs to one
    const ZONES = [
      { id: 'SECTOR_ALPHA',   label: 'SECTOR α',  uMin: 0.00, uMax: 1.00, vMin: 0.00, vMax: 0.50 }, // north of equator
      { id: 'SECTOR_BETA',    label: 'SECTOR β',  uMin: 0.00, uMax: 0.30, vMin: 0.50, vMax: 1.00 }, // SW
      { id: 'SECTOR_GAMMA',   label: 'SECTOR γ',  uMin: 0.30, uMax: 0.62, vMin: 0.50, vMax: 1.00 }, // SC
      { id: 'SECTOR_DELTA',   label: 'SECTOR δ',  uMin: 0.62, uMax: 1.00, vMin: 0.50, vMax: 1.00 }, // SE
    ];

    const getZone = () => {
      const pos = s.pointer.position;
      const lat = 90 - Math.acos(Math.max(-1, Math.min(1, pos.y))) * 180 / Math.PI;
      const lng = (270 + Math.atan2(pos.x, pos.z) * 180 / Math.PI) % 360 - 180;
      const u = (lng + 180) / 360;
      const v = (90 - lat) / 180;
      const match = ZONES.find(z => u >= z.uMin && u <= z.uMax && v >= z.vMin && v <= z.vMax);
      return match ? match.label : 'VOID';
    };

    const drawPopupConnector = (sx, sy, mx, my, ex, ey) => {
      overlayCtx.strokeStyle = 'rgba(0, 240, 255, 0.8)';
      overlayCtx.lineWidth = 1.5;
      overlayCtx.lineCap = 'round';
      overlayCtx.clearRect(0, 0, containerEl.offsetWidth, containerEl.offsetHeight);
      overlayCtx.beginPath();
      overlayCtx.moveTo(sx, sy);
      overlayCtx.quadraticCurveTo(mx, my, ex, ey);
      overlayCtx.stroke();
    };

    const showPopup = (lifted) => {
      if (lifted) {
        const lifted_pos = s.pointer.position.clone().multiplyScalar(1.3);
        gsap.from(s.pointer.position, { duration: 0.25, x: lifted_pos.x, y: lifted_pos.y, z: lifted_pos.z, ease: 'power3.out' });
      }
      s.popupCloseTl.pause(0);
      s.popupOpenTl.play(0);
    };

    const updateOverlay = () => {
      if (!s.pointer) return;
      const activePos = s.pointer.position.clone();
      activePos.applyMatrix4(s.globe.matrixWorld);
      const projected = activePos.clone().project(s.camera);
      coordinates2D[0] = (projected.x + 1) * containerEl.offsetWidth * 0.5;
      coordinates2D[1] = (1 - projected.y) * containerEl.offsetHeight * 0.5;

      const matInv = s.controls.object.matrixWorldInverse;
      activePos.applyMatrix4(matInv);

      if (activePos.z > -1) {
        if (!popupVisible) { popupVisible = true; showPopup(false); }
        let px = coordinates2D[0] - projected.x * containerEl.offsetWidth * 0.3;
        let py = coordinates2D[1];
        const upDown = projected.y > 0.6;
        py += upDown ? 20 : -20;
        gsap.set(popupEl, { x: px, y: py, xPercent: -35, yPercent: upDown ? 0 : -100 });
        drawPopupConnector(coordinates2D[0], coordinates2D[1], px + projected.x * 100, py + (upDown ? -0.5 : 0.1) * coordinates2D[1], px, py);
      } else {
        if (popupVisible) { s.popupOpenTl.pause(0); s.popupCloseTl.play(0); }
        popupVisible = false;
      }
    };

    const checkIntersects = () => {
      s.rayCaster.setFromCamera(s.mouse, s.camera);
      const hits = s.rayCaster.intersectObject(s.globeMesh);
      canvas3D.style.cursor = hits.length ? 'pointer' : 'auto';
      return hits;
    };

    const updateMousePos = (ex, ey) => {
      s.mouse.x = (ex - containerEl.offsetLeft) / containerEl.offsetWidth * 2 - 1;
      s.mouse.y = -((ey - containerEl.offsetTop) / containerEl.offsetHeight) * 2 + 1;
    };

    const onMouseMove = (e) => updateMousePos(e.clientX, e.clientY);
    const onClick = (e) => {
      if (dragged) return;
      updateMousePos(e.clientX, e.clientY);
      const hits = checkIntersects();
      if (hits.length) {
        const n = hits[0].face.normal;
        s.pointer.position.set(n.x, n.y, n.z);
        s.mapMaterial.uniforms.u_pointer.value = n;
        popupEl.textContent = getZone();
        showPopup(true);
        s.clock.start();
      }
    };

    containerEl.addEventListener('mousemove', onMouseMove);
    containerEl.addEventListener('click', onClick);

    const updateSize = () => {
      const side = 0.42 * Math.min(window.innerWidth, window.innerHeight);
      containerEl.style.width = side + 'px';
      containerEl.style.height = side + 'px';
      s.renderer.setSize(side, side);
      canvas2D.width = canvas2D.height = side;
      if (s.mapMaterial) s.mapMaterial.uniforms.u_dot_size.value = 0.07 * side;
    };

    const render = () => {
      s.mapMaterial.uniforms.u_time_since_click.value = s.clock.getElapsedTime();
      checkIntersects();
      updateOverlay();
      s.controls.update();
      s.renderer.render(s.scene, s.camera);
      rafId = requestAnimationFrame(render);
    };

    const mapTex = new THREE.CanvasTexture(generateFictionalMap());
    createGlobe(mapTex);
    createPointer();
    createPopupTimelines();
    updateSize();
    render();

    window.addEventListener('resize', updateSize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateSize);
      containerEl.removeEventListener('mousemove', onMouseMove);
      containerEl.removeEventListener('click', onClick);
      s.renderer?.dispose();
    };
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', position: 'relative' }}>
      {/* Globe */}
      <div ref={containerRef} style={{ position: 'relative', flexShrink: 0 }}>
        <canvas ref={canvas3DRef} id="globe-3d" style={{ display: 'block', position: 'absolute' }} />
        <canvas ref={canvas2DRef} id="globe-2d-overlay" style={{ display: 'block', position: 'absolute', pointerEvents: 'none' }} />
        <div style={{ display: 'block', position: 'absolute', pointerEvents: 'none' }}>
          <div
            ref={popupRef}
            style={{
              position: 'absolute', top: 0, left: 0,
              background: 'rgba(2, 2, 5, 0.85)',
              border: '1px solid rgba(0, 240, 255, 0.4)',
              color: '#00F0FF',
              fontFamily: 'monospace',
              padding: '5px 12px',
              fontSize: '12px',
              fontWeight: '700',
              letterSpacing: '1px',
              borderRadius: '4px',
              opacity: 0,
              backdropFilter: 'blur(8px)',
            }}
          />
        </div>
      </div>

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
}
