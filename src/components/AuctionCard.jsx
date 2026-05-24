import React from 'react';

function AuctionCard({ auction, onClick }) {
  const SL = { live: '🔴 진행 중', ending: '⚡ 마감 임박', upcoming: '🕐 시작 예정', ended: '✅ 종료' };

  return (
    <article className="acd" onClick={onClick} tabIndex="0">
      <div className="thb">
        {auction.img_url ? (
          <img src={auction.img_url} alt={`${auction.group_name} ${auction.member}`}
            style={{position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover'}} />
        ) : (
          <div className="thb-bg" style={{position:'absolute', inset:0, background:'linear-gradient(160deg,#1e1065,#4c1d95)'}}></div>
        )}
        <div className="thb-ov"></div>
        <span className={`sbd ${auction.status}`}>
          {auction.status === 'live' && <span className="sdot"></span>}
          {SL[auction.status] || auction.status}
        </span>
        <span className="grd-tg">{auction.grade}급</span>
      </div>
      <div className="cd-body">
        <div className="cd-grp">{auction.group_name}</div>
        <div className="cd-mbr">{auction.member}</div>
        <div className="cd-alb">{auction.album} · {auction.category}</div>
        <div className="cd-rl"></div>
        <div className="pr-row">
          <div className="pr-cur">₩ {(auction.current_price || 0).toLocaleString()}</div>
          <div className="pr-bds">{auction.bid_count || 0}회 입찰</div>
        </div>
        <button className="bid-btn df">{auction.status === 'ended' ? '결과 보기' : '입찰하기'}</button>
      </div>
    </article>
  );
}

export default AuctionCard;
