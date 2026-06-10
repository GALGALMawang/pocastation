/**
 * AuctionCard.jsx — 경매 목록 카드
 *
 * 경매 한 건을 그리드 아이템으로 표시한다.
 * img_url이 있으면 실제 이미지를, 없으면 기본 그라데이션 배경을 사용한다.
 * ends_at 기준으로 남은 시간을 실시간 카운트다운으로 표시한다.
 *
 * Props:
 *   auction - auctions 테이블 행
 *   onClick - 카드 클릭 시 호출 (AuctionModal 오픈)
 */
import React, { useState, useEffect } from 'react';
import { getTimeLeft } from '../lib/utils';

const STATUS_LABEL = {
  live:    '🔴 진행 중',
  ending:  '⚡ 마감 임박',
  upcoming:'🕐 시작 예정',
  ended:   '✅ 종료',
};

function AuctionCard({ auction, onClick }) {
  const isEnded = auction.status === 'ended';
  const isLive  = auction.status === 'live';

  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(auction.ends_at));

  useEffect(() => {
    if (!isLive || !auction.ends_at) return;
    const timer = setInterval(() => setTimeLeft(getTimeLeft(auction.ends_at)), 1000);
    return () => clearInterval(timer);
  }, [isLive, auction.ends_at]);

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

        {/* 남은 시간 (진행 중인 경매만) */}
        {isLive && timeLeft && (
          <span style={{
            position:'absolute', bottom:8, left:8,
            fontSize:11, fontWeight:700, color:'#fff',
            background:'rgba(0,0,0,0.55)', borderRadius:6,
            padding:'3px 8px', backdropFilter:'blur(4px)',
          }}>
            ⏱ {timeLeft}
          </span>
        )}
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
