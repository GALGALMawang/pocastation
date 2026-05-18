import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function RankingTab() {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('bids'); // 'bids' | 'price'

  useEffect(() => {
    supabase
      .from('auctions')
      .select('*')
      .in('status', ['live', 'ended'])
      .order(mode === 'bids' ? 'bid_count' : 'current_price', { ascending: false })
      .limit(20)
      .then(({ data }) => { setAuctions(data ?? []); setLoading(false); });
  }, [mode]);

  const MEDAL = ['🥇', '🥈', '🥉'];

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: '#111', margin: '0 0 3px' }}>HOT 랭킹</h2>
          <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.35)', margin: 0 }}>가장 인기 있는 경매 순위</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['bids', '입찰수'], ['price', '최고가']].map(([v, l]) => (
            <button key={v} onClick={() => { setMode(v); setLoading(true); }} style={{
              padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)',
              background: mode === v ? '#111' : 'transparent',
              color: mode === v ? '#fff' : 'rgba(0,0,0,0.4)',
              fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}>{l}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'rgba(0,0,0,0.2)', fontFamily: 'monospace', fontSize: 11, letterSpacing: 2 }}>LOADING...</div>
      ) : auctions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'rgba(0,0,0,0.2)', fontFamily: 'monospace', fontSize: 11, letterSpacing: 2 }}>데이터 없음</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {auctions.map((a, i) => (
            <div key={a.id} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 16px', borderRadius: 12,
              background: i < 3 ? 'rgba(0,0,0,0.03)' : '#fff',
              border: '1px solid rgba(0,0,0,0.07)',
            }}>
              <div style={{ width: 28, textAlign: 'center', fontSize: i < 3 ? 20 : 13, fontWeight: 900, color: i < 3 ? undefined : 'rgba(0,0,0,0.3)', fontFamily: 'monospace' }}>
                {i < 3 ? MEDAL[i] : `#${i + 1}`}
              </div>
              {a.img_url && (
                <img src={a.img_url} alt={a.member} style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 9, color: '#7c3aed', fontWeight: 800, letterSpacing: 1.5, fontFamily: 'monospace' }}>{a.group_name}</div>
                <div style={{ fontSize: 14, fontWeight: 900, color: '#111', marginTop: 1 }}>{a.member}</div>
                {a.album && <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.35)', marginTop: 1 }}>{a.album}</div>}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: '#111', fontFamily: 'monospace' }}>₩{a.current_price?.toLocaleString()}</div>
                <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.35)', marginTop: 2 }}>{a.bid_count}회 입찰</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
