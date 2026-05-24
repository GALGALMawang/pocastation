/**
 * BidsModal.jsx — 입찰 내역 모달
 *
 * 로그인한 유저의 전체 입찰 내역을 최신순으로 표시한다.
 * 낙찰된 경매에는 "결제하기" 버튼을 함께 노출한다.
 *
 * 낙찰 판별 기준:
 *   auction.status === 'ended' && auction.winner_id === user.id
 *   (bids 테이블의 amount와 current_price 비교 없이 winner_id로만 판단)
 *
 * Props:
 *   user             - Supabase 유저 객체
 *   onClose          - 모달 닫기
 *   onOpenSettlement - 결제 모달 오픈 (auction 객체 전달)
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function BidsModal({ user, onClose, onOpenSettlement }) {
  const [bids,    setBids]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchBids();
  }, [user]);

  const fetchBids = async () => {
    setLoading(true);
    // 입찰 내역과 해당 경매 정보를 JOIN
    const { data } = await supabase
      .from('bids')
      .select('*, auctions(id, group_name, member, album, current_price, status, winner_id, img_url, seller_id, seller_contact, seller_name, start_price)')
      .eq('bidder_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setBids(data);
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
          background:'#fff',
          width:'100%',
          maxWidth: isMobile ? '100%' : 480,
          borderRadius: isMobile ? '20px 20px 0 0' : 20,
          maxHeight:'85vh',
          overflow:'hidden',
          display:'flex',
          flexDirection:'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div style={{padding:'20px 20px 16px', borderBottom:'1px solid rgba(0,0,0,0.08)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div style={{fontSize:'16px', fontWeight:900, color:'#111'}}>입찰 내역</div>
          <button onClick={onClose} style={{background:'none', border:'none', fontSize:'22px', cursor:'pointer', color:'rgba(0,0,0,0.4)', lineHeight:1}}>×</button>
        </div>

        {/* 목록 */}
        <div style={{overflowY:'auto', flex:1}}>
          {loading ? (
            <div style={{padding:'40px', textAlign:'center', color:'rgba(0,0,0,0.4)', fontSize:'14px'}}>
              불러오는 중...
            </div>
          ) : bids.length === 0 ? (
            <div style={{padding:'60px 20px', textAlign:'center', color:'rgba(0,0,0,0.3)', fontSize:'14px'}}>
              <div style={{fontSize:'32px', marginBottom:'12px'}}>🃏</div>
              입찰 내역이 없습니다.
            </div>
          ) : (
            bids.map(bid => {
              const a = bid.auctions;
              if (!a) return null;

              const isWinner   = a.status === 'ended' && a.winner_id === user.id;
              const isHighest  = bid.amount === a.current_price;

              return (
                <div
                  key={bid.id}
                  style={{
                    padding:'16px 20px',
                    borderBottom:'1px solid rgba(0,0,0,0.06)',
                    background: isWinner ? 'rgba(124,58,237,0.03)' : '#fff',
                  }}
                >
                  <div style={{display:'flex', gap:'12px', alignItems:'flex-start'}}>

                    {/* 썸네일 */}
                    <div style={{
                      width:52, height:52, borderRadius:10, flexShrink:0,
                      background:'linear-gradient(135deg,#1e1065,#4c1d95)',
                      overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                      {a.img_url ? (
                        <img src={a.img_url} alt="" style={{width:'100%', height:'100%', objectFit:'cover'}} />
                      ) : (
                        <span style={{fontSize:'22px'}}>🃏</span>
                      )}
                    </div>

                    {/* 정보 */}
                    <div style={{flex:1, minWidth:0}}>
                      <div style={{display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px'}}>
                        <span style={{fontSize:'13px', fontWeight:800, color:'#111'}}>
                          {a.group_name} {a.member}
                        </span>

                        {/* 상태 태그 */}
                        {isWinner && (
                          <span style={{fontSize:'10px', fontWeight:800, color:'#7c3aed', background:'rgba(124,58,237,0.1)', padding:'2px 7px', borderRadius:'20px'}}>낙찰</span>
                        )}
                        {!isWinner && a.status === 'ended' && (
                          <span style={{fontSize:'10px', fontWeight:700, color:'rgba(0,0,0,0.35)', background:'rgba(0,0,0,0.06)', padding:'2px 7px', borderRadius:'20px'}}>종료</span>
                        )}
                        {a.status === 'live' && isHighest && (
                          <span style={{fontSize:'10px', fontWeight:800, color:'#006d30', background:'rgba(0,180,80,0.1)', padding:'2px 7px', borderRadius:'20px'}}>최고가</span>
                        )}
                      </div>

                      {a.album && (
                        <div style={{fontSize:'11px', color:'rgba(0,0,0,0.4)', marginBottom:'4px'}}>{a.album}</div>
                      )}
                      <div style={{fontSize:'12px', color:'rgba(0,0,0,0.5)'}}>
                        내 입찰가:{' '}
                        <span style={{fontWeight:700, color:'#111', fontFamily:'monospace'}}>
                          ₩{bid.amount.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* 낙찰자 결제 버튼 */}
                    {isWinner && (
                      <button
                        onClick={() => { onClose(); onOpenSettlement(a); }}
                        style={{
                          padding:'8px 14px', borderRadius:'8px', border:'none',
                          background:'var(--pr, #7c3aed)', color:'#fff',
                          fontSize:'12px', fontWeight:800, cursor:'pointer', flexShrink:0,
                        }}
                      >
                        결제하기
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
