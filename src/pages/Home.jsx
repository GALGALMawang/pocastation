import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import Ticker from '../components/Ticker';
import Hero from '../components/Hero';
import AuctionGrid from '../components/AuctionGrid';
import Footer from '../components/Footer';

// Modals
import AuthModal from '../components/AuthModal';
import AuctionModal from '../components/AuctionModal';
import ChargeModal from '../components/ChargeModal';
import SettlementModal from '../components/SettlementModal';
import BidsModal from '../components/BidsModal';
import RegisterForm from '../components/RegisterForm';
import ProfileModal from '../components/ProfileModal';
import { AuthContext } from '../App';

function Home() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [credit, setCredit] = useState(0);
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState(null);
  const [selectedAuction, setSelectedAuction] = useState(null);
  const [settlementAuction, setSettlementAuction] = useState(null);
  const [activeView, setActiveView] = useState('live');
  const [sortBy, setSortBy] = useState('latest');
  const [search, setSearch] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { setUser(session.user); fetchUserExtra(session.user.id); }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchUserExtra(session.user.id);
      else { setCredit(0); setProfile(null); }
    });

    fetchAuctions();
    return () => subscription.unsubscribe();
  }, []);

  const fetchUserExtra = async (userId) => {
    const { data: cData } = await supabase.from('credits').select('balance').eq('user_id', userId).maybeSingle();
    setCredit(cData?.balance || 0);
    const { data: pData } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    setProfile(pData);
  };

  const fetchAuctions = async () => {
    const { data, error } = await supabase.from('auctions').select('*').order('ends_at', { ascending: true });
    if (!error) setAuctions(data || []);
    setLoading(false);
  };

  const handleNavClick = (view) => {
    setActiveView(view);
    setSearch('');
    document.getElementById('auctions')?.scrollIntoView({ behavior: 'smooth' });
  };

  const openSettlement = (auction) => {
    setSettlementAuction(auction);
    setActiveModal('settlement');
  };

  const openAuction = (a) => {
    setSelectedAuction(a);
    setActiveModal('auction');
  };

  // 필터링
  const filteredAuctions = auctions.filter(a => {
    // 검색
    if (search.trim()) {
      const q = search.toLowerCase();
      const hit = [a.group_name, a.member, a.album].some(v => v?.toLowerCase().includes(q));
      if (!hit) return false;
    }
    // 뷰 필터
    if (activeView === 'ended') return a.status === 'ended';
    return a.status !== 'ended' && a.status !== 'pending';
  });

  const sortedAuctions = [...filteredAuctions].sort((a, b) => {
    if (sortBy === 'latest')     return new Date(b.created_at) - new Date(a.created_at);
    if (sortBy === 'popular')    return (b.bid_count || 0) - (a.bid_count || 0);
    if (sortBy === 'views')      return (b.view_count || 0) - (a.view_count || 0);
    if (sortBy === 'price_asc')  return (a.current_price || 0) - (b.current_price || 0);
    if (sortBy === 'price_desc') return (b.current_price || 0) - (a.current_price || 0);
    return 0;
  });

  const artists = activeView === 'artist'
    ? [...new Set(auctions.filter(a => a.status !== 'ended').map(a => a.group_name).filter(Boolean))]
    : [];

  return (
    <AuthContext.Provider value={{ user, profile, credit }}>
      <Header
        user={user} profile={profile} credit={credit} onOpenModal={setActiveModal}
        activeView={activeView} onNavClick={handleNavClick}
        search={search} onSearch={setSearch}
      />
      <main>
        <Hero auctions={auctions} onOpenAuction={openAuction} />
        <Ticker />

        {activeView === 'artist' && artists.length > 0 && (
          <div className="cat-bar"><div className="pg"><div className="cat-in">
            {artists.map(name => (
              <button key={name} className="cat-tb" onClick={() => { setSearch(name); setActiveView('live'); }}>
                {name}
              </button>
            ))}
          </div></div></div>
        )}

        <section className="sec" id="auctions">
          <div className="pg">
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px', flexWrap:'wrap', gap:'8px'}}>
              <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                {activeView === 'ended'
                  ? <span style={{fontWeight:700, fontSize:'15px', color:'var(--t2)'}}>종료된 경매</span>
                  : <span style={{fontSize:'13px', color:'var(--t3)'}}>{sortedAuctions.length}개</span>
                }
                {search && (
                  <span style={{fontSize:'12px', color:'var(--pr)', fontWeight:700}}>
                    "{search}" 검색 중
                    <button onClick={() => setSearch('')}
                      style={{marginLeft:'6px', background:'none', border:'none', cursor:'pointer', color:'var(--t3)', fontSize:'14px'}}>×</button>
                  </span>
                )}
              </div>
              <div style={{display:'flex', gap:'6px', flexWrap:'wrap'}}>
                {[['latest','최신순'],['popular','인기순'],['views','조회순'],['price_asc','낮은 가격'],['price_desc','높은 가격']].map(([val, label]) => (
                  <button key={val} onClick={() => setSortBy(val)}
                    style={{
                      padding:'5px 12px', borderRadius:'20px', fontSize:'12px', fontWeight:600,
                      cursor:'pointer', border:'1px solid', transition:'all .15s',
                      background: sortBy === val ? 'var(--pr)' : 'transparent',
                      borderColor: sortBy === val ? 'var(--pr)' : 'var(--bd)',
                      color: sortBy === val ? '#fff' : 'var(--t2)',
                    }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <AuctionGrid auctions={sortedAuctions} loading={loading} onOpenAuction={openAuction} />
          </div>
        </section>
      </main>
      <Footer />

      {activeModal === 'auth'       && <AuthModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'auction'    && selectedAuction && (
        <AuctionModal
          auction={selectedAuction} user={user}
          onClose={() => setActiveModal(null)}
          onOpenAuth={() => setActiveModal('auth')}
          onOpenSettlement={openSettlement}
        />
      )}
      {activeModal === 'charge'     && <ChargeModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'settlement' && settlementAuction && (
        <SettlementModal
          auction={settlementAuction}
          onClose={() => setActiveModal(null)}
          onComplete={() => { setActiveModal(null); fetchAuctions(); }}
        />
      )}
      {activeModal === 'bids'       && (
        <BidsModal
          user={user}
          onClose={() => setActiveModal(null)}
          onOpenSettlement={openSettlement}
        />
      )}
      {activeModal === 'profile'    && (
        <ProfileModal user={user} onClose={() => setActiveModal(null)} fetchExtra={() => fetchUserExtra(user?.id)} />
      )}
      {activeModal === 'create'     && (
        <div className="mod-wrap open" style={{zIndex:900}}>
          <div className="mod-ov" style={{padding:'20px 10px'}}>
            <div className="modal" style={{maxWidth:'540px', background:'var(--sf)'}}>
              <div className="mod-hd" style={{display:'flex', justifyContent:'space-between', padding:'16px'}}>
                <div style={{fontWeight:800, fontSize:'16px'}}>경매 등록</div>
                <button onClick={() => { setActiveModal(null); fetchAuctions(); }}
                  style={{background:'none', border:'none', fontSize:'24px', cursor:'pointer', color:'var(--t3)'}}>×</button>
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
