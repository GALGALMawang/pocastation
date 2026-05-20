import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import SettlementModal from './SettlementModal';

export default function AlarmTab() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [alarms, setAlarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settlementTarget, setSettlementTarget] = useState(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    // 내가 입찰한 경매에서 다른 사람이 더 높게 입찰한 경우 = 내 입찰 최고가가 현재가보다 낮은 경우
    const fetchAlarms = async () => {
      // 내 입찰 목록
      const { data: myBids } = await supabase
        .from('bids')
        .select('auction_id, amount, created_at, auctions(id, group_name, member, current_price, start_price, status, ends_at, seller_id, seller_contact, seller_name, winner_id)')
        .eq('bidder_id', user.id)
        .order('created_at', { ascending: false });

      if (!myBids) { setLoading(false); return; }

      // 경매별 내 최고 입찰가
      const byAuction = {};
      for (const b of myBids) {
        if (!byAuction[b.auction_id] || b.amount > byAuction[b.auction_id].amount) {
          byAuction[b.auction_id] = b;
        }
      }

      const notifications = Object.values(byAuction).map(b => {
        const a = b.auctions;
        const isLeading = b.amount >= a.current_price;
        return {
          id: b.auction_id,
          group_name: a.group_name,
          member: a.member,
          myBid: b.amount,
          currentPrice: a.current_price,
          status: a.status,
          isLeading,
          auction: a,
          type: a.status === 'ended' && isLeading ? 'won'
              : a.status === 'ended' && !isLeading ? 'lost'
              : isLeading ? 'leading'
              : 'outbid',
          createdAt: b.created_at,
        };
      }).sort((a, b) => {
        const order = { outbid: 0, won: 1, lost: 2, leading: 3 };
        return (order[a.type] ?? 9) - (order[b.type] ?? 9);
      });

      setAlarms(notifications);
      setLoading(false);
    };

    fetchAlarms();

    const channel = supabase
      .channel('alarm-bids')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bids' }, fetchAlarms)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'auctions' }, fetchAlarms)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  const TYPE_CONFIG = {
    outbid:  { icon: '⚠️', label: '다른 입찰자에게 앞섰습니다', color: '#b07700', bg: 'rgba(255,180,0,0.07)', border: 'rgba(255,180,0,0.2)' },
    leading: { icon: '✅', label: '현재 최고 입찰자입니다',     color: '#006d30', bg: 'rgba(0,180,80,0.06)', border: 'rgba(0,180,80,0.18)' },
    won:     { icon: '🎉', label: '낙찰을 축하드립니다!',       color: '#7c3aed', bg: 'rgba(124,58,237,0.06)', border: 'rgba(124,58,237,0.18)' },
    lost:    { icon: '😢', label: '낙찰에 실패했습니다',        color: 'rgba(0,0,0,0.4)', bg: 'rgba(0,0,0,0.03)', border: 'rgba(0,0,0,0.08)' },
  };

  if (!user) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: 16 }}>
        <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(0,0,0,0.2)', letterSpacing: 3 }}>로그인이 필요합니다</div>
        <button onClick={() => navigate('/login')} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#111', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>로그인</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      {settlementTarget && (
        <SettlementModal
          auction={settlementTarget}
          onClose={() => setSettlementTarget(null)}
          onComplete={() => setSettlementTarget(null)}
        />
      )}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 900, color: '#111', margin: '0 0 3px' }}>알림</h2>
        <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.35)', margin: 0 }}>입찰 현황 및 경매 결과</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'rgba(0,0,0,0.2)', fontFamily: 'monospace', fontSize: 11, letterSpacing: 2 }}>LOADING...</div>
      ) : alarms.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'rgba(0,0,0,0.2)', fontSize: 12 }}>입찰 내역이 없습니다</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {alarms.map(al => {
            const cfg = TYPE_CONFIG[al.type];
            return (
              <div key={al.id} style={{ padding: '14px 16px', borderRadius: 12, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{cfg.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: 9, color: '#7c3aed', fontWeight: 800, letterSpacing: 1.5, fontFamily: 'monospace' }}>{al.group_name}</div>
                        <div style={{ fontSize: 14, fontWeight: 900, color: '#111', marginTop: 1 }}>{al.member}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)' }}>내 입찰가</div>
                        <div style={{ fontSize: 13, fontWeight: 900, fontFamily: 'monospace', color: '#111' }}>₩{al.myBid?.toLocaleString()}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: cfg.color, marginTop: 6 }}>{cfg.label}</div>
                    {al.type === 'outbid' && (
                      <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', marginTop: 2 }}>현재 최고가: ₩{al.currentPrice?.toLocaleString()}</div>
                    )}
                    {al.type === 'won' && !al.settled && (
                      <button
                        onClick={() => setSettlementTarget(al.auction)}
                        style={{ marginTop: 10, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#7c3aed', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
                      >
                        결제 / 직거래 선택 →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
