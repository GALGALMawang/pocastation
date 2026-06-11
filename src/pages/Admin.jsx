/**
 * Admin.jsx — 관리자 페이지 (/admin)
 *
 * 경매 목록 전체를 조회하고 상태를 관리한다.
 *
 * 가능한 액션:
 *   pending → live     : 승인. duration_hours 기반으로 ends_at 자동 계산
 *   pending → rejected : 거절
 *   live    → ended    : 강제 종료. bids 테이블에서 최고 입찰자를 winner_id로 설정
 *
 * 경매 상태 흐름:
 *   pending → live → ended
 *                 ↘ rejected (pending 단계에서만)
 *
 * ※ 일반 유저도 URL 직접 입력으로 접근 가능하므로, Supabase RLS 정책에서
 *    is_admin = true 인 유저만 쓰기 권한을 갖도록 설정되어 있어야 한다.
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatKRW } from '../lib/utils';
import { toast } from '../lib/toast';

// 상태별 라벨
const STATUS_LABEL = {
  pending:  '승인 대기',
  live:     '진행 중',
  ended:    '종료됨',
  rejected: '거절됨',
};

// 상태별 배지 색상
const STATUS_COLOR = {
  live:     { bg: 'rgba(0,180,80,0.1)',    color: '#006d30' },
  pending:  { bg: 'rgba(255,180,0,0.1)',   color: '#b07700' },
  ended:    { bg: 'rgba(0,0,0,0.06)',      color: 'var(--t3)' },
  rejected: { bg: 'rgba(220,50,50,0.08)', color: '#c02020' },
};

function Admin() {
  const [auctions, setAuctions] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    fetchAuctions();
  }, []);

  const fetchAuctions = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('auctions').select('*').order('created_at', { ascending: false });
    if (data) setAuctions(data);
    setLoading(false);
  };

  // 승인: ends_at = 현재 시각 + duration_hours
  const handleApprove = async (id, durationHours) => {
    const endsAt = new Date(Date.now() + (durationHours || 24) * 3600 * 1000).toISOString();
    const { error } = await supabase
      .from('auctions').update({ status: 'live', ends_at: endsAt }).eq('id', id);
    if (error) toast('승인 실패: ' + error.message, 'err');
    else { toast('승인되었습니다. 경매 시작!', 'ok'); fetchAuctions(); }
  };

  // 강제 종료: 최고 입찰자를 winner_id로 설정한 뒤 상태를 ended로 변경
  const handleForceEnd = async (id) => {
    const { data: topBid } = await supabase
      .from('bids').select('bidder_id').eq('auction_id', id)
      .order('amount', { ascending: false }).limit(1).maybeSingle();

    const update = { status: 'ended' };
    if (topBid?.bidder_id) update.winner_id = topBid.bidder_id;

    const { error } = await supabase.from('auctions').update(update).eq('id', id);
    if (error) toast('종료 실패: ' + error.message, 'err');
    else { toast('경매가 종료되었습니다.', 'ok'); fetchAuctions(); }
  };

  // 거절
  const handleReject = async (id) => {
    if (!confirm('이 경매를 거절하시겠습니까?')) return;
    const { error } = await supabase
      .from('auctions').update({ status: 'rejected' }).eq('id', id);
    if (error) toast('실패: ' + error.message, 'err');
    else fetchAuctions();
  };

  if (loading) return <div style={{padding:'40px', textAlign:'center'}}>로딩 중...</div>;

  return (
    <div className="pg" style={{paddingTop:'40px', paddingBottom:'80px'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px'}}>
        <h1 className="sec-ttl" style={{fontSize:'24px'}}>관리자 — 경매 승인/관리</h1>
        <a href="/" className="btn btn-o">← 메인으로</a>
      </div>

      <div style={{background:'var(--sf)', borderRadius:'var(--r4)', border:'1px solid var(--bd)', overflow:'hidden'}}>
        <table style={{width:'100%', borderCollapse:'collapse', fontSize:'13.5px'}}>
          <thead>
            <tr style={{background:'var(--bg)', borderBottom:'1px solid var(--bd)', textAlign:'left'}}>
              <th style={{padding:'12px 16px', color:'var(--t2)', fontWeight:700}}>ID</th>
              <th style={{padding:'12px 16px', color:'var(--t2)', fontWeight:700}}>이미지</th>
              <th style={{padding:'12px 16px', color:'var(--t2)', fontWeight:700}}>아이템</th>
              <th style={{padding:'12px 16px', color:'var(--t2)', fontWeight:700}}>시작가</th>
              <th style={{padding:'12px 16px', color:'var(--t2)', fontWeight:700}}>상태</th>
              <th style={{padding:'12px 16px', color:'var(--t2)', fontWeight:700}}>액션</th>
            </tr>
          </thead>
          <tbody>
            {auctions.map(a => {
              const sc = STATUS_COLOR[a.status] || STATUS_COLOR.ended;
              return (
                <tr key={a.id} style={{borderBottom:'1px solid var(--bd)'}}>
                  <td style={{padding:'12px 16px', color:'var(--t3)'}}>#{a.id}</td>

                  {/* 이미지 썸네일 */}
                  <td style={{padding:'12px 16px'}}>
                    <div style={{
                      width:48, height:48, borderRadius:8, overflow:'hidden',
                      background:'linear-gradient(135deg,#1e1065,#4c1d95)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                      {a.img_url
                        ? <img src={a.img_url} alt="" style={{width:'100%', height:'100%', objectFit:'cover'}} />
                        : <span style={{fontSize:'20px'}}>🃏</span>
                      }
                    </div>
                  </td>

                  <td style={{padding:'12px 16px'}}>
                    <div style={{fontWeight:700, color:'var(--t1)'}}>{a.group_name} {a.member}</div>
                    <div style={{fontSize:'12px', color:'var(--t3)'}}>{a.album} · {a.grade}급 · {a.duration_hours}h</div>
                    {a.seller_name && (
                      <div style={{fontSize:'11px', color:'var(--t3)', marginTop:'2px'}}>판매자: {a.seller_name}</div>
                    )}
                    {a.verification_word && (
                      <div style={{marginTop:5, display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:5,
                        background: a.verify_matched ? 'rgba(0,180,80,0.08)' : 'rgba(220,50,50,0.08)',
                        border: `1px solid ${a.verify_matched ? 'rgba(0,180,80,0.25)' : 'rgba(220,50,50,0.25)'}`,
                      }}>
                        <span style={{fontSize:12, fontWeight:800}}>{a.verify_matched ? '✓' : '✗'}</span>
                        <span style={{fontSize:10, color: a.verify_matched ? '#006d30' : '#c02020', fontWeight:800}}>코드</span>
                        <span style={{fontSize:11, fontFamily:'monospace', fontWeight:700, color:'#111', letterSpacing:1}}>{a.verification_word}</span>
                      </div>
                    )}
                  </td>

                  <td style={{padding:'12px 16px', fontFamily:'var(--fe)', fontWeight:600}}>
                    {formatKRW(a.start_price)}
                  </td>

                  {/* 상태 배지 */}
                  <td style={{padding:'12px 16px'}}>
                    <span style={{
                      display:'inline-block', padding:'4px 10px', borderRadius:'10px',
                      fontSize:'11px', fontWeight:800,
                      background: sc.bg, color: sc.color,
                    }}>
                      {STATUS_LABEL[a.status] || a.status}
                    </span>
                  </td>

                  {/* 액션 버튼 */}
                  <td style={{padding:'12px 16px'}}>
                    <div style={{display:'flex', gap:'6px', flexWrap:'wrap'}}>
                      {a.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(a.id, a.duration_hours)}
                            style={{background:'var(--pr)', color:'#fff', padding:'5px 12px', borderRadius:'6px', fontSize:'11px', fontWeight:700, border:'none', cursor:'pointer'}}
                          >
                            승인
                          </button>
                          <button
                            onClick={() => handleReject(a.id)}
                            style={{background:'rgba(220,50,50,0.12)', color:'#c02020', padding:'5px 12px', borderRadius:'6px', fontSize:'11px', fontWeight:700, border:'none', cursor:'pointer'}}
                          >
                            거절
                          </button>
                        </>
                      )}
                      {a.status === 'live' && (
                        <button
                          onClick={() => handleForceEnd(a.id)}
                          style={{background:'var(--ac)', color:'#fff', padding:'5px 12px', borderRadius:'6px', fontSize:'11px', fontWeight:700, border:'none', cursor:'pointer'}}
                        >
                          강제 종료
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {auctions.length === 0 && (
              <tr>
                <td colSpan="6" style={{textAlign:'center', padding:'40px', color:'var(--t3)'}}>
                  등록된 경매가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Admin;
