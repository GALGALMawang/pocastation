import React, { useState } from 'react';

function Header({ user, onOpenModal }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="hdr"><div className="pg hdr-in">
      <a href="#" className="logo">
        <div className="logo-i">★</div>
        <div><div className="logo-nm">POCA</div><div className="logo-ds">K-POP 포카 경매</div></div>
      </a>
      <div className="srch">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input type="text" placeholder="아티스트, 멤버, 앨범 검색..." />
      </div>
      <nav className="gnv"><a href="#auctions" className="on">경매</a><a href="#">아티스트</a><a href="#">종료된 경매</a></nav>
      <div className="hdr-r">
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
                <div className="user-menu-item" onClick={() => onOpenModal('profile')}>내 프로필</div>
                <div className="user-menu-item" onClick={() => onOpenModal('bids')}>입찰 내역</div>
                <div className="user-menu-divider"></div>
                <div className="user-menu-item danger" onClick={() => { /* logout */ }}>로그아웃</div>
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
