import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

function AuctionModal({ auction, user, onClose, onOpenAuth }) {
  const [bidAmount, setBidAmount] = useState((auction.current_price || 0) + 500);
  const [bids, setBids] = useState([]);

  useEffect(() => {
    fetchBids();
    const channel = supabase.channel(`auction-${auction.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bids', filter: `auction_id=eq.${auction.id}` }, () => {
        fetchBids();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [auction.id]);

  const fetchBids = async () => {
    const { data } = await supabase.from('bids').select('*').eq('auction_id', auction.id).order('created_at', { ascending: false }).limit(10);
    if (data) setBids(data);
  };

  const handleBid = async () => {
    if (!user) { onOpenAuth(); return; }
    const { data, error } = await supabase.rpc('place_bid', {
      p_auction_id: auction.id,
      p_user_id: user.id,
      p_user_name: user.email?.split('@')[0] || '유저',
      p_amount: bidAmount
    });
    if (error || !data?.success) alert(data?.message || '입찰 실패');
    else alert('입찰 완료!');
  };

  return (
    <div className="mod-wrap open"><div className="mod-ov"><div className="modal">
      <div className="mod-hd">
        <div className="mod-ttl">{auction.group_name} · {auction.member}</div>
        <button className="mod-cl" onClick={onClose}>×</button>
      </div>
      <div className="mod-body">
        <div className="mod-layout">
          <div className="mod-img" style={{background: 'var(--bg)'}}>{auction.emoji || '🃏'}</div>
          <div>
            <div className="mbig">₩ {(auction.current_price || 0).toLocaleString()}</div>
            <div className="blog-list">
              {bids.map((b, i) => (
                <div key={i} className="blog-row">
                  <span>{b.bidder_name || '익명'}</span>
                  <span className="blog-amt">₩ {b.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="bid-pnl">
              <input type="number" className="bid-inp" value={bidAmount} onChange={(e) => setBidAmount(parseInt(e.target.value))} />
              <button className="bid-go" onClick={handleBid}>입찰하기</button>
            </div>
          </div>
        </div>
      </div>
    </div></div></div>
  );
}

export default AuctionModal;
