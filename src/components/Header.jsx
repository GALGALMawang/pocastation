import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

function Header({ user, profile, credit, onOpenModal, activeView, onNavClick, search, onSearch }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <header className="hdr"><div className="pg hdr-in">
      <a href="#" className="logo">
        <div className="logo-i">★</div>
        <div><div className="logo-nm">POCA</div><div className="logo-ds">K-POP 포카 경매</div></div>
      </a>
      <div className="srch">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input
          type="text"
          placeholder="아티스트, 멤버, 앨범 검색..."
          value={search || ''}
          onChange={e => onSearch?.(e.target.value)}
          onFocus={() => document.getElementById('auctions')?.scrollIntoView({ behavior: 'smooth' })}
        />
      </div>
      <nav className="gnv">
        <a href="#auctions" className={activeView === 'live' ? 'on' : ''} onClick={(e) => { e.preventDefault(); onNavClick('live'); }}>경매</a>
        <a href="#auctions" className={activeView === 'artist' ? 'on' : ''} onClick={(e) => { e.preventDefault(); onNavClick('artist'); }}>아티스트</a>
        <a href="#auctions" className={activeView === 'ended' ? 'on' : ''} onClick={(e) => { e.preventDefault(); onNavClick('ended'); }}>종료된 경매</a>
      </nav>
      <div className="hdr-r">
        {user && (
          <div className="user-cr show">₩ {(credit || 0).toLocaleString()}</div>
        )}
        <button className="ic-btn" onClick={() => onOpenModal('bids')}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <span className="ndot"></span>
        </button>
        <button className="btn btn-p" onClick={() => onOpenModal('create')}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span className="btn-txt">판매 등록</span>
        </button>
        
        {user ? (
          <div className="user-wrap">
            <div className="user-chip" onClick={() => setMenuOpen(!menuOpen)}>
              <div className="user-av" style={{background: '#5B3FE8'}}>
                {user.email?.[0].toUpperCase()}
              </div>
              <span className="user-nm">{user.email?.split('@')[0]}</span>
            </div>
            {menuOpen && (
              <div className="user-menu open">
                <div style={{padding:'16px 16px 12px', borderBottom:'1px solid var(--bd)'}}>
                  <div style={{fontSize:'11px', color:'var(--t3)', marginBottom:'4px', fontWeight:700}}>내 크레딧</div>
                  <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                    <div style={{fontFamily:'var(--fe)', fontSize:'16px', fontWeight:800, color:'var(--t1)'}}>
                      ₩ {(credit || 0).toLocaleString()}
                    </div>
                    <button className="cr-btn" onClick={() => { setMenuOpen(false); onOpenModal('charge'); }}>충전</button>
                  </div>
                </div>
                <div className="user-menu-item" onClick={() => { setMenuOpen(false); onOpenModal('profile'); }}>내 프로필</div>
                <div className="user-menu-item" onClick={() => { setMenuOpen(false); onOpenModal('bids'); }}>입찰 내역</div>
                <div className="user-menu-divider"></div>
                <div className="user-menu-item danger" onClick={handleLogout}>로그아웃</div>
              </div>
            )}
          </div>
        ) : (
          <button className="btn btn-o" onClick={() => onOpenModal('auth')}>로그인</button>
        )}
      </div>
    </div></header>
  );
}

export default Header;
