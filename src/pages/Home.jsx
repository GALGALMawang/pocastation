/**
 * Home.jsx — 메인 페이지
 *
 * 전체 상태 관리 허브. 인증, 경매 목록, 모달 제어를 담당한다.
 *
 * 모달 흐름:
 *   auth      → 로그인 (카카오/Google OAuth)
 *   auction   → 경매 상세 + 입찰
 *   charge    → 크레딧 충전 (Toss 가상계좌)
 *   settlement→ 낙찰 후 결제 (Toss 위젯 or 직거래)
 *   bids      → 내 입찰 내역 + 낙찰 경매
 *   profile   → 전화번호·계좌 정보 수정
 *   create    → 경매 등록 폼
 *
 * 필터/정렬 흐름:
 *   activeView  : 'live'(진행 중) | 'ended'(종료) | 'artist'(아티스트별)
 *   search      : 아티스트·멤버·앨범명 키워드 검색
 *   sortBy      : latest | popular | views | price_asc | price_desc
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Header        from '../components/Header';
import Ticker        from '../components/Ticker';
import Hero          from '../components/Hero';
import AuctionGrid   from '../components/AuctionGrid';
import Footer        from '../components/Footer';
import AuthModal     from '../components/AuthModal';
import AuctionModal  from '../components/AuctionModal';
import ChargeModal   from '../components/ChargeModal';
import SettlementModal from '../components/SettlementModal';
import BidsModal     from '../components/BidsModal';
import RegisterForm  from '../components/RegisterForm';
import ProfileModal  from '../components/ProfileModal';
import { AuthContext } from '../App';

function Home() {
  // ── 인증 상태 ──────────────────────────────────────────────
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [credit,  setCredit]  = useState(0);

  // ── 경매 목록 ──────────────────────────────────────────────
  const [auctions, setAuctions] = useState([]);
  const [loading,  setLoading]  = useState(true);

  // ── 모달 제어 ──────────────────────────────────────────────
  const [activeModal,      setActiveModal]      = useState(null);
  const [selectedAuction,  setSelectedAuction]  = useState(null); // AuctionModal용
  const [settlementAuction,setSettlementAuction]= useState(null); // SettlementModal용

  // ── 필터·정렬 ──────────────────────────────────────────────
  const [activeView, setActiveView] = useState('live');
  const [sortBy,     setSortBy]     = useState('latest');
  const [search,     setSearch]     = useState('');

  // ──────────────────────────────────────────────────────────
  // 초기 로드: 세션 확인 + 경매 목록
  // ──────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { setUser(session.user); fetchUserExtra(session.user.id); }
    });

    // 로그인/로그아웃 이벤트 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchUserExtra(session.user.id);
      else { setCredit(0); setProfile(null); }
    });

    fetchAuctions();
    return () => subscription.unsubscribe();
  }, []);

  // 크레딧 잔액 + 프로필 조회
  const fetchUserExtra = async (userId) => {
    const { data: cData } = await supabase
      .from('credits').select('balance').eq('user_id', userId).maybeSingle();
    setCredit(cData?.balance || 0);

    const { data: pData } = await supabase
      .from('profiles').select('*').eq('id', userId).maybeSingle();
    setProfile(pData);
  };

  // 전체 경매 목록 (마감 임박 순)
  const fetchAuctions = async () => {
    const { data, error } = await supabase
      .from('auctions').select('*').order('ends_at', { ascending: true });
    if (!error) setAuctions(data || []);
    setLoading(false);
  };

  // ──────────────────────────────────────────────────────────
  // 핸들러
  // ──────────────────────────────────────────────────────────

  // 네비 링크 클릭 시 뷰 전환 + 검색 초기화 + 경매 섹션으로 스크롤
  const handleNavClick = (view) => {
    setActiveView(view);
    setSearch('');
    document.getElementById('auctions')?.scrollIntoView({ behavior: 'smooth' });
  };

  // 경매 상세 모달 열기
  const openAuction = (auction) => {
    setSelectedAuction(auction);
    setActiveModal('auction');
  };

  // 낙찰 후 결제 모달 열기
  const openSettlement = (auction) => {
    setSettlementAuction(auction);
    setActiveModal('settlement');
  };

  // ──────────────────────────────────────────────────────────
  // 필터링 & 정렬
  // ──────────────────────────────────────────────────────────
  const filteredAuctions = auctions.filter(a => {
    // 키워드 검색 (그룹명·멤버·앨범)
    if (search.trim()) {
      const q = search.toLowerCase();
      const matched = [a.group_name, a.member, a.album]
        .some(v => v?.toLowerCase().includes(q));
      if (!matched) return false;
    }

    // 뷰별 상태 필터
    if (activeView === 'ended') return a.status === 'ended';
    return a.status !== 'ended' && a.status !== 'pending';
  });

  const sortedAuctions = [...filteredAuctions].sort((a, b) => {
    switch (sortBy) {
      case 'popular':    return (b.bid_count    || 0) - (a.bid_count    || 0);
      case 'views':      return (b.view_count   || 0) - (a.view_count   || 0);
      case 'price_asc':  return (a.current_price|| 0) - (b.current_price|| 0);
      case 'price_desc': return (b.current_price|| 0) - (a.current_price|| 0);
      case 'latest':
      default:           return new Date(b.created_at) - new Date(a.created_at);
    }
  });

  // 아티스트 뷰: 활성 경매의 그룹명 목록 (중복 제거)
  const artists = activeView === 'artist'
    ? [...new Set(auctions.filter(a => a.status !== 'ended').map(a => a.group_name).filter(Boolean))]
    : [];

  // ──────────────────────────────────────────────────────────
  // 렌더
  // ──────────────────────────────────────────────────────────
  return (
    <AuthContext.Provider value={{ user, profile, credit }}>
      <Header
        user={user} profile={profile} credit={credit}
        onOpenModal={setActiveModal}
        activeView={activeView} onNavClick={handleNavClick}
        search={search} onSearch={setSearch}
      />

      <main>
        <Hero auctions={auctions} onOpenAuction={openAuction} />
        <Ticker />

        {/* 아티스트 뷰: 그룹명 버튼으로 검색 */}
        {activeView === 'artist' && artists.length > 0 && (
          <div className="cat-bar"><div className="pg"><div className="cat-in">
            {artists.map(name => (
              <button
                key={name} className="cat-tb"
                onClick={() => { setSearch(name); setActiveView('live'); }}
              >
                {name}
              </button>
            ))}
          </div></div></div>
        )}

        <section className="sec" id="auctions">
          <div className="pg">

            {/* 결과 수 + 검색 태그 + 정렬 버튼 */}
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px', flexWrap:'wrap', gap:'8px'}}>
              <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                {activeView === 'ended'
                  ? <span style={{fontWeight:700, fontSize:'15px', color:'var(--t2)'}}>종료된 경매</span>
                  : <span style={{fontSize:'13px', color:'var(--t3)'}}>{sortedAuctions.length}개</span>
                }
                {search && (
                  <span style={{fontSize:'12px', color:'var(--pr)', fontWeight:700}}>
                    "{search}" 검색 중
                    <button
                      onClick={() => setSearch('')}
                      style={{marginLeft:'6px', background:'none', border:'none', cursor:'pointer', color:'var(--t3)', fontSize:'14px'}}
                    >×</button>
                  </span>
                )}
              </div>

              <div style={{display:'flex', gap:'6px', flexWrap:'wrap'}}>
                {[
                  ['latest',     '최신순'],
                  ['popular',    '인기순'],
                  ['views',      '조회순'],
                  ['price_asc',  '낮은 가격'],
                  ['price_desc', '높은 가격'],
                ].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setSortBy(val)}
                    style={{
                      padding:'5px 12px', borderRadius:'20px', fontSize:'12px', fontWeight:600,
                      cursor:'pointer', border:'1px solid', transition:'all .15s',
                      background:   sortBy === val ? 'var(--pr)' : 'transparent',
                      borderColor:  sortBy === val ? 'var(--pr)' : 'var(--bd)',
                      color:        sortBy === val ? '#fff'      : 'var(--t2)',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <AuctionGrid
              auctions={sortedAuctions}
              loading={loading}
              onOpenAuction={openAuction}
            />
          </div>
        </section>
      </main>

      <Footer />

      {/* ── 모달 ────────────────────────────────────────────── */}

      {activeModal === 'auth' && (
        <AuthModal onClose={() => setActiveModal(null)} />
      )}

      {activeModal === 'auction' && selectedAuction && (
        <AuctionModal
          auction={selectedAuction}
          user={user}
          onClose={() => setActiveModal(null)}
          onOpenAuth={() => setActiveModal('auth')}
          onOpenSettlement={openSettlement}
        />
      )}

      {activeModal === 'charge' && (
        <ChargeModal onClose={() => setActiveModal(null)} />
      )}

      {activeModal === 'settlement' && settlementAuction && (
        <SettlementModal
          auction={settlementAuction}
          onClose={() => setActiveModal(null)}
          onComplete={() => { setActiveModal(null); fetchAuctions(); }}
        />
      )}

      {activeModal === 'bids' && (
        <BidsModal
          user={user}
          onClose={() => setActiveModal(null)}
          onOpenSettlement={openSettlement}
        />
      )}

      {activeModal === 'profile' && (
        <ProfileModal
          user={user}
          onClose={() => setActiveModal(null)}
          fetchExtra={() => fetchUserExtra(user?.id)}
        />
      )}

      {activeModal === 'create' && (
        <div className="mod-wrap open" style={{zIndex:900}}>
          <div className="mod-ov" style={{padding:'20px 10px'}}>
            <div className="modal" style={{maxWidth:'540px', background:'var(--sf)'}}>
              <div className="mod-hd" style={{display:'flex', justifyContent:'space-between', padding:'16px'}}>
                <div style={{fontWeight:800, fontSize:'16px'}}>경매 등록</div>
                <button
                  onClick={() => { setActiveModal(null); fetchAuctions(); }}
                  style={{background:'none', border:'none', fontSize:'24px', cursor:'pointer', color:'var(--t3)'}}
                >×</button>
              </div>
              <div style={{maxHeight:'80vh', overflowY:'auto', padding:'20px'}}>
                <RegisterForm />
              </div>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export default Home;
