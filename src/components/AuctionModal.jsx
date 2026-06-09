/**
 * AuctionModal.jsx — 경매 상세 모달
 *
 * 기능:
 *   - 경매 이미지, 현재가, 남은 시간, 입찰 내역 표시
 *   - Supabase Realtime으로 경매 업데이트·신규 입찰 실시간 반영
 *   - 입찰: place_bid RPC 호출 (크레딧 잔액 검증 + 차감)
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
import { BID_INCREMENT } from '../lib/constants';

// 남은 시간 문자열 계산
function getTimeLeft(endsAt) {
  if (!endsAt) return null;
  const diff = new Date(endsAt) - new Date();
  if (diff <= 0) return '종료';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (h > 0) return `${h}시간 ${m}분 ${s}초`;
  if (m > 0) return `${m}분 ${s}초`;
  return `${s}초`;
}

function AuctionModal({ auction: initialAuction, user, onClose, onOpenAuth, onOpenSettlement }) {
  const [auction,   setAuction]  = useState(initialAuction);
  const [bidAmount, setBidAmount]= useState((initialAuction.current_price || 0) + BID_INCREMENT);
  const [bids,      setBids]     = useState([]);
  const [bidMsg,    setBidMsg]   = useState(null); // { type: 'ok' | 'err', text }
  const [bidding,   setBidding]  = useState(false);
  const [buyingNow, setBuyingNow]= useState(false);
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(initialAuction.ends_at));

  const isEnded  = auction.status === 'ended';
  const isWinner = isEnded && user && auction.winner_id === user.id;

  // 1초마다 카운트다운 갱신
  useEffect(() => {
    if (isEnded || !auction.ends_at) return;
    const timer = setInterval(() => setTimeLeft(getTimeLeft(auction.ends_at)), 1000);
    return () => clearInterval(timer);
  }, [isEnded, auction.ends_at]);

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
        setBidAmount((payload.new.current_price || 0) + BID_INCREMENT);
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
  const incrementViewCount = async () => {
    try { await supabase.rpc('increment_view_count', { p_auction_id: auction.id }); } catch {}
  };

  // ──────────────────────────────────────────────────────────
  // 즉시 구매
  // ──────────────────────────────────────────────────────────
  const handleBuyNow = async () => {
    if (!user) { onOpenAuth(); return; }
    if (!window.confirm(`₩${auction.buy_now_price?.toLocaleString()}에 즉시 구매하시겠어요?`)) return;
    setBuyingNow(true);
    setBidMsg(null);
    const { data, error } = await supabase.rpc('buy_now', {
      p_auction_id: auction.id,
      p_user_id:    user.id,
      p_user_name:  user.email?.split('@')[0] || '유저',
    });
    setBuyingNow(false);
    if (error || !data?.success) {
      setBidMsg({ type: 'err', text: data?.message || '즉시 구매 실패' });
    } else {
      setBidMsg({ type: 'ok', text: '즉시 구매 완료! 결제를 진행하세요.' });
    }
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
                {/* 앨범·등급·카드명 */}
                <div style={{fontSize:'12px', color:'var(--t3)', marginBottom:'6px', display:'flex', gap:'6px', flexWrap:'wrap'}}>
                  {auction.gender && <span style={{background:'var(--bg)', borderRadius:4, padding:'2px 6px'}}>{auction.gender}</span>}
                  {auction.card_name && <span style={{background:'var(--bg)', borderRadius:4, padding:'2px 6px'}}>{auction.card_name}</span>}
                  {auction.album && <span>{auction.album}</span>}
                  {auction.grade && <span>{auction.grade}급</span>}
                </div>

                {/* 현재가 */}
                <div className="mbig">₩ {(auction.current_price || 0).toLocaleString()}</div>

                {/* 남은 시간 */}
                {!isEnded && timeLeft && (
                  <div style={{
                    display:'inline-flex', alignItems:'center', gap:6,
                    marginTop:6, marginBottom:4,
                    fontSize:13, fontWeight:700,
                    color: timeLeft === '종료' ? 'var(--t3)' : '#e55',
                  }}>
                    ⏱ {timeLeft} 남음
                  </div>
                )}

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
                  <div>
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

                    {/* 즉시 구매 버튼 */}
                    {auction.buy_now_price && (
                      <button
                        onClick={handleBuyNow}
                        disabled={buyingNow}
                        style={{
                          width:'100%', marginTop:8, padding:'11px',
                          borderRadius:10, border:'2px solid #e8a020',
                          background:'rgba(232,160,32,0.07)', color:'#b87000',
                          fontSize:13, fontWeight:800, cursor:'pointer',
                          transition:'all 0.15s',
                        }}
                      >
                        {buyingNow ? '처리 중...' : `⚡ 즉시 구매 ₩${auction.buy_now_price.toLocaleString()}`}
                      </button>
                    )}
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
