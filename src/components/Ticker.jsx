import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

function Ticker() {
  const [bids, setBids] = useState([]);

  useEffect(() => {
    fetchLatestBids();
    
    const channel = supabase.channel('ticker-bids')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bids' }, () => {
        fetchLatestBids();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchLatestBids = async () => {
    const { data } = await supabase.from('bids')
      .select('*, auctions(group_name, member)')
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) setBids(data);
  };

  return (
    <div className="tkr"><div className="pg"><div className="tkr-in">
      <div className="tkr-lb"><span className="pulse" style={{background:'rgba(255,255,255,.6)'}}></span>실시간 경매 현황</div>
      <div className="tkr-sc">
        <div className="tkr-tr">
          {[...bids, ...bids].map((bid, i) => (
            <span key={`${bid.id}-${i}`} className="tk-it">
              {bid.auctions?.group_name} {bid.auctions?.member} — 
              <span className="tk-pr"> ₩{bid.amount.toLocaleString()}</span> 입찰
              <span className="tk-dt"></span>
            </span>
          ))}
        </div>
      </div>
    </div></div></div>
  );
}

export default Ticker;
