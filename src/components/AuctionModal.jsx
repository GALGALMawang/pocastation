/**
 * AuctionModal.jsx — 경매 상세 모달
 *
 * 기능:
 *   - 경매 이미지, 현재가, 입찰 내역 표시
 *   - Supabase Realtime으로 경매 업데이트·신규 입찰 실시간 반영
 *   - 입찰: place_bid RPC 호출 (크레딧 잔액 검증 포함)
 *   - 낙찰자(auction.winner_id === user.id)에게 결제 버튼 노출
 *   - 모달 오픈 시 view_count 증가 (increment_view_count RPC)
 *
 * Props:
 *   auction          - auctions 테이블 행
 *   user             - Supabase 유저 객체
 *   onClose          - 모달 닫기
 *   onOpenAuth       - 비로그인 상태에서 입찰 시 로그인 모달 오픈
 *   onOpenSettlement - 낙찰자 결제 버튼 클릭 시 호출 (auction 전달)
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

function AuctionModal({ auction: initialAuction, user, onClose, onOpenAuth, onOpenSettlement }) {
  const [auction,  setAuction]  = useState(initialAuction);
  const [bidAmount,setBidAmount]= useState((initialAuction.current_price || 0) + 500);
  const [bids,     setBids]     = useState([]);
  const [bidMsg,   setBidMsg]   = useState(null); // { type: 'ok' | 'err', text }
  const [bidding,  setBidding]  = useState(false);

  const isEnded  = auction.status === 'ended';
  const isWinner = isEnded && user && auction.winner_id === user.id;

  // ──────────────────────────────────────────────────────────
  // 초기 로드 + 실시간 구독
  // ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchBids();
    incrementViewCount();

    const channel = supabase.channel(`auction-${auction.id}`)
      // 경매 정보 업데이트 (현재가, 상태 변경 등)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public',
        table: 'auctions', filter: `id=eq.${auction.id}`,
      }, (payload) => {
        setAuction(payload.new);
        setBidAmount((payload.new.current_price || 0) + 500);
      })
      // 신규 입찰
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'bids', filter: `auction_id=eq.${auction.id}`,
      }, () => {
        fetchBids();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [auction.id]);

  const fetchBids = async () => {
    const { data } = await supabase
      .from('bids').select('*')
      .eq('auction_id', auction.id)
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) setBids(data);
  };

  // view_count 컬럼이 없으면 RPC가 실패해도 무시
  const incrementViewCount = () => {
    supabase.rpc('increment_view_count', { p_auction_id: auction.id }).catch(() => {});
  };

  // ──────────────────────────────────────────────────────────
  // 입찰
  // ──────────────────────────────────────────────────────────
  const handleBid = async () => {
    if (!user) { onOpenAuth(); return; }
    setBidding(true);
    setBidMsg(null);

    const { data, error } = await supabase.rpc('place_bid', {
      p_auction_id: auction.id,
      p_user_id:    user.id,
      p_user_name:  user.email?.split('@')[0] || '유저',
      p_amount:     bidAmount,
    });

    setBidding(false);
    if (error || !data?.success) {
      setBidMsg({ type: 'err', text: data?.message || '입찰 실패' });
    } else {
      setBidMsg({ type: 'ok', text: '입찰 완료!' });
    }
  };

  // ──────────────────────────────────────────────────────────
  // 렌더
  // ──────────────────────────────────────────────────────────
  return (
    <div className="mod-wrap open">
      <div className="mod-ov">
        <div className="modal">

          {/* 헤더 */}
          <div className="mod-hd">
            <div className="mod-ttl">{auction.group_name} · {auction.member}</div>
            <button className="mod-cl" onClick={onClose}>×</button>
          </div>

          <div className="mod-body">
            <div className="mod-layout">

              {/* 이미지 */}
              <div className="mod-img" style={{
                background:'var(--bg)', overflow:'hidden', borderRadius:'12px',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                {auction.img_url ? (
                  <img
                    src={auction.img_url}
                    alt={`${auction.group_name} ${auction.member}`}
                    style={{width:'100%', height:'100%', objectFit:'cover'}}
                  />
                ) : (
                  <span style={{fontSize:'48px'}}>🃏</span>
                )}
              </div>

              <div>
                {/* 앨범·등급 */}
                {(auction.album || auction.grade) && (
                  <div style={{fontSize:'12px', color:'var(--t3)', marginBottom:'6px'}}>
                    {auction.album}{auction.album && auction.grade ? ' · ' : ''}{auction.grade && `${auction.grade}급`}
                  </div>
                )}

                {/* 현재가 */}
                <div className="mbig">₩ {(auction.current_price || 0).toLocaleString()}</div>

                {/* 낙찰 완료 배너 (본인이 낙찰자일 때) */}
                {isWinner && (
                  <div style={{
                    marginTop:'12px', padding:'12px 16px', borderRadius:'10px',
                    background:'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(124,58,237,0.05))',
                    border:'1px solid rgba(124,58,237,0.3)',
                  }}>
                    <div style={{fontSize:'13px', fontWeight:800, color:'var(--pr)', marginBottom:'6px'}}>
                      🎉 낙찰 완료!
                    </div>
                    <button
                      onClick={() => { onClose(); onOpenSettlement(auction); }}
                      style={{
                        width:'100%', padding:'10px', borderRadius:'8px', border:'none',
                        background:'var(--pr)', color:'#fff', fontSize:'13px', fontWeight:800, cursor:'pointer',
                      }}
                    >
                      결제하기
                    </button>
                  </div>
                )}

                {/* 종료됐지만 낙찰자가 아닌 경우 */}
                {isEnded && !isWinner && (
                  <div style={{
                    fontSize:'12px', color:'var(--t3)', marginTop:'8px',
                    padding:'8px 12px', background:'var(--bg)', borderRadius:'8px',
                  }}>
                    종료된 경매입니다.
                  </div>
                )}

                {/* 입찰 내역 (최근 10건) */}
                <div className="blog-list">
                  {bids.map(b => (
                    <div key={b.id} className="blog-row">
                      <span>{b.bidder_name || '익명'}</span>
                      <span className="blog-amt">₩ {b.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  {bids.length === 0 && (
                    <div style={{fontSize:'12px', color:'var(--t3)', padding:'12px 0'}}>
                      아직 입찰이 없습니다.
                    </div>
                  )}
                </div>

                {/* 입찰 패널 (진행 중인 경매에만 표시) */}
                {!isEnded && (
                  <div className="bid-pnl">
                    <input
                      type="number"
                      className="bid-inp"
                      value={bidAmount}
                      onChange={e => setBidAmount(parseInt(e.target.value) || 0)}
                    />
                    <button className="bid-go" onClick={handleBid} disabled={bidding}>
                      {bidding ? '처리 중...' : '입찰하기'}
                    </button>
                  </div>
                )}

                {/* 입찰 결과 메시지 */}
                {bidMsg && (
                  <div style={{
                    marginTop:'8px', padding:'8px 12px', borderRadius:'8px',
                    fontSize:'12px', fontWeight:700,
                    background: bidMsg.type === 'ok' ? 'rgba(0,180,80,0.1)' : 'rgba(220,50,50,0.1)',
                    color:      bidMsg.type === 'ok' ? '#006d30'             : '#c02020',
                  }}>
                    {bidMsg.text}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuctionModal;
