/**
 * AuctionCard.jsx — 경매 목록 카드
 *
 * 경매 한 건을 그리드 아이템으로 표시한다.
 * img_url이 있으면 실제 이미지를, 없으면 기본 그라데이션 배경을 사용한다.
 *
 * Props:
 *   auction - auctions 테이블 행
 *   onClick - 카드 클릭 시 호출 (AuctionModal 오픈)
 */
import React from 'react';

// 상태 → 표시 라벨
const STATUS_LABEL = {
  live:    '🔴 진행 중',
  ending:  '⚡ 마감 임박',
  upcoming:'🕐 시작 예정',
  ended:   '✅ 종료',
};

function AuctionCard({ auction, onClick }) {
  const isEnded = auction.status === 'ended';

  return (
    <article className="acd" onClick={onClick} tabIndex="0">

      {/* 썸네일 */}
      <div className="thb">
        {auction.img_url ? (
          <img
            src={auction.img_url}
            alt={`${auction.group_name} ${auction.member}`}
            style={{position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover'}}
          />
        ) : (
          <div className="thb-bg" style={{position:'absolute', inset:0, background:'linear-gradient(160deg,#1e1065,#4c1d95)'}} />
        )}
        <div className="thb-ov" />

        {/* 상태 배지 */}
        <span className={`sbd ${auction.status}`}>
          {auction.status === 'live' && <span className="sdot" />}
          {STATUS_LABEL[auction.status] || auction.status}
        </span>

        {/* 등급 태그 */}
        <span className="grd-tg">{auction.grade}급</span>
      </div>

      {/* 카드 내용 */}
      <div className="cd-body">
        <div className="cd-grp">{auction.group_name}</div>
        <div className="cd-mbr">{auction.member}</div>
        <div className="cd-alb">{auction.album} · {auction.category}</div>
        <div className="cd-rl" />
        <div className="pr-row">
          <div className="pr-cur">₩ {(auction.current_price || 0).toLocaleString()}</div>
          <div className="pr-bds">{auction.bid_count || 0}회 입찰</div>
        </div>
        <button className="bid-btn df">
          {isEnded ? '결과 보기' : '입찰하기'}
        </button>
      </div>
    </article>
  );
}

export default AuctionCard;
