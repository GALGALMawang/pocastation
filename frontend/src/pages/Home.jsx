import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { isEndingSoon } from '../lib/utils';
import WarpBackground from '../components/WarpBackground';
import SpaceshipHUD from '../components/SpaceshipHUD';
import GlobeStation from '../components/GlobeStation';
import AuctionCard from '../components/AuctionCard';
import RegisterForm from '../components/RegisterForm';
import BidModal from '../components/BidModal';
import RankingTab from '../components/RankingTab';
import MyPageTab from '../components/MyPageTab';
import AlarmTab from '../components/AlarmTab';

const NAV_ICONS = {
  auctions: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  register: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  ranking:  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  mypage:   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  alarm:    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
};

const MENU_ITEMS = [
  { id: 'auctions', label: '경매',      sub: 'LIVE AUCTION' },
  { id: 'register', label: '등록',      sub: 'SELL'         },
  { id: 'ranking',  label: '랭킹',      sub: 'RANKING'      },
  { id: 'mypage',   label: '마이페이지', sub: 'MY PAGE'      },
  { id: 'alarm',    label: '알림',      sub: 'ALERTS'       },
];

export default function Home() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const [phase, setPhase]             = useState('intro');
  const [heroVisible, setHeroVisible] = useState(true);
  const [hudVisible, setHudVisible]   = useState(false);
  const [step, setStep]               = useState(1);
  const [activeTab, setActiveTab]     = useState('auctions');
  const [panelIn, setPanelIn]         = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState('전체');
  const [auctions, setAuctions]       = useState([]);
  const [auctionsLoading, setAuctionsLoading] = useState(true);
  const [bidTarget, setBidTarget]     = useState(null);
  const [isMobile, setIsMobile]       = useState(() => window.innerWidth < 768);
  const globeSyncRef                  = useRef({ y: 0 });

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Supabase 실시간 경매 fetch
  useEffect(() => {
    const fetchAuctions = async () => {
      const { data } = await supabase
        .from('auctions')
        .select('*')
        .eq('status', 'live')
        .order('created_at', { ascending: false });
      setAuctions(data ?? []);
      setAuctionsLoading(false);
    };
    fetchAuctions();
    const channel = supabase
      .channel('live-auctions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auctions' }, fetchAuctions)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const startWarp = useCallback(() => {
    if (phase !== 'intro') return;
    setHeroVisible(false);
    setTimeout(() => setPhase('onboarding'), 400);
    setTimeout(() => setHudVisible(true), 1600);
  }, [phase]);

  useEffect(() => {
    const onWheel = (e) => { if (phase === 'intro' && e.deltaY > 0) startWarp(); };
    document.body.style.overflow = 'hidden';
    window.addEventListener('wheel', onWheel);
    return () => window.removeEventListener('wheel', onWheel);
  }, [phase, startWarp]);

  const handleNextStep = (skip = false) => {
    if (skip || step >= 4) {
      setPhase('station');
      setHudVisible(false);
      setPanelIn(false);
      setTimeout(() => setPanelIn(true), 2400);
      return;
    }
    setStep(s => s + 1);
  };

  useEffect(() => {
    const id = setInterval(() => setAuctions(a => [...a]), 60000);
    return () => clearInterval(id);
  }, []);

  const filteredAuctions = auctions.filter(a => {
    const matchSearch = !searchQuery || [a.group_name, a.member, a.album].some(v => v?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchGrade = gradeFilter === '전체' || (gradeFilter === 'S급' && a.grade === 'S') || (gradeFilter === 'A급' && a.grade === 'A') || (gradeFilter === '마감임박' && isEndingSoon(a.ends_at));
    return matchSearch && matchGrade;
  });

  return (
    <div style={{ background: 'transparent', height: '100vh', width: '100vw', color: '#fff', overflow: 'hidden', position: 'relative' }}>
      <WarpBackground phase={phase} />

      {/* Onboarding HUD */}
      {phase === 'onboarding' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: isMobile ? '16px' : '5%',
          opacity: hudVisible ? 1 : 0, transition: 'opacity 0.6s ease',
        }}>
          <div style={{ width: '100%', maxWidth: 860, background: '#05050f', borderRadius: 20, border: '1px solid rgba(0,229,255,0.25)', boxShadow: '0 0 0 1px rgba(0,229,255,0.05), 0 8px 60px rgba(0,0,0,0.6), 0 0 40px rgba(0,229,255,0.06)' }}>
            <SpaceshipHUD key={step} step={step} onNext={handleNextStep} />
          </div>
        </div>
      )}

      {/* Header */}
      <header style={{
        position: 'fixed', top: 0, width: '100%', zIndex: 300,
        background: '#ffffff',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
      }}>
        <div style={{ padding: '0 1rem', display: 'flex', alignItems: 'center', height: 56, gap: isMobile ? 10 : 20 }}>
          <Link to="/"><div className="logo-nm">POCA<span>STATION</span></div></Link>

          {phase === 'station' && !isMobile && (
            <nav style={{ display: 'flex', gap: 2 }}>
              {MENU_ITEMS.map(m => (
                <button key={m.id} onClick={() => setActiveTab(m.id)} style={{
                  padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                  background: activeTab === m.id ? 'rgba(0,0,0,0.06)' : 'transparent',
                  color: activeTab === m.id ? '#111' : 'rgba(0,0,0,0.4)', transition: 'all 0.2s',
                }}>{m.label}</button>
              ))}
            </nav>
          )}

          {phase === 'station' && !isMobile && (
            <div style={{ flex: 1, maxWidth: 340, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, padding: '0 12px', height: 34 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="그룹, 멤버, 앨범 검색..." style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 12, color: '#111' }} />
              {searchQuery && <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(0,0,0,0.3)', fontSize: 14, padding: 0 }}>×</button>}
            </div>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            {phase === 'intro' && (
              user ? (
                <button onClick={signOut} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: 'rgba(124,58,237,0.1)', color: '#7c3aed', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>로그아웃</button>
              ) : (
                <button onClick={() => navigate('/login')} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: 'rgba(124,58,237,0.1)', color: '#7c3aed', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>로그인</button>
              )
            )}
            {phase === 'station' && (
              <>
                {!isMobile && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 4, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,60,60,0.06)', border: '1px solid rgba(255,60,60,0.15)' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#e03030', boxShadow: '0 0 5px rgba(220,50,50,0.5)' }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#c02020', letterSpacing: 0.5 }}>LIVE {auctions.length}건</span>
                  </div>
                )}
                {user ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {!isMobile && <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.5)', fontWeight: 600 }}>{profile?.nickname ?? user.email}</span>}
                    <button onClick={signOut} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)', background: 'transparent', color: 'rgba(0,0,0,0.6)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>로그아웃</button>
                  </div>
                ) : (
                  <button onClick={() => navigate('/login')} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)', background: 'transparent', color: 'rgba(0,0,0,0.6)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>로그인</button>
                )}
                {!isMobile && <button onClick={() => setActiveTab('register')} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#111', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>+ 등록</button>}
              </>
            )}
            {isAdmin && !isMobile && <Link to="/admin" style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: 'rgba(124,58,237,0.1)', color: '#7c3aed', fontSize: 12, fontWeight: 700 }}>관제 센터</Link>}
          </div>
        </div>
      </header>

      {/* Intro Hero */}
      {(phase === 'intro' || (phase === 'onboarding' && !hudVisible)) && (
        <section style={{
          background: 'transparent', opacity: heroVisible ? 1 : 0,
          transform: heroVisible ? 'scale(1)' : 'scale(1.06)',
          transition: 'opacity 0.8s ease, transform 0.8s ease',
          position: 'fixed', inset: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: phase === 'intro' ? 'auto' : 'none',
          padding: '0 24px',
        }}>
          <div className="hero-in">
            <h1>우리는 진정한 가치와<br /><span className="hl">팬덤을 연결합니다</span></h1>
            <p className="hero-desc" style={{ color: '#aaa', fontSize: isMobile ? '16px' : undefined }}>
              {isMobile ? <>가장 거대하고 안전한<br />K-POP 포토카드 유니버스로 진입하세요.</> : '가장 거대하고 안전한 K-POP 포토카드 유니버스로 진입하세요.'}
            </p>
            <div style={{ pointerEvents: 'auto', marginTop: 60 }}>
              <button onClick={startWarp} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, cursor: 'pointer', outline: 'none', margin: '0 auto', WebkitTapHighlightColor: 'transparent' }} className="warp-trigger">
                <div className="blackhole-container">
                  <svg className="blackhole-spin" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 12 c -4 0 -4 -4 0 -4 c 6 0 6 8 0 8 c -8 0 -8 -12 0 -12 c 10 0 10 16 0 16 c -12 0 -12 -20 0 -20" />
                  </svg>
                </div>
                <span className="blink-text" style={{ fontSize: 13, color: '#E0E0E0', letterSpacing: 4, fontWeight: 600 }}>POCASTATION 진입</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Background Globe */}
      {phase === 'station' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ width: 'min(78vh, 78vw)', height: 'min(78vh, 78vw)' }}>
            <GlobeStation onSectorSelect={() => {}} noMenu syncRef={globeSyncRef} master />
          </div>
        </div>
      )}

      {/* Station Dashboard */}
      {phase === 'station' && (
        <main style={{
          position: 'fixed',
          top: 56,
          left: 0, right: 0,
          bottom: isMobile ? 60 : 0,
          margin: isMobile ? 0 : 'clamp(10px, 2vmin, 20px)',
          marginTop: isMobile ? 0 : 'clamp(10px, 2vmin, 20px)',
          display: 'flex',
          borderRadius: isMobile ? 0 : 'clamp(14px, 2vmin, 20px)',
          overflow: 'hidden',
          zIndex: 10,
          boxShadow: isMobile ? 'none' : '0 8px 48px rgba(0,0,0,0.18)',
          transform: panelIn ? 'translateY(0)' : 'translateY(110%)',
          opacity: panelIn ? 1 : 0,
          transition: 'transform 1.6s cubic-bezier(0.16,1,0.3,1), opacity 0.8s ease',
        }}>

          {/* Sidebar — 데스크탑만 */}
          {!isMobile && (
            <aside style={{ width: 260, flexShrink: 0, borderRight: '1px solid rgba(0,0,0,0.06)', background: '#ffffff', display: 'flex', flexDirection: 'column', padding: '20px 0', overflowY: 'auto' }}>
              <div style={{ width: '100%', height: 200, flexShrink: 0 }}>
                <GlobeStation onSectorSelect={(id) => setActiveTab(id)} compact syncRef={globeSyncRef} />
              </div>
              <div style={{ margin: '0 14px 8px', height: 1, background: 'rgba(0,0,0,0.06)' }} />
              <nav style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {MENU_ITEMS.map(m => (
                  <button key={m.id} onClick={() => setActiveTab(m.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: activeTab === m.id ? 'rgba(0,0,0,0.06)' : 'transparent', textAlign: 'left', transition: 'all 0.2s',
                  }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: activeTab === m.id ? '#111' : 'rgba(0,0,0,0.15)' }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: activeTab === m.id ? '#111' : 'rgba(0,0,0,0.4)' }}>{m.label}</div>
                      <div style={{ fontSize: 9, color: 'rgba(0,0,0,0.25)', letterSpacing: 1, fontFamily: 'monospace', marginTop: 1 }}>{m.sub}</div>
                    </div>
                    {m.id === 'auctions' && <div style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 800, color: '#e03030', background: 'rgba(255,60,60,0.08)', padding: '2px 6px', borderRadius: 4, border: '1px solid rgba(255,60,60,0.15)' }}>LIVE</div>}
                  </button>
                ))}
              </nav>
              <div style={{ marginTop: 'auto', padding: '14px 16px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(0,0,0,0.3)', letterSpacing: 2, fontFamily: 'monospace', marginBottom: 10 }}>RECENT BIDS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {auctions.slice(0, 4).map(a => (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => setBidTarget(a)}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(0,0,0,0.2)', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.group_name} {a.member}</div>
                        <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.3)' }}>₩{(a.current_price ?? a.start_price)?.toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          )}

          {/* Main Content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'rgba(255,255,255,0.92)' }}>

            {/* Content Topbar */}
            <div style={{ padding: isMobile ? '10px 16px' : '10px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 900, color: '#111', flexShrink: 0 }}>
                  {MENU_ITEMS.find(m => m.id === activeTab)?.label}
                </span>
                {activeTab === 'auctions' && !isMobile && (
                  <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
                    {['전체', 'S급', 'A급', '마감임박'].map(f => (
                      <button key={f} onClick={() => setGradeFilter(f)} style={{ padding: '3px 9px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.1)', background: gradeFilter === f ? 'rgba(0,0,0,0.08)' : 'transparent', color: gradeFilter === f ? '#111' : 'rgba(0,0,0,0.4)', fontSize: 11, cursor: 'pointer', fontWeight: gradeFilter === f ? 700 : 400 }}>{f}</button>
                    ))}
                  </div>
                )}
                {isMobile && activeTab === 'auctions' && (
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,60,60,0.06)', border: '1px solid rgba(255,60,60,0.15)', padding: '2px 8px', borderRadius: 10 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#e03030' }} />
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#c02020' }}>LIVE {auctions.length}</span>
                  </div>
                )}
              </div>

              {/* 모바일 검색 + 필터 */}
              {isMobile && activeTab === 'auctions' && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, padding: '0 10px', height: 32 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="그룹, 멤버 검색..." style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 12, color: '#111' }} />
                    {searchQuery && <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(0,0,0,0.3)', fontSize: 14, padding: 0 }}>×</button>}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {['전체', 'S급', 'A급'].map(f => (
                      <button key={f} onClick={() => setGradeFilter(f)} style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.1)', background: gradeFilter === f ? 'rgba(0,0,0,0.08)' : 'transparent', color: gradeFilter === f ? '#111' : 'rgba(0,0,0,0.4)', fontSize: 10, cursor: 'pointer', fontWeight: gradeFilter === f ? 700 : 400, whiteSpace: 'nowrap' }}>{f}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Scrollable Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px' : '22px 24px' }}>
              {activeTab === 'auctions' && (
                auctionsLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60%', color: 'rgba(0,0,0,0.25)', fontSize: 11, fontFamily: 'monospace', letterSpacing: 2 }}>LOADING...</div>
                ) : filteredAuctions.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60%', color: 'rgba(0,0,0,0.2)', fontSize: 11, fontFamily: 'monospace', letterSpacing: 2 }}>진행 중인 경매가 없습니다</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(190px, 1fr))', gap: isMobile ? 10 : 14 }}>
                    {filteredAuctions.map(item => <AuctionCard key={item.id} item={item} onBid={setBidTarget} />)}
                  </div>
                )
              )}
              {activeTab === 'register' && <RegisterForm />}
              {activeTab === 'ranking'  && <RankingTab />}
              {activeTab === 'mypage'   && <MyPageTab />}
              {activeTab === 'alarm'    && <AlarmTab />}
            </div>
          </div>
        </main>
      )}

      {/* 모바일 하단 탭바 */}
      {phase === 'station' && isMobile && (
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, height: 60, zIndex: 400,
          background: '#fff', borderTop: '1px solid rgba(0,0,0,0.08)',
          display: 'flex', alignItems: 'stretch',
        }}>
          {MENU_ITEMS.map(m => (
            <button key={m.id} onClick={() => setActiveTab(m.id)} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 3, border: 'none', cursor: 'pointer',
              background: 'transparent',
              color: activeTab === m.id ? '#7c3aed' : 'rgba(0,0,0,0.3)',
              borderTop: activeTab === m.id ? '2px solid #7c3aed' : '2px solid transparent',
              transition: 'all 0.2s',
            }}>
              {NAV_ICONS[m.id]}
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.3 }}>{m.label}</span>
            </button>
          ))}
        </nav>
      )}

      {/* Bid Modal */}
      {bidTarget && (
        <BidModal
          auction={bidTarget}
          onClose={() => setBidTarget(null)}
          onBidSuccess={() => setBidTarget(null)}
        />
      )}

      <style>{`@keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </div>
  );
}
