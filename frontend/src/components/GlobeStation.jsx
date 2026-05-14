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
  { id: 'auctions', title: '경매',      sub: 'LIVE AUCTION',   side: 'left',  color: [0, 220, 255]    },
  { id: 'register', title: '등록',      sub: 'SELL PHOTOCARD', side: 'left',  color: [255, 200, 0]    },
  { id: 'ranking',  title: '랭킹',      sub: 'HOT RANKING',    side: 'left',  color: [0, 230, 130]    },
  { id: 'mypage',   title: '마이페이지', sub: 'MY STATION',    side: 'right', color: [180, 100, 255]  },
  { id: 'alarm',    title: '알림',      sub: 'NOTIFICATIONS',  side: 'right', color: [255, 90, 120]   },
];

// 대륙별 섹터 매핑 (equirectangular UV: u=경도 0~1, v=위도 0~1)
const SECTOR_UV = [
  // 경매 — 아메리카
  { id: 'auctions', uMin: 0.04, uMax: 0.30, vMin: 0.10, vMax: 0.60 }, // 북미
  { id: 'auctions', uMin: 0.18, uMax: 0.38, vMin: 0.48, vMax: 0.86 }, // 남미
  // 등록 — 유럽 + 아프리카
  { id: 'register', uMin: 0.36, uMax: 0.57, vMin: 0.10, vMax: 0.44 }, // 유럽
  { id: 'register', uMin: 0.37, uMax: 0.58, vMin: 0.38, vMax: 0.82 }, // 아프리카
  // 랭킹 — 아시아
  { id: 'ranking',  uMin: 0.55, uMax: 0.95, vMin: 0.08, vMax: 0.58 }, // 아시아
  // 마이페이지 — 오세아니아
  { id: 'mypage',   uMin: 0.76, uMax: 0.98, vMin: 0.52, vMax: 0.82 }, // 오세아니아
  // 알림 — 남극
  { id: 'alarm',    uMin: 0.00, uMax: 1.00, vMin: 0.88, vMax: 1.00 }, // 남극
];

function getSectorColor(u, v) {
  // 더 구체적인 영역이 앞에 오도록 역순 확인 (오세아니아가 아시아보다 우선)
  const order = ['mypage', 'alarm', 'auctions', 'register', 'ranking'];
  for (const id of order) {
    const matches = SECTOR_UV.filter(z => z.id === id);
    for (const z of matches) {
      if (u >= z.uMin && u <= z.uMax && v >= z.vMin && v <= z.vMax) {
        return sectors.find(s => s.id === id).color;
      }
    }
  }
  return null;
}

function generateSectorTexture() {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const W = img.width, H = img.height;
      const offscreen = document.createElement('canvas');
      offscreen.width = W; offscreen.height = H;
      const ctx = offscreen.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, W, H);
      const d = imageData.data;

      for (let i = 0; i < W * H; i++) {
        const brightness = (d[i*4] + d[i*4+1] + d[i*4+2]) / 3;
        if (brightness > 40) {
          const u = (i % W) / W;
          const v = Math.floor(i / W) / H;
          const color = getSectorColor(u, v);
          if (color) {
            d[i*4]   = color[0];
            d[i*4+1] = color[1];
            d[i*4+2] = color[2];
          }
        } else {
          d[i*4] = d[i*4+1] = d[i*4+2] = 0;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(offscreen);
    };
    img.onerror = () => resolve(null);
    img.src = 'https://ksenia-k.com/img/earth-map-colored.png';
  });
}

// Death Star under-construction texture (equirectangular 2048x1024)
// White = built surface (dots), Black = void / unbuilt zones

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

    // Globe
    const createGlobe = (mapTex) => {
      const geo = new THREE.IcosahedronGeometry(1, 22);
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

    const getZone = () => {
      const pos = s.pointer.position;
      const lat = 90 - Math.acos(Math.max(-1, Math.min(1, pos.y))) * 180 / Math.PI;
      const lng = (270 + Math.atan2(pos.x, pos.z) * 180 / Math.PI) % 360 - 180;
      const u = (lng + 180) / 360;
      const v = (90 - lat) / 180;
      const match = SECTOR_UV.find(z => u >= z.uMin && u <= z.uMax && v >= z.vMin && v <= z.vMax);
      if (!match) return '—';
      return sectors.find(s => s.id === match.id)?.title ?? '—';
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
      if (s.mapMaterial) s.mapMaterial.uniforms.u_dot_size.value = 0.04 * side;
    };

    const render = () => {
      s.mapMaterial.uniforms.u_time_since_click.value = s.clock.getElapsedTime();
      checkIntersects();
      updateOverlay();
      s.controls.update();
      s.renderer.render(s.scene, s.camera);
      rafId = requestAnimationFrame(render);
    };

    generateSectorTexture().then(canvas => {
      const mapTex = canvas
        ? new THREE.CanvasTexture(canvas)
        : new THREE.TextureLoader().load('https://ksenia-k.com/img/earth-map-colored.png');
      createGlobe(mapTex);
      createPointer();
      createPopupTimelines();
      updateSize();
      render();
    });
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

      {/* Left menu */}
      {['left', 'right'].map(side => (
        <div key={side} style={{
          position: 'absolute',
          [side]: '24px',
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 10,
        }}>
          {sectors.filter(s => s.side === side).map(s => (
            <div
              key={s.id}
              onMouseEnter={() => setActiveMenu(s.id)}
              onMouseLeave={() => setActiveMenu(null)}
              onClick={() => onSectorSelect(s.id)}
              style={{
                cursor: 'pointer',
                background: activeMenu === s.id ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderRadius: '12px',
                padding: '12px 20px',
                minWidth: '130px',
                transition: 'all 0.2s',
                boxShadow: activeMenu === s.id
                  ? '0 8px 32px rgba(0,0,0,0.18)'
                  : '0 2px 12px rgba(0,0,0,0.1)',
                transform: activeMenu === s.id ? 'scale(1.04)' : 'scale(1)',
              }}
            >
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#111', letterSpacing: '-0.3px' }}>{s.title}</div>
              <div style={{ fontSize: '9px', fontWeight: '600', color: '#999', letterSpacing: '1.5px', marginTop: '2px' }}>{s.sub}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
