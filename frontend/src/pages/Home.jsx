import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';

// Modular Components
import WarpBackground from '../components/WarpBackground';
import SpaceshipHUD from '../components/SpaceshipHUD';
import GlobeStation from '../components/GlobeStation';

import { AUCTIONS_MOCK } from '../lib/mockData';

export default function Home() {
  const [phase, setPhase] = useState('intro'); // 'intro', 'onboarding', 'station'
  const [heroVisible, setHeroVisible] = useState(true);   // hero 페이드 제어
  const [hudVisible, setHudVisible] = useState(false);    // HUD 등장 딜레이 제어
  const [step, setStep] = useState(1);
  const [activeTab, setActiveTab] = useState('auctions'); // 'auctions', 'register', 'mypage', 'wallet', etc.
  const [auctions, setAuctions] = useState([]);

  useEffect(() => {
    setAuctions(AUCTIONS_MOCK);
  }, []);

  const startWarp = useCallback(() => {
    if (phase !== 'intro') return;
    // hero 페이드아웃 시작
    setHeroVisible(false);
    // 0.4s 뒤 워프 phase 전환 (hero가 흐려지는 동안)
    setTimeout(() => setPhase('onboarding'), 400);
    // 1.6s 뒤 HUD 등장 (워프 가속 완료 후)
    setTimeout(() => setHudVisible(true), 1600);
  }, [phase]);

  useEffect(() => {
    const handleWheel = (e) => {
      if (phase === 'intro' && e.deltaY > 0) startWarp();
    };
    if (phase === 'intro' || phase === 'onboarding') {
      document.body.style.overflow = 'hidden';
      window.addEventListener('wheel', handleWheel);
    } else {
      document.body.style.overflow = 'hidden';
    }
    return () => window.removeEventListener('wheel', handleWheel);
  }, [phase, startWarp]);

  const handleNextStep = (skip = false) => {
    if (skip) { setPhase('station'); setHudVisible(false); return; }
    if (step < 4) setStep(step + 1);
    else { setPhase('station'); setHudVisible(false); }
  };

  const handleSectorChange = (sectorId) => {
    setActiveTab(sectorId);
  };

  return (
    <div style={{ background: 'transparent', height: '100vh', width: '100vw', color: '#fff', overflow: 'hidden', position: 'relative' }}>
      {/* Background is always present now */}
      <WarpBackground phase={phase} />
      
      {phase === 'onboarding' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: hudVisible ? 1 : 0,
          transition: 'opacity 0.6s ease',
        }}>
          <SpaceshipHUD key={step} step={step} onNext={handleNextStep} />
        </div>
      )}

      {/* Header */}
      <header className="hdr" style={{ 
        position: 'fixed', top: 0, width: '100%', zIndex: 300, 
        background: 'rgba(2, 2, 5, 0.7)', borderBottom: '1px solid rgba(255,255,255,0.05)',
        backdropFilter: 'blur(10px)', opacity: (phase === 'station' || phase === 'onboarding') ? 1 : 0, transition: 'opacity 0.5s',
        pointerEvents: phase === 'intro' ? 'none' : 'auto'
      }}>
        <div className="pg hdr-in" style={{ display: 'flex', alignItems: 'center', height: '70px' }}>
          <Link to="/" className="logo"><div className="logo-nm">POCA<span>STATION</span></div></Link>
          <nav className="gnv" style={{ marginLeft: 'auto' }}>
            <Link to="/admin" style={{ color: 'var(--ac)', fontSize: '12px', fontWeight: '800' }}>[ 관제 센터 ]</Link>
          </nav>
        </div>
      </header>

      {(phase === 'intro' || (phase === 'onboarding' && !hudVisible)) && (
        <section className="hero" style={{
          background: 'transparent',
          opacity: heroVisible ? 1 : 0,
          transform: heroVisible ? 'scale(1)' : 'scale(1.06)',
          transition: 'opacity 0.8s ease, transform 0.8s ease',
          position: 'fixed', inset: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: phase === 'intro' ? 'auto' : 'none',
        }}>
          <div className="pg" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="hero-in">
              <h1>우리는 진정한 가치와<br/><span className="hl">팬덤을 연결합니다</span></h1>
              <p className="hero-desc" style={{ color: '#aaa' }}>
                가장 거대하고 안전한 K-POP 포토카드 유니버스로 진입하세요.
              </p>
              <div className="hero-cta" style={{ pointerEvents: 'auto', marginTop: '60px' }}>
                <button
                  onClick={startWarp}
                  style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', cursor: 'pointer', outline: 'none', margin: '0 auto' }}
                  className="warp-trigger"
                >
                  <div className="blackhole-container">
                    <svg className="blackhole-spin" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 12 c -4 0 -4 -4 0 -4 c 6 0 6 8 0 8 c -8 0 -8 -12 0 -12 c 10 0 10 16 0 16 c -12 0 -12 -20 0 -20" />
                    </svg>
                  </div>
                  <span className="blink-text" style={{ fontSize: '13px', color: '#E0E0E0', letterSpacing: '4px', fontWeight: '600' }}>
                    POCASTATION 진입
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Station: 행성 + 메뉴만 */}
      {phase === 'station' && (
        <main style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 10 }}>
          <GlobeStation onSectorSelect={handleSectorChange} />
        </main>
      )}
    </div>
  );
}
