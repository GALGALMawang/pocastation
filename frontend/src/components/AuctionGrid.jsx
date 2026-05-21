import React from 'react';
import AuctionCard from './AuctionCard';

function AuctionGrid({ auctions, loading, onOpenAuction }) {
  if (loading) {
    return (
      <div className="grid">
        {[1, 2, 3, 4].map(i => <div key={i} className="ske"></div>)}
      </div>
    );
  }

  if (auctions.length === 0) {
    return (
      <div style={{gridColumn:'1/-1', textAlign:'center', padding:'64px 0', color:'var(--t3)', fontSize:'14px'}}>
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
