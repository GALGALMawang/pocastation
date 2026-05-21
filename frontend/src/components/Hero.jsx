import React from 'react';

function Hero({ auctions, onOpenAuction }) {
  const featured = auctions.find(a => a.status === 'live' || a.status === 'ending');

  return (
    <section className="hero"><div className="pg"><div className="hero-in">
      <div className="hero-l">
        <div className="lv-chip">
          <div className="lv-badge"><span className="pulse"></span>LIVE</div>
          지금 <strong style={{color:'#fff', margin:'0 3px'}}>{auctions.length}개</strong> 경매 진행 중
        </div>
        <h1><span className="ko">K-POP 포토카드</span><br />우주에서 만나는<br /><span className="ko">경매 플랫폼</span></h1>
        <p className="hero-desc">희귀 포카부터 한정판 굿즈까지 — 공정한 경매로 진짜 가치를 찾아드립니다.</p>
        <div className="hero-stats">
          <div className="hst"><div className="nm">12만+</div><div className="lb">누적 거래</div></div>
          <div className="hst"><div className="nm">4.9 ★</div><div className="lb">만족도</div></div>
          <div className="hst"><div className="nm">98%</div><div className="lb">안전 거래</div></div>
        </div>
        <div className="hero-cta">
          <a href="#auctions" className="btn-hw wh">경매 둘러보기 →</a>
        </div>
      </div>
      {featured && (
        <div className="h-card" onClick={() => onOpenAuction(featured)}>
          <div className="h-card-img" style={{background:'linear-gradient(160deg,#1e1065,#4c1d95)'}}>
            {featured.emoji || '🃏'}
          </div>
          <div className="h-card-ft">
            <div className="h-card-nm">{featured.group_name} · {featured.member}</div>
            <div className="h-card-sb">{featured.album}</div>
            <div className="h-card-pr">₩ {(featured.current_price || featured.price || 0).toLocaleString()}</div>
          </div>
        </div>
      )}
    </div></div></section>
  );
}

export default Hero;
