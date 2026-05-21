import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatTimeLeft } from '../lib/utils';
import ChargeModal from './ChargeModal';

const STATUS_LABEL = { pending: '승인 대기', live: '진행중', ended: '종료', rejected: '거부됨' };
const STATUS_COLOR = { pending: '#b07700', live: '#006d30', ended: 'rgba(0,0,0,0.35)', rejected: '#b02020' };

export default function MyPageTab() {
  const { user, profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [myAuctions, setMyAuctions] = useState([]);
  const [myBids, setMyBids] = useState([]);
  const [tab, setTab] = useState('auctions');
  const [txHistory, setTxHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [bankAccount, setBankAccount] = useState('');
  const [bankSaved, setBankSaved] = useState(false);
  const [credits, setCredits] = useState(0);
  const [showCharge, setShowCharge] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('auctions').select('*').eq('seller_id', user.id).order('created_at', { ascending: false }),
      supabase.from('bids').select('*, auctions(group_name, member, album, current_price, status)').eq('bidder_id', user.id).order('created_at', { ascending: false }),
      supabase.from('profiles').select('phone, bank_account').eq('id', user.id).single(),
      supabase.from('credits').select('balance').eq('user_id', user.id).single(),
      supabase.from('credit_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
    ]).then(([{ data: auc }, { data: bids }, { data: prof }, { data: cr }, { data: tx }]) => {
      setMyAuctions(auc ?? []);
      setMyBids(bids ?? []);
      setPhone(prof?.phone ?? '');
      setBankAccount(prof?.bank_account ?? '');
      setCredits(cr?.balance ?? 0);
      setTxHistory(tx ?? []);
      setLoading(false);
    });
  }, [user]);

  const savePhone = async () => {
    if (!phone.trim()) return;
    setPhoneSaving(true);
    await supabase.from('profiles').update({ phone: phone.trim() }).eq('id', user.id);
    setPhoneSaving(false);
    setPhoneSaved(true);
    setTimeout(() => setPhoneSaved(false), 2000);
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
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      {showCharge && <ChargeModal onClose={() => setShowCharge(false)} />}

      {/* 프로필 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, padding: '16px 20px', borderRadius: 14, background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.07)' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #111)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
          {(profile?.nickname ?? user.email)[0].toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: '#111' }}>{profile?.nickname ?? '닉네임 없음'}</div>
          <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', marginTop: 2 }}>{user.email}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
          {isAdmin && (
            <a href="/admin" style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: 'rgba(124,58,237,0.1)', color: '#7c3aed', fontSize: 11, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>관제 센터</a>
          )}
          <button onClick={signOut} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)', background: 'transparent', color: 'rgba(0,0,0,0.5)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>로그아웃</button>
        </div>
      </div>

      {/* 카카오 알림 전화번호 */}
      <div style={{ marginBottom: 20, padding: '14px 16px', borderRadius: 12, background: 'rgba(254,229,0,0.08)', border: '1px solid rgba(254,229,0,0.4)' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#8a6c00', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="13" viewBox="0 0 18 17" fill="none"><path fillRule="evenodd" clipRule="evenodd" d="M9 0C4.029 0 0 3.066 0 6.848c0 2.42 1.584 4.543 3.976 5.75L3.04 15.9a.3.3 0 0 0 .44.334l4.977-3.3c.163.02.33.026.543.026 4.971 0 9-3.067 9-6.85C18 3.066 13.971 0 9 0Z" fill="#000"/></svg>
          카카오 낙찰 알림
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="010-0000-0000"
            style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)', fontSize: 13, outline: 'none' }}
          />
          <button
            onClick={savePhone}
            disabled={phoneSaving}
            style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: phoneSaved ? '#15803d' : '#111', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
          >
            {phoneSaved ? '저장됨 ✓' : phoneSaving ? '...' : '저장'}
          </button>
        </div>
        <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.35)', marginTop: 6 }}>낙찰 시 카카오톡으로 즉시 알려드려요</div>
      </div>

      {/* 정산 계좌 */}
      <div style={{ marginBottom: 20, padding: '14px 16px', borderRadius: 12, background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(0,0,0,0.5)', marginBottom: 8 }}>정산 받을 계좌</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={bankAccount}
            onChange={e => setBankAccount(e.target.value)}
            placeholder="은행명 계좌번호 (예: 카카오뱅크 1234-56-789012)"
            style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)', fontSize: 13, outline: 'none' }}
          />
          <button
            onClick={async () => {
              await supabase.from('profiles').update({ bank_account: bankAccount.trim() }).eq('id', user.id);
              setBankSaved(true); setTimeout(() => setBankSaved(false), 2000);
            }}
            style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: bankSaved ? '#15803d' : '#111', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
          >
            {bankSaved ? '저장됨 ✓' : '저장'}
          </button>
        </div>
        <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.35)', marginTop: 6 }}>낙찰자 결제 완료 후 관리자가 이 계좌로 정산합니다</div>
      </div>

      {/* 크레딧 */}
      <div style={{ marginBottom: 16, padding: '14px 18px', borderRadius: 14, background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(0,100,255,0.06))', border: '1px solid rgba(124,58,237,0.18)', display: 'flex', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#7c3aed', letterSpacing: 2, fontFamily: 'monospace', marginBottom: 4 }}>CREDIT</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#111', fontFamily: 'monospace' }}>₩{credits.toLocaleString()}</div>
        </div>
        <button onClick={() => setShowCharge(true)} style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: '#7c3aed', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
          + 충전
        </button>
      </div>

      {/* 통계 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
        {[
          { label: '등록한 경매', val: myAuctions.length },
          { label: '입찰 횟수', val: myBids.length },
          { label: '크레딧 잔액', val: `₩${credits.toLocaleString()}` },
        ].map(s => (
          <div key={s.label} style={{ padding: '14px', borderRadius: 12, background: '#fff', border: '1px solid rgba(0,0,0,0.07)', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#111', fontFamily: 'monospace' }}>{s.val}</div>
            <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.4)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid rgba(0,0,0,0.07)', paddingBottom: 12 }}>
        {[['auctions', '내 경매'], ['bids', '입찰 내역'], ['credits', '크레딧 내역']].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, background: tab === v ? 'rgba(0,0,0,0.06)' : 'transparent', color: tab === v ? '#111' : 'rgba(0,0,0,0.4)' }}>{l}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'rgba(0,0,0,0.2)', fontFamily: 'monospace', fontSize: 11, letterSpacing: 2 }}>LOADING...</div>
      ) : tab === 'auctions' ? (
        myAuctions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgba(0,0,0,0.2)', fontSize: 12 }}>등록한 경매가 없습니다</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {myAuctions.map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}>
                {a.img_url && <img src={a.img_url} alt={a.member} style={{ width: 42, height: 42, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 9, color: '#7c3aed', fontWeight: 800, letterSpacing: 1.5, fontFamily: 'monospace' }}>{a.group_name}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#111' }}>{a.member}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: 'rgba(0,0,0,0.05)', color: STATUS_COLOR[a.status] ?? '#111' }}>{STATUS_LABEL[a.status] ?? a.status}</span>
                  <div style={{ fontSize: 11, color: '#111', fontWeight: 700, marginTop: 4 }}>₩{a.current_price?.toLocaleString()}</div>
                  {a.ends_at && a.status === 'live' && <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.35)', marginTop: 2 }}>{formatTimeLeft(a.ends_at)} 남음</div>}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        myBids.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgba(0,0,0,0.2)', fontSize: 12 }}>입찰 내역이 없습니다</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {myBids.map(b => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 9, color: '#7c3aed', fontWeight: 800, letterSpacing: 1.5, fontFamily: 'monospace' }}>{b.auctions?.group_name}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#111' }}>{b.auctions?.member}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#111', fontFamily: 'monospace' }}>₩{b.amount?.toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.35)', marginTop: 2 }}>{new Date(b.created_at).toLocaleDateString('ko-KR')}</div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        txHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgba(0,0,0,0.2)', fontSize: 12 }}>크레딧 내역이 없습니다</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {txHistory.map(tx => {
              const isPlus = tx.amount > 0;
              const TYPE_LABEL = { charge: '충전', bid_hold: '입찰 보류', bid_release: '입찰 반환', settle: '낙찰 차감' };
              return (
                <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: isPlus ? 'rgba(0,180,80,0.1)' : 'rgba(220,50,50,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                    {isPlus ? '↑' : '↓'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#111' }}>{TYPE_LABEL[tx.type] ?? tx.type}</div>
                    {tx.note && <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.35)', marginTop: 1 }}>{tx.note}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 900, fontFamily: 'monospace', color: isPlus ? '#006d30' : '#c02020' }}>
                      {isPlus ? '+' : ''}₩{tx.amount?.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.35)', marginTop: 1 }}>잔액 ₩{tx.balance_after?.toLocaleString()}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
