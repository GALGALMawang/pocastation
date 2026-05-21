import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import Ticker from '../components/Ticker';
import Hero from '../components/Hero';
import CategoryBar from '../components/CategoryBar';
import AuctionGrid from '../components/AuctionGrid';
import Footer from '../components/Footer';

// Modals
import AuthModal from '../components/AuthModal';
import AuctionModal from '../components/AuctionModal';
import ChargeModal from '../components/ChargeModal';
import SettlementModal from '../components/SettlementModal';
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
  const [activeCategory, setActiveCategory] = useState('🌟 전체');
  const [activeView, setActiveView] = useState('live');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { setUser(session.user); fetchUserExtra(session.user.id); }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if(session?.user) fetchUserExtra(session.user.id);
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
    if (!error) setAuctions(data);
    setLoading(false);
  };

  const handleNavClick = (view) => {
    setActiveView(view);
    setActiveCategory('🌟 전체');
    document.getElementById('auctions')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCategorySelect = (cat) => {
    setActiveCategory(cat);
    setActiveView('live');
  };

  const filteredAuctions = auctions.filter(a => {
    if (activeView === 'ended') return a.status === 'closed';
    const notEnded = a.status !== 'closed';
    if (!notEnded) return false;
    if (activeCategory === '🌟 전체') return true;
    const catMap = {
      '🃏 포토카드': '포토카드', '💿 앨범': '앨범', '🎀 슬로건': '슬로건',
      '🔮 키링': '키링', '🖼 포스터': '포스터', '✨ 팬메이드': '팬메이드', '🛍 공식굿즈': '공식굿즈',
    };
    return a.category === catMap[activeCategory];
  });

  const artists = activeView === 'artist'
    ? [...new Set(auctions.filter(a => a.status !== 'closed').map(a => a.group_name).filter(Boolean))]
    : [];

  return (
    <AuthContext.Provider value={{ user, profile, credit }}>
      <Header user={user} credit={credit} onOpenModal={setActiveModal} activeView={activeView} onNavClick={handleNavClick} />
      <main>
        <Hero auctions={auctions} onOpenAuction={(a) => { setSelectedAuction(a); setActiveModal('auction'); }} />
        <Ticker />
        {activeView !== 'ended' && activeView !== 'artist' && (
          <CategoryBar active={activeCategory} onSelect={handleCategorySelect} />
        )}
        {activeView === 'artist' && artists.length > 0 && (
          <div className="cat-bar"><div className="pg"><div className="cat-in">
            {artists.map(name => (
              <button key={name} className="cat-tb" onClick={() => { setActiveCategory(name); setActiveView('live'); }}>
                {name}
              </button>
            ))}
          </div></div></div>
        )}
        <section className="sec" id="auctions">
          <div className="pg">
            {activeView === 'ended' && (
              <div style={{marginBottom:'16px', fontWeight:700, fontSize:'15px', color:'var(--t2)'}}>종료된 경매</div>
            )}
            <AuctionGrid auctions={filteredAuctions} loading={loading} onOpenAuction={(a) => { setSelectedAuction(a); setActiveModal('auction'); }} />
          </div>
        </section>
      </main>
      <Footer />

      {activeModal === 'auth' && <AuthModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'auction' && selectedAuction && <AuctionModal auction={selectedAuction} user={user} onClose={() => setActiveModal(null)} onOpenAuth={() => setActiveModal('auth')} />}
      {activeModal === 'charge' && <ChargeModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'create' && (
        <div className="mod-wrap open" style={{zIndex: 900}}>
          <div className="mod-ov" style={{padding: '20px 10px'}}>
            <div className="modal" style={{maxWidth: '540px', background: 'var(--sf)'}}>
              <div className="mod-hd" style={{display:'flex', justifyContent:'space-between', padding:'16px'}}>
                <div style={{fontWeight:800, fontSize:'16px'}}>경매 등록</div>
                <button onClick={() => { setActiveModal(null); fetchAuctions(); }} style={{background:'none', border:'none', fontSize:'24px', cursor:'pointer', color:'var(--t3)'}}>×</button>
              </div>
              <div style={{maxHeight:'80vh', overflowY:'auto', padding:'20px'}}>
                <RegisterForm />
              </div>
            </div>
          </div>
        </div>
      )}
      {activeModal === 'profile' && <ProfileModal user={user} onClose={() => setActiveModal(null)} fetchExtra={() => fetchUserExtra(user?.id)} />}
    </AuthContext.Provider>
  );
}

export default Home;
