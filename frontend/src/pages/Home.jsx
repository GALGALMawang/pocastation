import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import WarpBackground from '../components/WarpBackground';
import SpaceshipHUD from '../components/SpaceshipHUD';
import GlobeStation from '../components/GlobeStation';
import { AUCTIONS_MOCK } from '../lib/mockData';

// Extend mock for more cards
const AUCTIONS_EXTENDED = [
  ...AUCTIONS_MOCK,
  { id: 5, group_name: 'BLACKPINK', member: '지수', album: 'BORN PINK', category: '포토카드', grade: 'S', img: 'https://images.unsplash.com/photo-1520716153060-de0cffb33e42?q=80&w=400&auto=format&fit=crop', status: 'live', price: 55000, bid_count: 18, ends_in: '02:14' },
  { id: 6, group_name: 'SEVENTEEN', member: '승관', album: 'FML', category: '포토카드', grade: 'A', img: 'https://images.unsplash.com/photo-1526779259212-939e64788e3c?q=80&w=400&auto=format&fit=crop', status: 'live', price: 31000, bid_count: 7, ends_in: '05:42' },
  { id: 7, group_name: 'STRAY KIDS', member: '한', album: '5-STAR', category: '슬로건', grade: 'B', img: 'https://images.unsplash.com/photo-1490750967868-88df5691cc5e?q=80&w=400&auto=format&fit=crop', status: 'ending', price: 19000, bid_count: 4, ends_in: '00:38' },
  { id: 8, group_name: 'NCT 127', member: '태용', album: 'Fact Check', category: '포토카드', grade: 'S', img: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=400&auto=format&fit=crop', status: 'live', price: 44000, bid_count: 12, ends_in: '08:05' },
];
AUCTIONS_EXTENDED[0].ends_in = '03:22';
AUCTIONS_EXTENDED[1].ends_in = '00:51';
AUCTIONS_EXTENDED[2].ends_in = '06:17';
AUCTIONS_EXTENDED[3].ends_in = '11:44';

export default function Home() {
  const [phase, setPhase] = useState('intro');
  const [heroVisible, setHeroVisible] = useState(true);
  const [hudVisible, setHudVisible] = useState(false);
  const [step, setStep] = useState(1);
  const [activeTab, setActiveTab] = useState('auctions');
  const [auctions] = useState(AUCTIONS_EXTENDED);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [panelIn, setPanelIn] = useState(false);

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
    if (skip || step >= 4) {
      setPhase('station');
      setHudVisible(false);
      setPanelIn(false);
      setTimeout(() => setPanelIn(true), 2400); // 행성 노출 후 패널 올라옴
      return;
    }
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
        background: 'rgba(255,255,255,0.88)',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
        backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
        opacity: (phase === 'station' || phase === 'onboarding') ? 1 : 0,
        transition: 'opacity 0.5s, background 0.6s',
        pointerEvents: phase === 'intro' ? 'none' : 'auto',
      }}>
        <div style={{ maxWidth: '100%', padding: '0 2rem', display: 'flex', alignItems: 'center', height: 56, gap: 32 }}>
          <Link to="/"><div style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 900, letterSpacing: 2, color: '#111', flexShrink: 0 }}>POCA<span style={{ color: '#7c3aed' }}>STATION</span></div></Link>

          {phase === 'station' && (
            <nav style={{ display: 'flex', gap: 2, marginLeft: 24 }}>
              {menuItems.map(m => (
                <button key={m.id} onClick={() => setActiveTab(m.id)} style={{
                  padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                  background: activeTab === m.id ? 'rgba(0,0,0,0.06)' : 'transparent',
                  color: activeTab === m.id ? '#111' : 'rgba(0,0,0,0.4)',
                  transition: 'all 0.2s',
                }}>
                  {m.label}
                </button>
              ))}
            </nav>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
            {phase === 'station' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 8, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,60,60,0.06)', border: '1px solid rgba(255,60,60,0.15)' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#e03030', display: 'inline-block', boxShadow: '0 0 5px rgba(220,50,50,0.5)' }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#c02020', letterSpacing: 0.5 }}>LIVE {auctions.filter(a => a.status === 'live').length}건</span>
                </div>
                <button style={{ padding: '6px 16px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)', background: 'transparent', color: 'rgba(0,0,0,0.6)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>로그인</button>
                <button style={{ padding: '6px 16px', borderRadius: 8, border: 'none', background: '#111', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>+ 판매 등록</button>
              </>
            )}
            <Link to="/admin" style={{ color: 'rgba(0,0,0,0.3)', fontSize: 11, fontWeight: 700 }}>관제 센터</Link>
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

      {/* Globe Preview — 패널 오르기 전 행성만 보이는 순간 */}
      {phase === 'station' && !panelIn && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{ width: 'min(78vh, 78vw)', height: 'min(78vh, 78vw)' }}>
            <GlobeStation onSectorSelect={() => {}} noMenu />
          </div>
        </div>
      )}

      {/* Station Layout — Dashboard */}
      {phase === 'station' && (
        <main style={{
          position: 'fixed',
          inset: `calc(56px + clamp(8px, 1.5vmin, 16px)) clamp(8px, 1.5vmin, 16px) clamp(8px, 1.5vmin, 16px) clamp(8px, 1.5vmin, 16px)`,
          display: 'flex',
          borderRadius: 'clamp(14px, 1.5vmin, 20px)',
          overflow: 'hidden',
          zIndex: 10,
          boxShadow: '0 8px 48px rgba(0,0,0,0.18)',
          transform: panelIn ? 'translateY(0)' : 'translateY(110%)',
          opacity: panelIn ? 1 : 0,
          transition: 'transform 1.6s cubic-bezier(0.16,1,0.3,1), opacity 0.8s ease',
        }}>

          {/* Left Sidebar: Globe Nav */}
          <aside style={{
            width: 260,
            flexShrink: 0,
            borderRight: '1px solid rgba(0,0,0,0.06)',
            background: 'rgba(255,255,255,0.82)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            display: 'flex',
            flexDirection: 'column',
            padding: '20px 0',
            overflowY: 'auto',
          }}>
            {/* Mini Globe */}
            <div style={{ width: '100%', height: 200, flexShrink: 0, position: 'relative' }}>
              <GlobeStation onSectorSelect={(id) => setActiveTab(id)} compact />
            </div>

            {/* Nav items */}
            <nav style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {menuItems.map(m => (
                <button key={m.id} onClick={() => setActiveTab(m.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: activeTab === m.id ? 'rgba(0,0,0,0.06)' : 'transparent',
                  textAlign: 'left', transition: 'all 0.2s',
                }}>
                  <div style={{
                    width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                    background: activeTab === m.id ? '#111' : 'rgba(0,0,0,0.15)',
                  }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: activeTab === m.id ? '#111' : 'rgba(0,0,0,0.4)' }}>{m.label}</div>
                    <div style={{ fontSize: 9, color: 'rgba(0,0,0,0.25)', letterSpacing: 1, fontFamily: 'monospace', marginTop: 1 }}>{m.sub}</div>
                  </div>
                  {m.id === 'auctions' && (
                    <div style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 800, color: '#e03030', background: 'rgba(255,60,60,0.08)', padding: '2px 6px', borderRadius: 4, border: '1px solid rgba(255,60,60,0.15)' }}>LIVE</div>
                  )}
                </button>
              ))}
            </nav>

            {/* Recent bids */}
            <div style={{ marginTop: 'auto', padding: '14px 16px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(0,0,0,0.3)', letterSpacing: 2, fontFamily: 'monospace', marginBottom: 10 }}>RECENT BIDS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {auctions.slice(0, 4).map(a => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(0,0,0,0.2)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.group_name} {a.member}</div>
                      <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.3)' }}>₩{a.price.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'rgba(255,255,255,0.86)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)' }}>

            {/* Content Topbar */}
            <div style={{
              padding: '12px 28px',
              borderBottom: '1px solid rgba(0,0,0,0.06)',
              display: 'flex', alignItems: 'center', gap: 16,
              flexShrink: 0,
            }}>
              <div>
                <span style={{ fontSize: 15, fontWeight: 900, color: '#111' }}>
                  {menuItems.find(m => m.id === activeTab)?.label}
                </span>
                <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(0,0,0,0.25)', letterSpacing: 1.5, marginLeft: 10 }}>
                  {menuItems.find(m => m.id === activeTab)?.sub}
                </span>
              </div>
              {activeTab === 'auctions' && (
                <>
                  <div style={{ height: 14, width: 1, background: 'rgba(0,0,0,0.1)' }} />
                  <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.3)' }}>{auctions.length}개 진행 중</span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    {['전체', 'S급', 'A급', '마감임박'].map(f => (
                      <button key={f} style={{
                        padding: '3px 10px', borderRadius: 6,
                        border: '1px solid rgba(0,0,0,0.1)',
                        background: 'transparent',
                        color: 'rgba(0,0,0,0.4)',
                        fontSize: 11, cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}>{f}</button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Scrollable Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '22px 24px' }}>
              {activeTab === 'auctions' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14 }}>
                  {auctions.map(item => (
                    <div
                      key={item.id}
                      onMouseEnter={() => setHoveredCard(item.id)}
                      onMouseLeave={() => setHoveredCard(null)}
                      style={{
                        background: '#fff',
                        border: hoveredCard === item.id
                          ? '1px solid rgba(0,0,0,0.15)'
                          : '1px solid rgba(0,0,0,0.07)',
                        borderRadius: 14,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'all 0.25s',
                        transform: hoveredCard === item.id ? 'translateY(-4px)' : 'translateY(0)',
                        boxShadow: hoveredCard === item.id
                          ? '0 12px 32px rgba(0,0,0,0.12)'
                          : '0 2px 8px rgba(0,0,0,0.05)',
                      }}
                    >
                      {/* Image */}
                      <div style={{ height: 160, overflow: 'hidden', position: 'relative' }}>
                        <img src={item.img} alt={item.member} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s', transform: hoveredCard === item.id ? 'scale(1.06)' : 'scale(1)' }} />
                        {/* Status badge */}
                        <div style={{
                          position: 'absolute', top: 10, left: 10,
                          padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 800, letterSpacing: 1,
                          background: item.status === 'ending' ? 'rgba(255,80,80,0.9)' : 'rgba(0,0,0,0.6)',
                          color: item.status === 'ending' ? '#fff' : 'rgba(255,255,255,0.8)',
                          backdropFilter: 'blur(4px)',
                        }}>
                          {item.status === 'ending' ? '⚡ 마감임박' : '● LIVE'}
                        </div>
                        {/* Grade */}
                        <div style={{
                          position: 'absolute', top: 10, right: 10,
                          width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: item.grade === 'S' ? 'rgba(255,200,0,0.9)' : 'rgba(100,180,255,0.9)',
                          fontSize: 10, fontWeight: 900, color: '#000',
                        }}>
                          {item.grade}
                        </div>
                        {/* Timer overlay at bottom */}
                        <div style={{
                          position: 'absolute', bottom: 0, left: 0, right: 0,
                          padding: '20px 10px 8px',
                          background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                          fontSize: 10, fontFamily: 'monospace', color: item.status === 'ending' ? '#ff8080' : 'rgba(255,255,255,0.6)',
                          letterSpacing: 1,
                        }}>
                          ⏱ {item.ends_in}
                        </div>
                      </div>

                      {/* Info */}
                      <div style={{ padding: '12px 14px' }}>
                        <div style={{ fontSize: 9, color: '#7c3aed', fontWeight: 800, letterSpacing: 1.5, fontFamily: 'monospace' }}>{item.group_name}</div>
                        <div style={{ fontSize: 14, fontWeight: 900, margin: '3px 0 10px', color: '#111' }}>{item.member}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 900, color: '#111' }}>₩{item.price.toLocaleString()}</div>
                            <div style={{ fontSize: 9, color: 'rgba(0,0,0,0.3)', marginTop: 1 }}>{item.bid_count}회 입찰</div>
                          </div>
                          <button style={{
                            padding: '5px 12px', borderRadius: 6,
                            background: hoveredCard === item.id ? '#111' : 'transparent',
                            color: hoveredCard === item.id ? '#fff' : '#111',
                            border: '1px solid rgba(0,0,0,0.15)',
                            fontSize: 10, fontWeight: 900, cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}>BID</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab !== 'auctions' && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60%', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(0,0,0,0.2)', letterSpacing: 3 }}>
                    {menuItems.find(m => m.id === activeTab)?.sub} — COMING SOON
                  </div>
                </div>
              )}
            </div>
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
