import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

function Admin() {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuctions();
  }, []);

  const fetchAuctions = async () => {
    setLoading(true);
    const { data } = await supabase.from('auctions').select('*').order('created_at', { ascending: false });
    if (data) setAuctions(data);
    setLoading(false);
  };

  const handleApprove = async (id, durationHours) => {
    const endsAt = new Date(Date.now() + (durationHours || 24) * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from('auctions').update({ status: 'live', ends_at: endsAt }).eq('id', id);
    if (error) alert('승인 실패: ' + error.message);
    else { alert('승인되었습니다. 경매 시작!'); fetchAuctions(); }
  };

  const handleForceEnd = async (id) => {
    // winner_id를 최고 입찰자로 설정
    const { data: topBid } = await supabase
      .from('bids').select('bidder_id').eq('auction_id', id)
      .order('amount', { ascending: false }).limit(1).maybeSingle();

    const update = { status: 'ended' };
    if (topBid?.bidder_id) update.winner_id = topBid.bidder_id;

    const { error } = await supabase.from('auctions').update(update).eq('id', id);
    if (error) alert('종료 실패: ' + error.message);
    else { alert('경매가 종료되었습니다.'); fetchAuctions(); }
  };

  const handleReject = async (id) => {
    if (!confirm('거절하시겠습니까?')) return;
    const { error } = await supabase.from('auctions').update({ status: 'rejected' }).eq('id', id);
    if (error) alert('실패: ' + error.message);
    else fetchAuctions();
  };

  const statusLabel = { pending: '승인 대기', live: '진행 중', ended: '종료됨', rejected: '거절됨' };
  const statusColor = {
    live:     { bg: 'rgba(0,180,80,0.1)',   color: '#006d30' },
    pending:  { bg: 'rgba(255,180,0,0.1)',  color: '#b07700' },
    ended:    { bg: 'rgba(0,0,0,0.06)',     color: 'var(--t3)' },
    rejected: { bg: 'rgba(220,50,50,0.08)', color: '#c02020' },
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
              const sc = statusColor[a.status] || statusColor.ended;
              return (
                <tr key={a.id} style={{borderBottom:'1px solid var(--bd)'}}>
                  <td style={{padding:'12px 16px', color:'var(--t3)'}}>#{a.id}</td>
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
                    {a.seller_name && <div style={{fontSize:'11px', color:'var(--t3)', marginTop:'2px'}}>판매자: {a.seller_name}</div>}
                  </td>
                  <td style={{padding:'12px 16px', fontFamily:'var(--fe)', fontWeight:600}}>
                    ₩ {(a.start_price || 0).toLocaleString()}
                  </td>
                  <td style={{padding:'12px 16px'}}>
                    <span style={{
                      display:'inline-block', padding:'4px 10px', borderRadius:'10px',
                      fontSize:'11px', fontWeight:800,
                      background: sc.bg, color: sc.color,
                    }}>
                      {statusLabel[a.status] || a.status}
                    </span>
                  </td>
                  <td style={{padding:'12px 16px'}}>
                    <div style={{display:'flex', gap:'6px', flexWrap:'wrap'}}>
                      {a.status === 'pending' && (
                        <>
                          <button onClick={() => handleApprove(a.id, a.duration_hours)}
                            style={{background:'var(--pr)', color:'#fff', padding:'5px 12px', borderRadius:'6px', fontSize:'11px', fontWeight:700, border:'none', cursor:'pointer'}}>
                            승인
                          </button>
                          <button onClick={() => handleReject(a.id)}
                            style={{background:'rgba(220,50,50,0.12)', color:'#c02020', padding:'5px 12px', borderRadius:'6px', fontSize:'11px', fontWeight:700, border:'none', cursor:'pointer'}}>
                            거절
                          </button>
                        </>
                      )}
                      {a.status === 'live' && (
                        <button onClick={() => handleForceEnd(a.id)}
                          style={{background:'var(--ac)', color:'#fff', padding:'5px 12px', borderRadius:'6px', fontSize:'11px', fontWeight:700, border:'none', cursor:'pointer'}}>
                          강제 종료
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {auctions.length === 0 && (
              <tr><td colSpan="6" style={{textAlign:'center', padding:'40px', color:'var(--t3)'}}>등록된 경매가 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Admin;
