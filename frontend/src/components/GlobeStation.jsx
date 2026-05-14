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


// Death Star under-construction texture (equirectangular 2048x1024)
// White = built surface (dots), Black = void / unbuilt zones

export default function GlobeStation({ onSectorSelect, compact = false, noMenu = false }) {
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

    const createPointer = () => {
      const geo = new THREE.SphereGeometry(0.04, 16, 16);
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
      s.pointer = new THREE.Mesh(geo, mat);
      s.scene.add(s.pointer);
    };

    const updateOverlay = () => {};

    const checkIntersects = () => {
      s.rayCaster.setFromCamera(s.mouse, s.camera);
      return s.rayCaster.intersectObject(s.globeMesh);
    };

    const updateMousePos = (ex, ey) => {
      s.mouse.x = (ex - containerEl.offsetLeft) / containerEl.offsetWidth * 2 - 1;
      s.mouse.y = -((ey - containerEl.offsetTop) / containerEl.offsetHeight) * 2 + 1;
    };

    const onMouseMove = (e) => updateMousePos(e.clientX, e.clientY);
    const onClick = (e) => {
      if (dragged) return;
      updateMousePos(e.clientX, e.clientY);
      // ripple effect only — no pointer dot, no popup
      const hits = checkIntersects();
      if (hits.length) {
        s.mapMaterial.uniforms.u_pointer.value = hits[0].face.normal;
        s.clock.start();
      }
    };

    containerEl.addEventListener('mousemove', onMouseMove);
    containerEl.addEventListener('click', onClick);

    const updateSize = () => {
      const side = compact
        ? Math.min(containerEl.parentElement?.offsetWidth ?? 200, 200)
        : 0.42 * Math.min(window.innerWidth, window.innerHeight);
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

    new THREE.TextureLoader().load(
      'https://ksenia-k.com/img/earth-map-colored.png',
      (mapTex) => {
        mapTex.repeat.set(1, 1);
        createGlobe(mapTex);
        createPointer();
        updateSize();
        render();
      }
    );
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', position: 'relative' }}>
      {/* Globe */}
      <div ref={containerRef} style={{ position: 'relative', flexShrink: 0 }}>
        <canvas ref={canvas3DRef} style={{ display: 'block', position: 'absolute' }} />
        <canvas ref={canvas2DRef} style={{ display: 'none' }} />
      </div>

      {/* Left menu */}
      {!compact && !noMenu && ['left', 'right'].map(side => (
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
