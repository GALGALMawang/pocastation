import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Header from './components/Header';
import Ticker from './components/Ticker';
import Hero from './components/Hero';
import CategoryBar from './components/CategoryBar';
import AuctionGrid from './components/AuctionGrid';
import Footer from './components/Footer';

// Modals
import AuthModal from './components/AuthModal';
import AuctionModal from './components/AuctionModal';
import ChargeModal from './components/ChargeModal';
import PaymentModal from './components/PaymentModal';
import CreateAuctionModal from './components/CreateAuctionModal';
import ProfileModal from './components/ProfileModal';

function App() {
  const [user, setUser] = useState(null);
  const [credit, setCredit] = useState(0);
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState(null); // 'auth', 'auction', 'charge', 'payment', 'profile', 'bids', 'create'
  const [selectedAuction, setSelectedAuction] = useState(null);

  useEffect(() => {
    // 세션 체크
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { setUser(session.user); fetchUserExtra(session.user.id); }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if(session?.user) fetchUserExtra(session.user.id);
      else setCredit(0);
    });

    fetchAuctions();

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserExtra = async (userId) => {
    const { data } = await supabase.from('credits').select('balance').eq('user_id', userId).maybeSingle();
    setCredit(data?.balance || 0);
  };

  const fetchAuctions = async () => {
    const { data, error } = await supabase.from('auctions').select('*').order('ends_at', { ascending: true });
    if (!error) setAuctions(data);
    setLoading(false);
  };

  return (
    <div className="app">
      <Header 
        user={user} 
        credit={credit}
        onOpenModal={(m) => setActiveModal(m)} 
      />
      
      <main>
        <Hero auctions={auctions} onOpenAuction={(a) => { setSelectedAuction(a); setActiveModal('auction'); }} />
        <Ticker auctions={auctions} />
        <CategoryBar />
        
        <section className="sec" id="auctions">
          <div className="pg">
            <AuctionGrid 
              auctions={auctions} 
              loading={loading}
              onOpenAuction={(a) => { setSelectedAuction(a); setActiveModal('auction'); }} 
            />
          </div>
        </section>
      </main>

      <Footer />

      {/* Modals */}
      {activeModal === 'auth' && <AuthModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'auction' && selectedAuction && (
        <AuctionModal 
          auction={selectedAuction} 
          user={user} 
          onClose={() => setActiveModal(null)} 
          onOpenAuth={() => setActiveModal('auth')}
        />
      )}
      {activeModal === 'charge' && <ChargeModal user={user} onClose={() => setActiveModal(null)} />}
      {activeModal === 'create' && <CreateAuctionModal user={user} onClose={() => { setActiveModal(null); fetchAuctions(); }} />}
      {activeModal === 'profile' && <ProfileModal user={user} onClose={() => setActiveModal(null)} fetchExtra={() => fetchUserExtra(user.id)} />}
    </div>
  );
}

export default App;
