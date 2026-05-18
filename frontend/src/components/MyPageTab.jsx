import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatTimeLeft } from '../lib/utils';

const STATUS_LABEL = { pending: '승인 대기', live: '진행중', ended: '종료', rejected: '거부됨' };
const STATUS_COLOR = { pending: '#b07700', live: '#006d30', ended: 'rgba(0,0,0,0.35)', rejected: '#b02020' };

export default function MyPageTab() {
  const { user, profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [myAuctions, setMyAuctions] = useState([]);
  const [myBids, setMyBids] = useState([]);
  const [tab, setTab] = useState('auctions');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('auctions').select('*').eq('seller_id', user.id).order('created_at', { ascending: false }),
      supabase.from('bids').select('*, auctions(group_name, member, album, current_price, status)').eq('bidder_id', user.id).order('created_at', { ascending: false }),
    ]).then(([{ data: auc }, { data: bids }]) => {
      setMyAuctions(auc ?? []);
      setMyBids(bids ?? []);
      setLoading(false);
    });
  }, [user]);

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

      {/* 통계 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
        {[
          { label: '등록한 경매', val: myAuctions.length },
          { label: '입찰 횟수', val: myBids.length },
          { label: '낙찰 (미정)', val: '—' },
        ].map(s => (
          <div key={s.label} style={{ padding: '14px', borderRadius: 12, background: '#fff', border: '1px solid rgba(0,0,0,0.07)', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#111', fontFamily: 'monospace' }}>{s.val}</div>
            <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.4)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid rgba(0,0,0,0.07)', paddingBottom: 12 }}>
        {[['auctions', '내 경매'], ['bids', '입찰 내역']].map(([v, l]) => (
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
      )}
    </div>
  );
}
