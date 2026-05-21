import React, { useState, useEffect, useRef, useContext } from 'react';
import { loadPaymentWidget } from '@tosspayments/payment-widget-sdk';
import { AuthContext } from '../App';
import { supabase } from '../lib/supabase';

const useAuth = () => useContext(AuthContext);

const TOSS_CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY;

export default function SettlementModal({ auction, onClose, onComplete }) {
  const { user, profile } = useAuth();
  const [method, setMethod] = useState(null); // 'toss' | 'direct'
  const [loading, setLoading] = useState(false);
  const [directContact, setDirectContact] = useState(null);
  const paymentWidgetRef = useRef(null);
  const paymentMethodsRef = useRef(null);

  const amount = auction.current_price ?? auction.start_price;
  const item = `${auction.group_name} ${auction.member} 포토카드`;

  // 토스 위젯 로드
  useEffect(() => {
    if (method !== 'toss' || !TOSS_CLIENT_KEY) return;
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
  }, [method]);

  const handleTossPay = async () => {
    if (!paymentWidgetRef.current) return;
    setLoading(true);
    try {
      // settlement 레코드 먼저 생성
      const { data: settlement, error } = await supabase.from('settlements').insert({
        auction_id: auction.id,
        buyer_id: user.id,
        seller_id: auction.seller_id,
        method: 'toss',
        amount,
        status: 'pending',
      }).select().single();
      if (error) throw error;

      await paymentWidgetRef.current.requestPayment({
        orderId: `settlement_${settlement.id}`,
        orderName: item,
        customerName: profile?.nickname ?? user.email,
        customerEmail: user.email,
        successUrl: `${window.location.origin}?payment=success`,
        failUrl: `${window.location.origin}?payment=fail`,
      });
    } catch (e) {
      alert('결제 오류: ' + e.message);
      setLoading(false);
    }
  };

  const handleDirect = async () => {
    setLoading(true);
    try {
      // settlement 기록 + 판매자 연락처 조회
      await supabase.from('settlements').insert({
        auction_id: auction.id,
        buyer_id: user.id,
        seller_id: auction.seller_id,
        method: 'direct',
        amount,
        status: 'pending',
      });
      // 낙찰자는 연락처 조회 가능 (RLS 보장)
      const { data } = await supabase
        .from('auctions')
        .select('seller_contact, seller_name')
        .eq('id', auction.id)
        .single();
      setDirectContact(data);
    } catch (e) {
      alert('오류: ' + e.message);
    }
    setLoading(false);
  };

  const isMobile = window.innerWidth < 768;
  const overlayStyle = {
    position: 'fixed', inset: 0, zIndex: 600,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: isMobile ? 'flex-end' : 'center',
    justifyContent: 'center',
  };
  const boxStyle = {
    background: '#fff',
    width: '100%',
    maxWidth: isMobile ? '100%' : 480,
    borderRadius: isMobile ? '20px 20px 0 0' : 20,
    padding: 24,
    maxHeight: '90vh',
    overflowY: 'auto',
  };

  // 직거래 연락처 공개 화면
  if (directContact) {
    return (
      <div style={overlayStyle} onClick={onClose}>
        <div style={boxStyle} onClick={e => e.stopPropagation()}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🤝</div>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#111' }}>판매자 연락처</div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', marginTop: 4 }}>직접 연락하여 거래를 진행하세요</div>
          </div>
          <div style={{ padding: '16px 20px', borderRadius: 12, background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.18)', marginBottom: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 800, marginBottom: 6 }}>판매자</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#111', marginBottom: 10 }}>{directContact.seller_name}</div>
            <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', marginBottom: 6 }}>연락처</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#111', letterSpacing: 1 }}>
              {directContact.seller_contact ?? '등록된 연락처 없음'}
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)', lineHeight: 1.7, marginBottom: 20, padding: '12px 14px', background: 'rgba(255,180,0,0.06)', borderRadius: 10, border: '1px solid rgba(255,180,0,0.2)' }}>
            ⚠️ 직거래는 플랫폼 보호를 받지 못할 수 있습니다. 반드시 배송 완료 확인 후 입금하세요.
          </div>
          <button onClick={onClose} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: '#111', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>확인</button>
        </div>
      </div>
    );
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={boxStyle} onClick={e => e.stopPropagation()}>
        {/* 헤더 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 800, letterSpacing: 2, fontFamily: 'monospace', marginBottom: 4 }}>낙찰 완료</div>
          <div style={{ fontSize: 17, fontWeight: 900, color: '#111' }}>{item}</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#111', fontFamily: 'monospace', marginTop: 4 }}>₩{amount?.toLocaleString()}</div>
        </div>

        {/* 결제 방법 선택 */}
        {!method && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(0,0,0,0.4)', marginBottom: 12 }}>결제 방법을 선택하세요</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              <button onClick={() => setMethod('toss')} style={{
                padding: '16px 20px', borderRadius: 12, border: '1.5px solid rgba(0,0,0,0.1)',
                background: '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
              }}
                onMouseOver={e => e.currentTarget.style.borderColor = '#7c3aed'}
                onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#0064FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="22" height="14" viewBox="0 0 44 28" fill="none"><path d="M22 0C9.85 0 0 6.27 0 14s9.85 14 22 14 22-6.27 22-14S34.15 0 22 0z" fill="#fff" opacity=".15"/><text x="8" y="20" fill="#fff" fontSize="14" fontWeight="800" fontFamily="sans-serif">toss</text></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#111' }}>토스페이먼츠</div>
                    <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', marginTop: 2 }}>카드 · 계좌이체 · 간편결제 · 플랫폼 보호</div>
                  </div>
                  <div style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: '#0064FF', background: 'rgba(0,100,255,0.08)', padding: '3px 8px', borderRadius: 6 }}>추천</div>
                </div>
              </button>

              <button onClick={handleDirect} disabled={loading} style={{
                padding: '16px 20px', borderRadius: 12, border: '1.5px solid rgba(0,0,0,0.1)',
                background: '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
              }}
                onMouseOver={e => e.currentTarget.style.borderColor = '#111'}
                onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🤝</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#111' }}>직거래</div>
                    <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', marginTop: 2 }}>판매자 연락처 즉시 공개 · 당사자 간 직접 거래</div>
                  </div>
                </div>
              </button>
            </div>
          </>
        )}

        {/* 토스 결제 위젯 */}
        {method === 'toss' && (
          <div>
            <button onClick={() => setMethod(null)} style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 16, padding: 0 }}>← 뒤로</button>
            <div id="toss-payment-methods" style={{ marginBottom: 12 }} />
            <div id="toss-agreement" style={{ marginBottom: 16 }} />
            <button
              onClick={handleTossPay}
              disabled={loading}
              style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: '#0064FF', color: '#fff', fontSize: 14, fontWeight: 800, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.6 : 1 }}
            >
              {loading ? '처리 중...' : `₩${amount?.toLocaleString()} 결제하기`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
