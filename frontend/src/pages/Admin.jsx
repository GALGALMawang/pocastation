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

  const handleStatusChange = async (id, status) => {
    const { error } = await supabase.from('auctions').update({ status }).eq('id', id);
    if (error) alert('상태 변경 실패: ' + error.message);
    else { alert('상태가 변경되었습니다.'); fetchAuctions(); }
  };

  if (loading) return <div style={{padding:'40px', textAlign:'center'}}>로딩 중...</div>;

  return (
    <div className="pg" style={{paddingTop: '40px', paddingBottom: '80px'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px'}}>
        <h1 className="sec-ttl" style={{fontSize:'24px'}}>관리자 페이지: 경매 승인/관리</h1>
        <a href="/" className="btn btn-o">← 메인으로 가기</a>
      </div>

      <div style={{background:'var(--sf)', borderRadius:'var(--r4)', border:'1px solid var(--bd)', overflow:'hidden'}}>
        <table style={{width:'100%', borderCollapse:'collapse', fontSize:'13.5px'}}>
          <thead>
            <tr style={{background:'var(--bg)', borderBottom:'1px solid var(--bd)', textAlign:'left'}}>
              <th style={{padding:'12px 16px', color:'var(--t2)', fontWeight:700}}>ID</th>
              <th style={{padding:'12px 16px', color:'var(--t2)', fontWeight:700}}>이미지</th>
              <th style={{padding:'12px 16px', color:'var(--t2)', fontWeight:700}}>아이템 정보</th>
              <th style={{padding:'12px 16px', color:'var(--t2)', fontWeight:700}}>시작/현재가</th>
              <th style={{padding:'12px 16px', color:'var(--t2)', fontWeight:700}}>현재 상태</th>
              <th style={{padding:'12px 16px', color:'var(--t2)', fontWeight:700}}>관리 액션</th>
            </tr>
          </thead>
          <tbody>
            {auctions.map(a => (
              <tr key={a.id} style={{borderBottom:'1px solid var(--bd)'}}>
                <td style={{padding:'12px 16px', color:'var(--t3)'}}>#{a.id}</td>
                <td style={{padding:'12px 16px', fontSize:'24px'}}>{a.emoji || '🃏'}</td>
                <td style={{padding:'12px 16px'}}>
                  <div style={{fontWeight:700, color:'var(--t1)'}}>{a.group_name} {a.member}</div>
                  <div style={{fontSize:'12px', color:'var(--t3)', mt:2}}>{a.album} · {a.grade}급</div>
                </td>
                <td style={{padding:'12px 16px', fontFamily:'var(--fe)', fontWeight:600}}>
                  ₩ {a.price.toLocaleString()}
                </td>
                <td style={{padding:'12px 16px'}}>
                  <span style={{
                    display:'inline-block', padding:'4px 10px', borderRadius:'10px', fontSize:'11px', fontWeight:800,
                    background: a.status==='live' ? 'rgba(0,180,80,0.1)' : a.status==='pending' ? 'rgba(255,180,0,0.1)' : 'var(--bg)',
                    color: a.status==='live' ? '#006d30' : a.status==='pending' ? '#b07700' : 'var(--t3)'
                  }}>
                    {a.status === 'live' ? '진행 중' : a.status === 'pending' ? '승인 대기' : a.status === 'ended' ? '종료됨' : a.status}
                  </span>
                </td>
                <td style={{padding:'12px 16px'}}>
                  {a.status !== 'live' && a.status !== 'ended' && (
                    <button onClick={() => handleStatusChange(a.id, 'live')} style={{background:'var(--pr)', color:'#fff', padding:'5px 12px', borderRadius:'6px', fontSize:'11px', fontWeight:700, marginRight:'6px'}}>
                      승인 (라이브)
                    </button>
                  )}
                  {a.status === 'live' && (
                    <button onClick={() => handleStatusChange(a.id, 'ended')} style={{background:'var(--ac)', color:'#fff', padding:'5px 12px', borderRadius:'6px', fontSize:'11px', fontWeight:700}}>
                      강제 종료
                    </button>
                  )}
                </td>
              </tr>
            ))}
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
