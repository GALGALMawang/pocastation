/**
 * SettlementModal.jsx — 낙찰 후 결제 모달
 *
 * 낙찰자가 결제 방법을 선택하고 거래를 완료하는 모달.
 *
 * 결제 방법:
 *   1. 토스페이먼츠 — 카드·계좌이체·간편결제 (플랫폼 보호)
 *      loadPaymentWidget → requestPayment → toss-confirm Edge Function
 *   2. 직거래 — settlements 테이블에 기록 후 판매자 연락처 공개
 *
 * 흐름 (Toss):
 *   settlements INSERT (status='pending')
 *   → requestPayment → successUrl 리다이렉트
 *   → toss-confirm Edge Function → status='paid'
 *
 * 흐름 (직거래):
 *   settlements INSERT (status='pending')
 *   → auctions.seller_contact 조회 (RLS: 낙찰자만 접근 가능)
 *   → 연락처 화면 표시
 *
 * Props:
 *   auction    - 낙찰된 경매 (auctions 테이블 행)
 *   onClose    - 모달 닫기
 *   onComplete - 거래 완료 후 부모 컴포넌트 갱신 콜백
 */
import React, { useState, useEffect, useRef, useContext } from 'react';
import { loadPaymentWidget } from '@tosspayments/payment-widget-sdk';
import { AuthContext } from '../App';
import { supabase } from '../lib/supabase';

const TOSS_CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY;

export default function SettlementModal({ auction, onClose, onComplete }) {
  const { user, profile } = useContext(AuthContext);

  const [step,          setStep]          = useState('address'); // 'address' | 'method'
  const [address,       setAddress]       = useState('');        // 배송지
  const [buyerContact,  setBuyerContact]  = useState('');        // 구매자 연락처 (판매자에게 공유)
  const [method,        setMethod]        = useState(null);      // 'toss' | 'direct'
  const [loading,       setLoading]       = useState(false);
  const [directContact, setDirectContact] = useState(null);      // 직거래 연락처
  const [settlementId,  setSettlementId]  = useState(null);      // 생성된 settlement ID

  const paymentWidgetRef  = useRef(null);
  const paymentMethodsRef = useRef(null);

  // 편의점택배면 배송비 별도 합산, 일반이면 포함(0)
  const shippingFee = auction.shipping_type === 'convenience' ? (auction.shipping_fee || 0) : 0;
  const itemPrice   = auction.current_price ?? auction.start_price;
  const amount      = itemPrice + shippingFee;
  const item        = `${auction.group_name} ${auction.member} 포토카드`;

  // 프로필에 저장된 주소/연락처 프리필 (비어 있을 때만)
  useEffect(() => {
    if (profile?.address) setAddress(a => a || profile.address);
    if (profile?.phone)   setBuyerContact(c => c || profile.phone);
  }, [profile]);

  // ── Toss 결제 위젯 초기화 ────────────────────────────────
  useEffect(() => {
    if (step !== 'method' || method !== 'toss' || !TOSS_CLIENT_KEY) return;

    (async () => {
      const widget = await loadPaymentWidget(TOSS_CLIENT_KEY, user.id);
      paymentWidgetRef.current = widget;
      paymentMethodsRef.current = await widget.renderPaymentMethods(
        '#toss-payment-methods',
        { value: amount },
        { variantKey: 'DEFAULT' },
      );
      await widget.renderAgreement('#toss-agreement', { variantKey: 'AGREEMENT' });
    })();
  }, [step, method]);

  // ── settlements 생성 공통 함수 ───────────────────────────
  const createSettlement = async (method) => {
    const { data, error } = await supabase
      .from('settlements')
      .insert({
        auction_id:       auction.id,
        buyer_id:         user.id,
        seller_id:        auction.seller_id,
        method,
        amount,
        status:           'pending',
        shipping_address: address,
        buyer_contact:    buyerContact,
      })
      .select().single();
    if (error) throw error;
    setSettlementId(data.id);
    return data;
  };

  // ── Toss 결제 요청 ────────────────────────────────────────
  const handleTossPay = async () => {
    if (!paymentWidgetRef.current) return;
    setLoading(true);
    try {
      const settlement = await createSettlement('toss');
      await paymentWidgetRef.current.requestPayment({
        orderId:       `settlement_${settlement.id}`,
        orderName:     item,
        customerName:  profile?.nickname ?? user.email,
        customerEmail: user.email,
        successUrl:    `${window.location.origin}?payment=success`,
        failUrl:       `${window.location.origin}?payment=fail`,
      });
    } catch (e) {
      alert('결제 오류: ' + e.message);
      setLoading(false);
    }
  };

  // ── 직거래 처리 ───────────────────────────────────────────
  const handleDirect = async () => {
    setLoading(true);
    try {
      await createSettlement('direct');

      // 낙찰자는 RLS에 의해 seller_contact 조회 허용
      const { data } = await supabase
        .from('auctions')
        .select('seller_contact, seller_name')
        .eq('id', auction.id)
        .single();

      setDirectContact(data);
      onComplete?.(); // 부모 컴포넌트 경매 목록 갱신
    } catch (e) {
      alert('오류: ' + e.message);
    }
    setLoading(false);
  };

  const isMobile = window.innerWidth < 768;
  const overlayStyle = {
    position:'fixed', inset:0, zIndex:600,
    background:'rgba(0,0,0,0.5)',
    display:'flex',
    alignItems: isMobile ? 'flex-end' : 'center',
    justifyContent:'center',
  };
  const boxStyle = {
    background:'#fff',
    width:'100%',
    maxWidth: isMobile ? '100%' : 480,
    borderRadius: isMobile ? '20px 20px 0 0' : 20,
    padding:24,
    maxHeight:'90vh',
    overflowY:'auto',
  };

  // ── 직거래 연락처 화면 ────────────────────────────────────
  if (directContact) {
    return (
      <div style={overlayStyle} onClick={onClose}>
        <div style={boxStyle} onClick={e => e.stopPropagation()}>
          <div style={{textAlign:'center', marginBottom:20}}>
            <div style={{fontSize:28, marginBottom:8}}>🤝</div>
            <div style={{fontSize:17, fontWeight:900, color:'#111'}}>판매자 연락처</div>
            <div style={{fontSize:12, color:'rgba(0,0,0,0.4)', marginTop:4}}>
              직접 연락하여 거래를 진행하세요
            </div>
          </div>

          <div style={{padding:'16px 20px', borderRadius:12, background:'rgba(124,58,237,0.06)', border:'1px solid rgba(124,58,237,0.18)', marginBottom:20, textAlign:'center'}}>
            <div style={{fontSize:11, color:'#7c3aed', fontWeight:800, marginBottom:6}}>판매자</div>
            <div style={{fontSize:16, fontWeight:900, color:'#111', marginBottom:10}}>
              {directContact.seller_name}
            </div>
            <div style={{fontSize:11, color:'rgba(0,0,0,0.4)', marginBottom:6}}>연락처</div>
            <div style={{fontSize:18, fontWeight:900, color:'#111', letterSpacing:1}}>
              {directContact.seller_contact ?? '등록된 연락처 없음'}
            </div>
          </div>

          <div style={{fontSize:11, color:'rgba(0,0,0,0.35)', lineHeight:1.7, marginBottom:20, padding:'12px 14px', background:'rgba(255,180,0,0.06)', borderRadius:10, border:'1px solid rgba(255,180,0,0.2)'}}>
            ⚠️ 직거래는 플랫폼 보호를 받지 못할 수 있습니다. 반드시 배송 완료 확인 후 입금하세요.
          </div>

          <button
            onClick={onClose}
            style={{width:'100%', padding:13, borderRadius:10, border:'none', background:'#111', color:'#fff', fontSize:14, fontWeight:800, cursor:'pointer'}}
          >
            확인
          </button>
        </div>
      </div>
    );
  }

  // ── 주소 입력 화면 ────────────────────────────────────────
  if (step === 'address') {
    return (
      <div style={overlayStyle} onClick={onClose}>
        <div style={boxStyle} onClick={e => e.stopPropagation()}>
          <div style={{marginBottom:20}}>
            <div style={{fontSize:11, color:'#7c3aed', fontWeight:800, letterSpacing:2, fontFamily:'monospace', marginBottom:4}}>낙찰 완료</div>
            <div style={{fontSize:17, fontWeight:900, color:'#111'}}>{item}</div>
            <div style={{fontSize:22, fontWeight:900, color:'#111', fontFamily:'monospace', marginTop:4}}>₩{amount?.toLocaleString()}</div>
            {shippingFee > 0 && (
              <div style={{fontSize:12, color:'rgba(0,0,0,0.45)', marginTop:4}}>
                낙찰가 ₩{itemPrice?.toLocaleString()} + 편의점택배 ₩{shippingFee.toLocaleString()}
              </div>
            )}
          </div>

          <div style={{fontSize:13, fontWeight:700, color:'rgba(0,0,0,0.6)', marginBottom:10}}>배송지를 입력하세요</div>
          <textarea
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder={'서울시 강남구 테헤란로 123\n○○아파트 101동 202호\n(우편번호: 06234)'}
            rows={4}
            style={{
              width:'100%', padding:'12px 14px', borderRadius:10, fontSize:13,
              border:'1.5px solid rgba(0,0,0,0.12)', outline:'none', resize:'none',
              boxSizing:'border-box', lineHeight:1.6, color:'#111',
            }}
          />
          <div style={{fontSize:11, color:'rgba(0,0,0,0.35)', marginTop:6, marginBottom:14}}>
            정확한 주소를 입력해야 판매자가 발송할 수 있어요.
          </div>

          <div style={{fontSize:13, fontWeight:700, color:'rgba(0,0,0,0.6)', marginBottom:10}}>연락처</div>
          <input
            value={buyerContact}
            onChange={e => setBuyerContact(e.target.value)}
            placeholder="010-0000-0000 또는 카카오ID"
            style={{
              width:'100%', padding:'12px 14px', borderRadius:10, fontSize:13,
              border:'1.5px solid rgba(0,0,0,0.12)', outline:'none',
              boxSizing:'border-box', color:'#111',
            }}
          />
          <div style={{fontSize:11, color:'rgba(0,0,0,0.35)', marginTop:6, marginBottom:20}}>
            배송 문의를 위해 판매자에게 공유됩니다.
          </div>

          <button
            disabled={!address.trim() || !buyerContact.trim()}
            onClick={() => setStep('method')}
            style={{
              width:'100%', padding:13, borderRadius:10, border:'none',
              background: address.trim() && buyerContact.trim() ? '#111' : 'rgba(0,0,0,0.1)',
              color: address.trim() && buyerContact.trim() ? '#fff' : 'rgba(0,0,0,0.3)',
              fontSize:14, fontWeight:800,
              cursor: address.trim() && buyerContact.trim() ? 'pointer' : 'default',
            }}
          >
            다음 — 결제 방법 선택
          </button>
        </div>
      </div>
    );
  }

  // ── 결제 방법 선택 화면 ───────────────────────────────────
  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={boxStyle} onClick={e => e.stopPropagation()}>

        {/* 낙찰 정보 */}
        <div style={{marginBottom:20}}>
          <div style={{fontSize:11, color:'#7c3aed', fontWeight:800, letterSpacing:2, fontFamily:'monospace', marginBottom:4}}>낙찰 완료</div>
          <div style={{fontSize:17, fontWeight:900, color:'#111'}}>{item}</div>
          <div style={{fontSize:24, fontWeight:900, color:'#111', fontFamily:'monospace', marginTop:4}}>
            ₩{amount?.toLocaleString()}
          </div>
        </div>

        {/* 결제 방법 선택 */}
        {!method && (
          <>
            <div style={{fontSize:12, fontWeight:700, color:'rgba(0,0,0,0.4)', marginBottom:12}}>
              결제 방법을 선택하세요
            </div>
            <div style={{display:'flex', flexDirection:'column', gap:10, marginBottom:20}}>

              {/* 토스페이먼츠 */}
              <button
                onClick={() => setMethod('toss')}
                style={{padding:'16px 20px', borderRadius:12, border:'1.5px solid rgba(0,0,0,0.1)', background:'#fff', cursor:'pointer', textAlign:'left', transition:'all 0.2s'}}
                onMouseOver={e => e.currentTarget.style.borderColor = '#7c3aed'}
                onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'}
              >
                <div style={{display:'flex', alignItems:'center', gap:12}}>
                  <div style={{width:40, height:40, borderRadius:10, background:'#0064FF', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                    <svg width="22" height="14" viewBox="0 0 44 28" fill="none">
                      <path d="M22 0C9.85 0 0 6.27 0 14s9.85 14 22 14 22-6.27 22-14S34.15 0 22 0z" fill="#fff" opacity=".15"/>
                      <text x="8" y="20" fill="#fff" fontSize="14" fontWeight="800" fontFamily="sans-serif">toss</text>
                    </svg>
                  </div>
                  <div>
                    <div style={{fontSize:14, fontWeight:800, color:'#111'}}>토스페이먼츠</div>
                    <div style={{fontSize:11, color:'rgba(0,0,0,0.4)', marginTop:2}}>카드 · 계좌이체 · 간편결제 · 플랫폼 보호</div>
                  </div>
                  <div style={{marginLeft:'auto', fontSize:10, fontWeight:700, color:'#0064FF', background:'rgba(0,100,255,0.08)', padding:'3px 8px', borderRadius:6}}>추천</div>
                </div>
              </button>

              {/* 직거래 */}
              <button
                onClick={handleDirect}
                disabled={loading}
                style={{padding:'16px 20px', borderRadius:12, border:'1.5px solid rgba(0,0,0,0.1)', background:'#fff', cursor:'pointer', textAlign:'left', transition:'all 0.2s'}}
                onMouseOver={e => e.currentTarget.style.borderColor = '#111'}
                onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'}
              >
                <div style={{display:'flex', alignItems:'center', gap:12}}>
                  <div style={{width:40, height:40, borderRadius:10, background:'#f5f5f5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0}}>🤝</div>
                  <div>
                    <div style={{fontSize:14, fontWeight:800, color:'#111'}}>직거래</div>
                    <div style={{fontSize:11, color:'rgba(0,0,0,0.4)', marginTop:2}}>판매자 연락처 즉시 공개 · 당사자 간 직접 거래</div>
                  </div>
                </div>
              </button>
            </div>
          </>
        )}

        {/* 토스 결제 위젯 */}
        {method === 'toss' && (
          <div>
            <button
              onClick={() => setMethod(null)}
              style={{fontSize:12, color:'rgba(0,0,0,0.4)', background:'none', border:'none', cursor:'pointer', marginBottom:16, padding:0}}
            >
              ← 뒤로
            </button>
            <div id="toss-payment-methods" style={{marginBottom:12}} />
            <div id="toss-agreement" style={{marginBottom:16}} />
            <button
              onClick={handleTossPay}
              disabled={loading}
              style={{
                width:'100%', padding:13, borderRadius:10, border:'none',
                background:'#0064FF', color:'#fff', fontSize:14, fontWeight:800,
                cursor: loading ? 'default' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? '처리 중...' : `₩${amount?.toLocaleString()} 결제하기`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
