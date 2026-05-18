import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatTimeLeft } from '../lib/utils';

export default function BidModal({ auction, onClose, onBidSuccess }) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const MIN_INCREMENT = 1000;
  const [amount, setAmount] = useState((auction.current_price ?? auction.start_price ?? 0) + MIN_INCREMENT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // ESC 닫기
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleBid = async () => {
    if (!user) { navigate('/login'); return; }
    if (amount <= auction.current_price) {
      setError(`현재가(₩${auction.current_price.toLocaleString()})보다 높아야 합니다`);
      return;
    }
    setLoading(true);
    setError('');
    const { error: err } = await supabase.from('bids').insert({
      auction_id: auction.id,
      bidder_id: user.id,
      bidder_name: profile?.nickname ?? user.email,
      amount,
    });
    if (err) {
      setError(err.message);
    } else {
      setSuccess(true);
      // onBidSuccess는 확인 버튼 클릭 시 호출 (성공 화면을 먼저 보여줌)
    }
    setLoading(false);
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: window.innerWidth < 768 ? 'flex-end' : 'center', justifyContent: 'center', padding: window.innerWidth < 768 ? 0 : 20 }}
    >
      <div style={{ width: '100%', maxWidth: window.innerWidth < 768 ? '100%' : 400, background: '#fff', borderRadius: window.innerWidth < 768 ? '20px 20px 0 0' : 20, boxShadow: '0 24px 80px rgba(0,0,0,0.25)', overflow: 'hidden' }}>

        {/* 헤더 */}
        <div style={{ padding: '22px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 800, color: '#7c3aed', letterSpacing: 2, fontFamily: 'monospace', marginBottom: 4 }}>{auction.group_name}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#111' }}>{auction.member}</div>
            {auction.album && <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)', marginTop: 2 }}>{auction.album}</div>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'rgba(0,0,0,0.3)', lineHeight: 1, padding: 4 }}>×</button>
        </div>

        <div style={{ padding: '18px 24px 24px' }}>
          {success ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🎯</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#111', marginBottom: 6 }}>입찰 완료!</div>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', marginBottom: 20 }}>₩{amount.toLocaleString()}으로 입찰되었습니다.</div>
              <button onClick={() => { onBidSuccess?.(); onClose(); }} style={{ padding: '10px 28px', borderRadius: 10, border: 'none', background: '#111', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>확인</button>
            </div>
          ) : (
            <>
              {/* 현재가 / 남은시간 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
                <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.07)' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(0,0,0,0.35)', letterSpacing: 1, marginBottom: 4 }}>현재가</div>
                  <div style={{ fontSize: 17, fontWeight: 900, color: '#111', fontFamily: 'monospace' }}>₩{auction.current_price.toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.3)', marginTop: 2 }}>{auction.bid_count}회 입찰</div>
                </div>
                <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.07)' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(0,0,0,0.35)', letterSpacing: 1, marginBottom: 4 }}>남은 시간</div>
                  <div style={{ fontSize: 17, fontWeight: 900, color: '#111', fontFamily: 'monospace' }}>{formatTimeLeft(auction.ends_at)}</div>
                  <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.3)', marginTop: 2 }}>등급 {auction.grade}</div>
                </div>
              </div>

              {/* 입찰가 입력 */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.5)', display: 'block', marginBottom: 6 }}>
                  입찰가 (최소 ₩{(auction.current_price + MIN_INCREMENT).toLocaleString()})
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => { setAmount(Number(e.target.value)); setError(''); }}
                    step={MIN_INCREMENT}
                    min={auction.current_price + MIN_INCREMENT}
                    style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: `1px solid ${error ? 'rgba(220,50,50,0.4)' : 'rgba(0,0,0,0.12)'}`, outline: 'none', fontSize: 14, fontWeight: 700, color: '#111', fontFamily: 'monospace' }}
                  />
                </div>
                {/* 빠른 금액 버튼 */}
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  {[1000, 5000, 10000, 50000].map(inc => (
                    <button key={inc} onClick={() => { setAmount(a => a + inc); setError(''); }}
                      style={{ flex: 1, padding: '5px 0', borderRadius: 6, border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', fontSize: 10, fontWeight: 700, color: 'rgba(0,0,0,0.5)', cursor: 'pointer' }}>
                      +{(inc / 1000).toFixed(0)}K
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div style={{ fontSize: 12, color: '#e03030', background: 'rgba(220,50,50,0.06)', border: '1px solid rgba(220,50,50,0.15)', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
                  {error}
                </div>
              )}

              {!user && (
                <div style={{ fontSize: 12, color: '#b07700', background: 'rgba(255,180,0,0.07)', border: '1px solid rgba(255,180,0,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
                  입찰하려면 로그인이 필요합니다.
                </div>
              )}

              <button
                onClick={handleBid}
                disabled={loading}
                style={{ width: '100%', padding: '13px', borderRadius: 10, border: 'none', background: loading ? 'rgba(0,0,0,0.15)' : '#111', color: '#fff', fontSize: 14, fontWeight: 800, cursor: loading ? 'default' : 'pointer', transition: 'all 0.2s' }}
              >
                {loading ? '처리 중...' : `₩${amount.toLocaleString()} 입찰하기`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
