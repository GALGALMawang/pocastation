/**
 * Ticker.jsx — 실시간 입찰 현황 티커
 *
 * 최근 입찰 10건을 가져와 무한 스크롤 애니메이션으로 표시한다.
 * Supabase Realtime으로 새 입찰이 들어오면 자동 갱신된다.
 *
 * 배열을 두 번 복제([...bids, ...bids])하는 이유:
 *   CSS 무한 스크롤 애니메이션(tkr-tr)이 첫 번째 세트가 끝나면
 *   두 번째 세트로 이어지는 구조이기 때문
 */
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

function Ticker() {
  const [bids, setBids] = useState([]);

  useEffect(() => {
    fetchLatestBids();

    // 새 입찰 시 티커 갱신
    const channel = supabase.channel('ticker-bids')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bids' }, () => {
        fetchLatestBids();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchLatestBids = async () => {
    const { data } = await supabase
      .from('bids')
      .select('*, auctions(group_name, member)')
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) setBids(data);
  };

  return (
    <div className="tkr">
      <div className="pg">
        <div className="tkr-in">
          <div className="tkr-lb">
            <span className="pulse" style={{background:'rgba(255,255,255,.6)'}}></span>
            실시간 경매 현황
          </div>
          <div className="tkr-sc">
            <div className="tkr-tr">
              {/* 무한 스크롤을 위해 배열 2회 반복 */}
              {[...bids, ...bids].map((bid, i) => (
                <span key={`${bid.id}-${i}`} className="tk-it">
                  {bid.auctions?.group_name} {bid.auctions?.member} —
                  <span className="tk-pr"> ₩{bid.amount.toLocaleString()}</span> 입찰
                  <span className="tk-dt"></span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Ticker;
