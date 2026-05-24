/**
 * Hero.jsx — 메인 히어로 섹션
 *
 * 진행 중이거나 마감 임박한 경매 중 첫 번째를 피처드 카드로 노출한다.
 * 피처드 카드 클릭 시 AuctionModal이 열린다.
 *
 * Props:
 *   auctions      - 전체 경매 배열
 *   onOpenAuction - 피처드 카드 클릭 시 호출 (auction 객체 전달)
 */
import React from 'react';

function Hero({ auctions, onOpenAuction }) {
  // live 또는 ending 상태 중 첫 번째를 피처드로 사용
  const featured = auctions.find(a => a.status === 'live' || a.status === 'ending');

  return (
    <section className="hero">
      <div className="pg">
        <div className="hero-in">

          {/* 좌측: 카피 */}
          <div className="hero-l">
            <div className="lv-chip">
              <div className="lv-badge">
                <span className="pulse"></span>LIVE
              </div>
              지금 <strong style={{color:'#fff', margin:'0 3px'}}>{auctions.length}개</strong> 경매 진행 중
            </div>

            <h1>
              <span className="ko">K-POP 포토카드</span><br />
              우주에서 만나는<br />
              <span className="ko">경매 플랫폼</span>
            </h1>

            <p className="hero-desc">
              희귀 포카부터 한정판 굿즈까지 — 공정한 경매로 진짜 가치를 찾아드립니다.
            </p>

            <div className="hero-cta">
              <a href="#auctions" className="btn-hw wh">경매 둘러보기 →</a>
            </div>
          </div>

          {/* 우측: 피처드 경매 카드 */}
          {featured && (
            <div className="h-card" onClick={() => onOpenAuction(featured)}>
              <div className="h-card-img" style={{background:'linear-gradient(160deg,#1e1065,#4c1d95)', overflow:'hidden'}}>
                {featured.img_url ? (
                  <img src={featured.img_url} alt={`${featured.group_name} ${featured.member}`}
                    style={{width:'100%', height:'100%', objectFit:'cover'}} />
                ) : (
                  <span>🃏</span>
                )}
              </div>
              <div className="h-card-ft">
                <div className="h-card-nm">{featured.group_name} · {featured.member}</div>
                <div className="h-card-sb">{featured.album}</div>
                <div className="h-card-pr">₩ {(featured.current_price || featured.start_price || 0).toLocaleString()}</div>
              </div>
            </div>
          )}

        </div>
      </div>
    </section>
  );
}

export default Hero;
