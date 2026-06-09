/**
 * SalesModal.jsx — 판매 내역 모달
 *
 * 판매자가 자신의 낙찰된 경매 목록과 구매자 배송지를 확인하고
 * 운송장 번호를 입력하는 화면.
 *
 * Props:
 *   user    - Supabase 유저 객체
 *   onClose - 모달 닫기
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CARRIERS } from '../lib/delivery';

export default function SalesModal({ user, onClose }) {
  const [sales,   setSales]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchSales();
  }, [user]);

  const fetchSales = async () => {
    setLoading(true);
    // 내가 판매자인 낙찰 경매 + settlement 정보
    const { data } = await supabase
      .from('auctions')
      .select('id, group_name, member, album, img_url, current_price, status, winner_id, settlements(id, buyer_id, shipping_address, buyer_contact, carrier, tracking_number, shipped_at, status)')
      .eq('seller_id', user.id)
      .eq('status', 'ended')
      .not('winner_id', 'is', null)
      .order('updated_at', { ascending: false });
    if (data) setSales(data);
    setLoading(false);
  };

  const isMobile = window.innerWidth < 768;

  return (
    <div
      style={{
        position:'fixed', inset:0, zIndex:600,
        background:'rgba(0,0,0,0.5)',
        display:'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent:'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background:'#fff', width:'100%',
          maxWidth: isMobile ? '100%' : 520,
          borderRadius: isMobile ? '20px 20px 0 0' : 20,
          maxHeight:'85vh', overflow:'hidden',
          display:'flex', flexDirection:'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div style={{padding:'20px 20px 16px', borderBottom:'1px solid rgba(0,0,0,0.08)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div style={{fontSize:'16px', fontWeight:900, color:'#111'}}>판매 내역</div>
          <button onClick={onClose} style={{background:'none', border:'none', fontSize:'22px', cursor:'pointer', color:'rgba(0,0,0,0.4)', lineHeight:1}}>×</button>
        </div>

        <div style={{overflowY:'auto', flex:1}}>
          {loading ? (
            <div style={{padding:'40px', textAlign:'center', color:'rgba(0,0,0,0.4)', fontSize:'14px'}}>불러오는 중...</div>
          ) : sales.length === 0 ? (
            <div style={{padding:'60px 20px', textAlign:'center', color:'rgba(0,0,0,0.3)', fontSize:'14px'}}>
              <div style={{fontSize:'32px', marginBottom:'12px'}}>📦</div>
              낙찰된 판매 내역이 없습니다.
            </div>
          ) : (
            sales.map(auction => (
              <SaleItem key={auction.id} auction={auction} onRefresh={fetchSales} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── 개별 판매 아이템 ────────────────────────────────────────
function SaleItem({ auction, onRefresh }) {
  const settlement = auction.settlements?.[0];

  const [carrier,  setCarrier]  = useState(settlement?.carrier  || '');
  const [tracking, setTracking] = useState(settlement?.tracking_number || '');
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);

  const handleSave = async () => {
    if (!settlement || !carrier || !tracking.trim()) return;
    setSaving(true);
    await supabase.from('settlements')
      .update({
        carrier:          carrier,
        tracking_number:  tracking.trim(),
        shipped_at:       new Date().toISOString(),
        status:           'shipped',
      })
      .eq('id', settlement.id);
    setSaving(false);
    setSaved(true);
    onRefresh();
  };

  const FIELD = {
    padding:'8px 10px', borderRadius:8, fontSize:12,
    border:'1px solid rgba(0,0,0,0.12)', outline:'none',
    background:'#fff', color:'#111', width:'100%', boxSizing:'border-box',
  };

  return (
    <div style={{padding:'16px 20px', borderBottom:'1px solid rgba(0,0,0,0.06)'}}>
      <div style={{display:'flex', gap:12, marginBottom:12}}>

        {/* 썸네일 */}
        <div style={{width:52, height:52, borderRadius:10, flexShrink:0, background:'linear-gradient(135deg,#1e1065,#4c1d95)', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center'}}>
          {auction.img_url
            ? <img src={auction.img_url} alt="" style={{width:'100%', height:'100%', objectFit:'cover'}} />
            : <span style={{fontSize:'22px'}}>🃏</span>
          }
        </div>

        <div style={{flex:1, minWidth:0}}>
          <div style={{fontSize:13, fontWeight:800, color:'#111', marginBottom:2}}>
            {auction.group_name} {auction.member}
          </div>
          {auction.album && <div style={{fontSize:11, color:'rgba(0,0,0,0.4)', marginBottom:4}}>{auction.album}</div>}
          <div style={{fontSize:13, fontWeight:700, fontFamily:'monospace', color:'#111'}}>
            ₩{(auction.current_price || 0).toLocaleString()}
          </div>
        </div>

        {/* 배송 상태 배지 */}
        {settlement?.tracking_number && (
          <span style={{
            fontSize:10, fontWeight:800, padding:'3px 8px', borderRadius:20,
            background: settlement.status === 'shipped' ? 'rgba(0,120,255,0.1)' : 'rgba(0,180,80,0.1)',
            color:      settlement.status === 'shipped' ? '#0064ff' : '#006d30',
            alignSelf:'flex-start', whiteSpace:'nowrap',
          }}>
            {settlement.status === 'shipped' ? '발송 완료' : '배송 중'}
          </span>
        )}
      </div>

      {/* 구매자 배송지 + 연락처 */}
      {settlement?.shipping_address ? (
        <div style={{padding:'10px 12px', borderRadius:8, background:'rgba(124,58,237,0.04)', border:'1px solid rgba(124,58,237,0.12)', marginBottom:12}}>
          <div style={{fontSize:10, fontWeight:800, color:'#7c3aed', marginBottom:4}}>구매자 배송지</div>
          <div style={{fontSize:12, color:'#111', lineHeight:1.6, whiteSpace:'pre-line'}}>
            {settlement.shipping_address}
          </div>
          {settlement.buyer_contact && (
            <div style={{marginTop:8, paddingTop:8, borderTop:'1px solid rgba(124,58,237,0.12)'}}>
              <span style={{fontSize:10, fontWeight:800, color:'#7c3aed'}}>연락처 </span>
              <span style={{fontSize:12, fontWeight:700, color:'#111'}}>{settlement.buyer_contact}</span>
            </div>
          )}
        </div>
      ) : (
        <div style={{padding:'10px 12px', borderRadius:8, background:'rgba(0,0,0,0.03)', marginBottom:12}}>
          <div style={{fontSize:12, color:'rgba(0,0,0,0.35)'}}>구매자가 아직 배송지를 입력하지 않았습니다.</div>
        </div>
      )}

      {/* 운송장 입력 (배송지가 있고 아직 미발송인 경우) */}
      {settlement && !settlement.tracking_number && settlement.shipping_address && (
        <div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1.6fr', gap:8, marginBottom:8}}>
            <div>
              <label style={{fontSize:10, fontWeight:700, color:'rgba(0,0,0,0.45)', display:'block', marginBottom:4}}>택배사</label>
              <select value={carrier} onChange={e => setCarrier(e.target.value)} style={FIELD}>
                <option value="">선택</option>
                {CARRIERS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:10, fontWeight:700, color:'rgba(0,0,0,0.45)', display:'block', marginBottom:4}}>운송장 번호</label>
              <input value={tracking} onChange={e => setTracking(e.target.value)} placeholder="1234567890" style={FIELD} />
            </div>
          </div>
          <button
            disabled={!carrier || !tracking.trim() || saving}
            onClick={handleSave}
            style={{
              width:'100%', padding:'9px', borderRadius:8, border:'none', fontSize:12, fontWeight:800,
              background: carrier && tracking.trim() ? '#111' : 'rgba(0,0,0,0.1)',
              color:      carrier && tracking.trim() ? '#fff'  : 'rgba(0,0,0,0.3)',
              cursor:     carrier && tracking.trim() ? 'pointer' : 'default',
            }}
          >
            {saving ? '저장 중...' : saved ? '✓ 저장됨' : '운송장 등록 및 발송 처리'}
          </button>
        </div>
      )}

      {/* 운송장 등록 완료 상태 */}
      {settlement?.tracking_number && (
        <div style={{padding:'10px 12px', borderRadius:8, background:'rgba(0,120,255,0.05)', border:'1px solid rgba(0,120,255,0.15)', fontSize:12}}>
          <div style={{fontWeight:700, color:'#0064ff', marginBottom:2}}>
            {CARRIERS.find(c => c.id === settlement.carrier)?.name || settlement.carrier}
          </div>
          <div style={{fontFamily:'monospace', color:'#111', fontWeight:700}}>{settlement.tracking_number}</div>
          {settlement.shipped_at && (
            <div style={{fontSize:11, color:'rgba(0,0,0,0.4)', marginTop:4}}>
              발송: {new Date(settlement.shipped_at).toLocaleString('ko-KR')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
