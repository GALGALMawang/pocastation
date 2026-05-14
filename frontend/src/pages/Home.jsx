import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import WarpBackground from '../components/WarpBackground';
import SpaceshipHUD from '../components/SpaceshipHUD';
import GlobeStation from '../components/GlobeStation';
import { AUCTIONS_MOCK } from '../lib/mockData';

export default function Home() {
  const [phase, setPhase] = useState('intro');
  const [heroVisible, setHeroVisible] = useState(true);
  const [hudVisible, setHudVisible] = useState(false);
  const [step, setStep] = useState(1);
  const [activeTab, setActiveTab] = useState('auctions');
  const [auctions] = useState(AUCTIONS_MOCK);

  const startWarp = useCallback(() => {
    if (phase !== 'intro') return;
    setHeroVisible(false);
    setTimeout(() => setPhase('onboarding'), 400);
    setTimeout(() => setHudVisible(true), 1600);
  }, [phase]);

  useEffect(() => {
    const handleWheel = (e) => {
      if (phase === 'intro' && e.deltaY > 0) startWarp();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('wheel', handleWheel);
    return () => window.removeEventListener('wheel', handleWheel);
  }, [phase, startWarp]);

  const handleNextStep = (skip = false) => {
    if (skip || step >= 4) { setPhase('station'); setHudVisible(false); return; }
    setStep(s => s + 1);
  };

  const menuItems = [
    { id: 'auctions', label: '경매',      sub: 'LIVE AUCTION'   },
    { id: 'register', label: '등록',      sub: 'SELL'           },
    { id: 'ranking',  label: '랭킹',      sub: 'RANKING'        },
    { id: 'mypage',   label: '마이페이지', sub: 'MY PAGE'        },
    { id: 'alarm',    label: '알림',      sub: 'ALERTS'         },
  ];

  return (
    <div style={{ background: 'transparent', height: '100vh', width: '100vw', color: '#fff', overflow: 'hidden', position: 'relative' }}>
      <WarpBackground phase={phase} />

      {/* Onboarding HUD */}
      {phase === 'onboarding' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: hudVisible ? 1 : 0, transition: 'opacity 0.6s ease',
        }}>
          <SpaceshipHUD key={step} step={step} onNext={handleNextStep} />
        </div>
      )}

      {/* Header */}
      <header style={{
        position: 'fixed', top: 0, width: '100%', zIndex: 300,
        background: phase === 'station' ? 'rgba(4,4,10,0.7)' : 'rgba(255,255,255,0.92)',
        borderBottom: phase === 'station' ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.08)',
        backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
        opacity: (phase === 'station' || phase === 'onboarding') ? 1 : 0,
        transition: 'opacity 0.5s, background 0.6s',
        pointerEvents: phase === 'intro' ? 'none' : 'auto',
      }}>
        <div style={{ maxWidth: 1300, margin: '0 auto', padding: '0 2rem', display: 'flex', alignItems: 'center', height: 60, gap: 32 }}>
          <Link to="/"><div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 900, letterSpacing: 2, color: phase === 'station' ? '#fff' : '#111' }}>POCA<span style={{ color: 'var(--ok)' }}>STATION</span></div></Link>

          {phase === 'station' && (
            <nav style={{ display: 'flex', gap: 6, marginLeft: 32 }}>
              {menuItems.map(m => (
                <button key={m.id} onClick={() => setActiveTab(m.id)} style={{
                  padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                  background: activeTab === m.id ? 'rgba(255,255,255,0.15)' : 'transparent',
                  color: activeTab === m.id ? '#fff' : 'rgba(255,255,255,0.5)',
                  transition: 'all 0.2s',
                }}>
                  {m.label}
                </button>
              ))}
            </nav>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
            {phase === 'station' && (
              <>
                <button style={{ padding: '7px 18px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>로그인</button>
                <button style={{ padding: '7px 18px', borderRadius: 20, border: 'none', background: 'var(--ok)', color: '#000', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>+ 판매 등록</button>
              </>
            )}
            <Link to="/admin" style={{ color: 'var(--ac)', fontSize: 11, fontWeight: 800 }}>관제 센터</Link>
          </div>
        </div>
      </header>

      {/* Intro Hero */}
      {(phase === 'intro' || (phase === 'onboarding' && !hudVisible)) && (
        <section className="hero" style={{
          background: 'transparent', opacity: heroVisible ? 1 : 0,
          transform: heroVisible ? 'scale(1)' : 'scale(1.06)',
          transition: 'opacity 0.8s ease, transform 0.8s ease',
          position: 'fixed', inset: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: phase === 'intro' ? 'auto' : 'none',
        }}>
          <div className="pg" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="hero-in">
              <h1>우리는 진정한 가치와<br /><span className="hl">팬덤을 연결합니다</span></h1>
              <p className="hero-desc" style={{ color: '#aaa' }}>가장 거대하고 안전한 K-POP 포토카드 유니버스로 진입하세요.</p>
              <div className="hero-cta" style={{ pointerEvents: 'auto', marginTop: 60 }}>
                <button onClick={startWarp} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, cursor: 'pointer', outline: 'none', margin: '0 auto' }} className="warp-trigger">
                  <div className="blackhole-container">
                    <svg className="blackhole-spin" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 12 c -4 0 -4 -4 0 -4 c 6 0 6 8 0 8 c -8 0 -8 -12 0 -12 c 10 0 10 16 0 16 c -12 0 -12 -20 0 -20" />
                    </svg>
                  </div>
                  <span className="blink-text" style={{ fontSize: 13, color: '#E0E0E0', letterSpacing: 4, fontWeight: 600 }}>POCASTATION 진입</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Station Layout */}
      {phase === 'station' && (
        <main style={{ height: '100vh', paddingTop: 60, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 10 }}>

          {/* Hero Row: 텍스트 좌 + 행성 우 */}
          <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', padding: '0 6vw', minHeight: '55vh', gap: 40 }}>

            {/* Left: 텍스트 + 통계 + CTA */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,80,80,0.15)', border: '1px solid rgba(255,80,80,0.3)', borderRadius: 20, padding: '4px 14px', width: 'fit-content' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ff5050', display: 'inline-block', boxShadow: '0 0 6px #ff5050' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#ff9090', letterSpacing: 1 }}>LIVE — 경매 진행 중</span>
              </div>

              <div>
                <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(32px, 4vw, 58px)', fontWeight: 900, lineHeight: 1.15, letterSpacing: -1, margin: 0 }}>
                  K-POP 포토카드<br />
                  <span style={{ background: 'linear-gradient(to right, #00F0FF, #8A2BE2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>우주에서 만나는</span><br />
                  경매 플랫폼
                </h1>
                <p style={{ marginTop: 16, fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, maxWidth: 420 }}>
                  희귀 포카부터 한정판 굿즈까지 — 공정한 경매로 진짜 가치를 찾아드립니다.
                </p>
              </div>

              {/* Stats */}
              <div style={{ display: 'flex', gap: 32 }}>
                {[['12만+', '누적 거래'], ['4.9★', '만족도'], ['98%', '안전 거래']].map(([val, lbl]) => (
                  <div key={lbl}>
                    <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5 }}>{val}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{lbl}</div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                <button onClick={() => setActiveTab('auctions')} style={{
                  padding: '11px 24px', borderRadius: 24, border: 'none',
                  background: 'rgba(255,255,255,0.95)', color: '#000',
                  fontSize: 13, fontWeight: 800, cursor: 'pointer',
                }}>경매 둘러보기 →</button>
                <button style={{
                  padding: '11px 24px', borderRadius: 24,
                  border: '1px solid rgba(255,255,255,0.2)', background: 'transparent',
                  color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}>이용 방법</button>
              </div>
            </div>

            {/* Right: Globe */}
            <div style={{ flex: '0 0 auto', width: 'clamp(300px, 38vw, 520px)', height: 'clamp(300px, 38vw, 520px)', position: 'relative' }}>
              <GlobeStation onSectorSelect={(id) => setActiveTab(id)} />
            </div>
          </div>

          {/* Ticker */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)', padding: '10px 0', overflow: 'hidden', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 48, animation: 'ticker 20s linear infinite', whiteSpace: 'nowrap', paddingLeft: '100%' }}>
              {[...auctions, ...auctions].map((a, i) => (
                <span key={i} style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>
                  <span style={{ color: 'var(--ok)', fontWeight: 700 }}>● {a.group_name} {a.member}</span>
                  &nbsp;&nbsp;₩{a.price.toLocaleString()} 낙찰
                </span>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '32px 6vw 60px' }}>
            {activeTab === 'auctions' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                  <div>
                    <h2 style={{ fontSize: 20, fontWeight: 900 }}>진행 중인 경매</h2>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>실시간 업데이트 · 지금 바로 입찰하세요</p>
                  </div>
                  <button style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>전체 보기 →</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                  {auctions.map(item => (
                    <div key={item.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s', backdropFilter: 'blur(10px)' }}
                      onMouseOver={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                      onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      <div style={{ height: 180, overflow: 'hidden' }}>
                        <img src={item.img} alt={item.member} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div style={{ padding: '14px 16px' }}>
                        <div style={{ fontSize: 10, color: 'var(--ok)', fontWeight: 800, letterSpacing: 1 }}>{item.group_name}</div>
                        <div style={{ fontSize: 16, fontWeight: 900, margin: '4px 0 12px' }}>{item.member}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 15, fontWeight: 900 }}>₩{item.price.toLocaleString()}</span>
                          <button style={{ padding: '5px 14px', background: 'var(--ok)', color: '#000', border: 'none', borderRadius: 8, fontWeight: 900, fontSize: 11, cursor: 'pointer' }}>BID</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab !== 'auctions' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh', color: 'rgba(255,255,255,0.2)', fontSize: 14, fontFamily: 'monospace' }}>
                {menuItems.find(m => m.id === activeTab)?.label} — COMING SOON
              </div>
            )}
          </div>
        </main>
      )}

      <style>{`
        @keyframes ticker {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
