import React, { useState, useEffect, useRef } from 'react';
import { BellRing, PackageCheck, Crosshair, ChevronDown, User, Wallet, History, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

// Modular Components
import WarpBackground from '../components/WarpBackground';
import SpaceshipHUD from '../components/SpaceshipHUD';
import GlobeStation from '../components/GlobeStation';

import { AUCTIONS_MOCK } from '../lib/mockData';

export default function Home() {
  const [phase, setPhase] = useState('intro'); // 'intro', 'onboarding', 'station'
  const [step, setStep] = useState(1);
  const [activeTab, setActiveTab] = useState('auctions'); // 'auctions', 'register', 'mypage', 'wallet', etc.
  const [auctions, setAuctions] = useState([]);

  useEffect(() => {
    setAuctions(AUCTIONS_MOCK);
  }, []);

  useEffect(() => {
    const handleWheel = (e) => {
      if (phase === 'intro' && e.deltaY > 0) setPhase('onboarding');
    };
    if (phase === 'intro' || phase === 'onboarding') {
      document.body.style.overflow = 'hidden';
      window.addEventListener('wheel', handleWheel);
    } else {
      document.body.style.overflow = 'hidden'; 
    }
    return () => window.removeEventListener('wheel', handleWheel);
  }, [phase]);

  const handleNextStep = (skip = false) => {
    if (skip) { setPhase('station'); return; }
    if (step < 4) setStep(step + 1);
    else setPhase('station');
  };

  const handleSectorChange = (sectorId) => {
    setActiveTab(sectorId);
  };

  return (
    <div style={{ background: 'transparent', height: '100vh', width: '100vw', color: '#fff', overflow: 'hidden', position: 'relative' }}>
      {/* Background is always present now */}
      <WarpBackground phase={phase} />
      
      {phase === 'onboarding' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

      {phase === 'intro' && (
        <section className={`hero hero-transition`} style={{ background: 'transparent' }}>
          <div className="pg" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="hero-in">
              <h1 style={{ color: '#fff' }}>우리는 진정한 가치와<br/><span className="hl">팬덤을 연결합니다</span></h1>
              <p className="hero-desc" style={{ color: '#aaa' }}>
                가장 거대하고 안전한 K-POP 포토카드 유니버스로 진입하세요.
              </p>
              
              <div className="hero-cta" style={{ pointerEvents: 'auto', marginTop: '60px' }}>
                <button 
                  onClick={() => setPhase('onboarding')} 
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

      {/* Main Station Layout */}
      {phase === 'station' && (
        <main style={{ height: '100vh', display: 'flex', flexDirection: 'column', paddingTop: '70px', position: 'relative', zIndex: 10 }}>
          
          {/* Top Tier: Persistent Visual Area */}
          <section style={{ 
            height: '42vh', minHeight: '320px', flexShrink: 0, position: 'relative', 
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent'
          }}>
            <div style={{ width: '100%', height: '100%', maxWidth: '1000px', margin: '0 auto' }}>
              <GlobeStation onSectorSelect={handleSectorChange} />
            </div>
          </section>

          {/* Bottom Tier: Scrollable Content Area */}
          <section style={{ flex: 1, overflowY: 'auto', background: 'rgba(2, 2, 5, 0.4)', backdropFilter: 'blur(5px)' }}>
            <div className="pg" style={{ padding: '50px 0 80px 0' }}>
              
              {activeTab === 'auctions' && (
                <div style={{ animation: 'fade-in 0.6s ease' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                    <div style={{ width: '3px', height: '20px', background: 'var(--ok)' }}></div>
                    <h2 style={{ fontSize: '20px', fontWeight: '900', letterSpacing: '1px' }}>LIVE_AUCTIONS // 실시간 경매</h2>
                  </div>
                  <div className="grid">
                    {auctions.map(item => (
                      <article key={item.id} className="acd" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', backdropFilter: 'blur(10px)' }}>
                        <div className="thb"><img src={item.img} alt={item.album} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>
                        <div style={{ padding: '20px' }}>
                          <div style={{ color: 'var(--ok)', fontSize: '10px', fontWeight: '800' }}>{item.group_name}</div>
                          <div style={{ fontSize: '18px', fontWeight: '900', margin: '6px 0 14px' }}>{item.member}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '16px', fontWeight: '900' }}>₩ {item.price.toLocaleString()}</div>
                            <button style={{ padding: '8px 16px', background: 'var(--ok)', color: '#000', borderRadius: '8px', fontWeight: '900', fontSize: '11px' }}>BID</button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'register' && (
                <div style={{ animation: 'fade-in 0.6s ease', maxWidth: '600px', margin: '0 auto' }}>
                  <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <PackageCheck size={48} color="var(--ok)" style={{ marginBottom: '16px' }} />
                    <h2 style={{ fontSize: '28px', fontWeight: '900' }}>ITEM_REGISTRATION</h2>
                    <p style={{ color: '#aaa', marginTop: '8px', fontSize: '14px' }}>새로운 물품을 궤도에 등록하십시오.</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ padding: '40px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', textAlign: 'center', borderStyle: 'dashed' }}>
                      <div style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.3 }}>+</div>
                      <p style={{ fontSize: '13px', color: '#888' }}>이미지 업로드 (PNG, JPG)</p>
                    </div>
                    <input placeholder="ITEM_NAME" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px', borderRadius: '10px', color: '#fff', fontSize: '14px' }} />
                    <button style={{ padding: '16px', background: 'var(--ok)', color: '#000', fontWeight: '900', borderRadius: '10px', fontSize: '14px' }}>INITIALIZE_UPLOAD</button>
                  </div>
                </div>
              )}

              {activeTab === 'mypage' && (
                <div style={{ animation: 'fade-in 0.6s ease' }}>
                  <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
                    <div style={{ width: '140px', height: '140px', borderRadius: '24px', background: 'linear-gradient(45deg, #00F0FF, #8A2BE2)', flexShrink: 0 }}></div>
                    <div style={{ flex: 1 }}>
                      <h2 style={{ fontSize: '32px', fontWeight: '900' }}>TRAVELLER_77</h2>
                      <p style={{ color: 'var(--ok)', fontWeight: '800', marginTop: '8px', fontSize: '13px' }}>LEVEL: COSMIC_PIONEER</p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '32px' }}>
                        <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                          <div style={{ color: '#888', fontSize: '11px' }}>WALLET</div>
                          <div style={{ fontSize: '16px', fontWeight: '900', marginTop: '8px' }}>₩ 1,450,000</div>
                        </div>
                        <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                          <div style={{ color: '#888', fontSize: '11px' }}>WIN_RATE</div>
                          <div style={{ fontSize: '16px', fontWeight: '900', marginTop: '8px' }}>84%</div>
                        </div>
                        <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                          <div style={{ color: '#888', fontSize: '11px' }}>NOTIFS</div>
                          <div style={{ fontSize: '16px', fontWeight: '900', marginTop: '8px' }}>5 NEW</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>
      )}
    </div>
  );
}
