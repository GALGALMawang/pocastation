/**
 * AuctionGrid.jsx — 경매 카드 그리드
 *
 * 로딩 중에는 스켈레톤 카드를 표시하고,
 * 데이터가 없으면 빈 상태 메시지를 표시한다.
 *
 * Props:
 *   auctions      - 표시할 경매 배열
 *   loading       - 로딩 여부
 *   onOpenAuction - 카드 클릭 시 호출 (auction 객체 전달)
 */
import React from 'react';
import AuctionCard from './AuctionCard';

function AuctionGrid({ auctions, loading, onOpenAuction }) {
  if (loading) {
    return (
      <div className="grid">
        {[1, 2, 3, 4].map(i => <div key={i} className="ske" />)}
      </div>
    );
  }

  if (auctions.length === 0) {
    return (
      <div style={{textAlign:'center', padding:'64px 0', color:'var(--t3)', fontSize:'14px'}}>
        등록된 경매가 없습니다.
      </div>
    );
  }

  return (
    <div className="grid">
      {auctions.map(a => (
        <AuctionCard key={a.id} auction={a} onClick={() => onOpenAuction(a)} />
      ))}
    </div>
  );
}

export default AuctionGrid;
