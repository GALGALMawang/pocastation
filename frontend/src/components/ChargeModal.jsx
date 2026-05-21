import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const AMOUNTS = [10000, 30000, 50000, 100000, 300000];

export default function ChargeModal({ onClose }) {
  const [amount, setAmount] = useState(50000);
  const [custom, setCustom] = useState('');
  const [loading, setLoading] = useState(false);
  const [account, setAccount] = useState(null);

  const finalAmount = custom ? parseInt(custom) : amount;

  const requestCharge = async () => {
    if (!finalAmount || finalAmount < 1000) return alert('최소 1,000원부터 충전 가능합니다');
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/toss-virtual-account`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ amount: finalAmount }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setAccount(json);
    } catch (e) {
      alert('오류: ' + e.message);
    }
    setLoading(false);
  };

  const isMobile = window.innerWidth < 768;
  const overlayStyle = {
    position: 'fixed', inset: 0, zIndex: 600,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: isMobile ? 'flex-end' : 'center',
    justifyContent: 'center',
  };
  const boxStyle = {
    background: '#fff',
    width: '100%',
    maxWidth: isMobile ? '100%' : 420,
    borderRadius: isMobile ? '20px 20px 0 0' : 20,
    padding: 24,
  };

  // 가상계좌 발급 완료 화면
  if (account) {
    const due = account.dueDate ? new Date(account.dueDate).toLocaleString('ko-KR') : '24시간 이내';
    return (
      <div style={overlayStyle} onClick={onClose}>
        <div style={boxStyle} onClick={e => e.stopPropagation()}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🏦</div>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#111' }}>입금 계좌 안내</div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', marginTop: 4 }}>아래 계좌로 입금하면 자동으로 충전됩니다</div>
          </div>

          <div style={{ padding: '20px', borderRadius: 14, background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.08)', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', fontWeight: 600 }}>은행</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#111' }}>{account.bankName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', fontWeight: 600 }}>계좌번호</span>
              <span style={{ fontSize: 15, fontWeight: 900, color: '#111', fontFamily: 'monospace', letterSpacing: 1 }}>{account.accountNumber}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', fontWeight: 600 }}>입금액</span>
              <span style={{ fontSize: 15, fontWeight: 900, color: '#7c3aed', fontFamily: 'monospace' }}>₩{account.amount?.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', fontWeight: 600 }}>입금 기한</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#c02020' }}>{due}</span>
            </div>
          </div>

          <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)', lineHeight: 1.7, marginBottom: 20, padding: '10px 12px', background: 'rgba(124,58,237,0.04)', borderRadius: 10 }}>
            입금 확인 후 자동으로 크레딧이 추가됩니다. 반드시 정확한 금액을 입금해 주세요.
          </div>

          <button onClick={onClose} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: '#111', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>확인</button>
        </div>
      </div>
    );
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={boxStyle} onClick={e => e.stopPropagation()}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: '#111', marginBottom: 4 }}>크레딧 충전</div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)' }}>계좌이체로 입금하면 즉시 충전됩니다</div>
        </div>

        {/* 금액 선택 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
          {AMOUNTS.map(a => (
            <button key={a} onClick={() => { setAmount(a); setCustom(''); }} style={{
              padding: '10px 4px', borderRadius: 10,
              border: `1.5px solid ${amount === a && !custom ? '#7c3aed' : 'rgba(0,0,0,0.1)'}`,
              background: amount === a && !custom ? 'rgba(124,58,237,0.07)' : '#fff',
              color: amount === a && !custom ? '#7c3aed' : '#111',
              fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'monospace',
            }}>
              ₩{a.toLocaleString()}
            </button>
          ))}
        </div>

        {/* 직접 입력 */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.45)', display: 'block', marginBottom: 6 }}>직접 입력</label>
          <input
            type="number"
            value={custom}
            onChange={e => { setCustom(e.target.value); setAmount(0); }}
            placeholder="금액 직접 입력 (최소 1,000원)"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid rgba(0,0,0,0.12)', fontSize: 14, outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box' }}
          />
        </div>

        <button
          onClick={requestCharge}
          disabled={loading || !finalAmount}
          style={{
            width: '100%', padding: 13, borderRadius: 10, border: 'none',
            background: finalAmount >= 1000 ? '#111' : 'rgba(0,0,0,0.1)',
            color: finalAmount >= 1000 ? '#fff' : 'rgba(0,0,0,0.3)',
            fontSize: 14, fontWeight: 800,
            cursor: finalAmount >= 1000 ? 'pointer' : 'default',
          }}
        >
          {loading ? '처리 중...' : `₩${finalAmount?.toLocaleString() ?? 0} 계좌 발급받기`}
        </button>
      </div>
    </div>
  );
}
