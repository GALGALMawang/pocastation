import React, { useState, useEffect } from 'react';
import { ChevronRight, Compass, CircleDollarSign, BellRing, PackageCheck } from 'lucide-react';
import TypewriterText from './TypewriterText';

const C = '#00E5FF';   // 네온 시안
const C2 = '#bf5fff';  // 네온 퍼플

const SpaceshipHUD = ({ step, onNext }) => {
  const [isReady, setIsReady] = useState(false);

  const steps = [
    {
      num: 'SYSTEM.STEP_01',
      icon: <Compass size={32} color={C} />,
      title: '> SCAN_GOODS // 경매 탐색',
      desc: '희귀 포토카드 데이터 스캔 중...\n필터를 설정하여 목표 좌표를 확인하십시오.'
    },
    {
      num: 'SYSTEM.STEP_02',
      icon: <CircleDollarSign size={32} color={C} />,
      title: '> TRANSMIT_BID // 입찰 전송',
      desc: '목표 발견 완료.\n최고가 이상의 금액을 전송하여 소유권을 쟁취하십시오.'
    },
    {
      num: 'SYSTEM.STEP_03',
      icon: <BellRing size={32} color={C} />,
      title: '> BID_CONFIRMED // 낙찰 확정',
      desc: '카운트다운 종료.\n최고 입찰자에게 즉각적인 낙찰 확보 알림이 수신됩니다.'
    },
    {
      num: 'SYSTEM.STEP_04',
      icon: <PackageCheck size={32} color={C} />,
      title: '> SAFE_TRANSFER // 안전 결제 및 배송',
      desc: '자산 보호 시스템 가동 중.\n안전한 배송 확인 후 정산 절차가 실행됩니다.'
    }
  ];

  const current = steps[step - 1];

  useEffect(() => { setIsReady(false); }, [step]);

  return (
    <div style={{ padding: '52px 60px', display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* Step progress */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {[1,2,3,4].map(n => (
          <div key={n} style={{
            height: 2, flex: 1, borderRadius: 2,
            background: n < step ? C2 : n === step ? C : 'rgba(255,255,255,0.08)',
            boxShadow: n <= step ? `0 0 8px ${n === step ? C : C2}88` : 'none',
            transition: 'all 0.4s',
          }} />
        ))}
        <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.2)', letterSpacing: 1, marginLeft: 8, flexShrink: 0 }}>
          {step} / 4
        </span>
      </div>

      {/* Icon + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{
          width: 54, height: 54, borderRadius: 12,
          background: 'rgba(0,229,255,0.06)',
          border: `1px solid rgba(0,229,255,0.2)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          boxShadow: `0 0 16px rgba(0,229,255,0.1)`,
        }}>
          {current.icon}
        </div>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 3, color: 'rgba(0,229,255,0.4)', fontFamily: 'monospace', marginBottom: 6 }}>
            [ {current.num} ]
          </div>
          <h3 style={{
            fontSize: 22, fontWeight: 800, fontFamily: 'monospace', margin: 0,
            color: C,
            textShadow: `0 0 20px rgba(0,229,255,0.4)`,
            letterSpacing: 0.5,
          }}>
            {current.title}
          </h3>
        </div>
      </div>

      {/* Description */}
      <div style={{
        fontSize: 15, lineHeight: 2,
        color: 'rgba(200,240,255,0.6)',
        fontFamily: 'monospace', minHeight: 76, whiteSpace: 'pre-line',
      }}>
        <TypewriterText text={current.desc} delay={16} onComplete={() => setIsReady(true)} />
        <span className="blink-text" style={{ opacity: isReady ? 1 : 0, color: C, marginLeft: 3 }}>_</span>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(0,229,255,0.08)' }} />

      {/* Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={() => onNext(true)}
          style={{
            padding: '9px 20px',
            background: 'transparent',
            color: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 6,
            fontSize: 11, fontFamily: 'monospace', letterSpacing: 2,
            cursor: 'pointer', transition: 'all 0.2s',
          }}
          onMouseOver={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
          onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}
        >
          [ SKIP ]
        </button>
        <button
          onClick={() => onNext(false)}
          style={{
            padding: '11px 28px',
            background: isReady ? 'rgba(0,229,255,0.1)' : 'transparent',
            color: C,
            border: `1px solid ${isReady ? 'rgba(0,229,255,0.4)' : 'rgba(0,229,255,0.1)'}`,
            borderRadius: 6,
            fontSize: 13, fontWeight: 700, fontFamily: 'monospace', letterSpacing: 1.5,
            display: 'flex', alignItems: 'center', gap: 10,
            cursor: isReady ? 'pointer' : 'default',
            opacity: isReady ? 1 : 0,
            boxShadow: isReady ? `0 0 20px rgba(0,229,255,0.15)` : 'none',
            transition: 'all 0.35s',
          }}
          onMouseOver={e => isReady && (e.currentTarget.style.background = 'rgba(0,229,255,0.18)')}
          onMouseOut={e => { if (isReady) e.currentTarget.style.background = 'rgba(0,229,255,0.1)'; }}
          disabled={!isReady}
        >
          {step === 4 ? '[ DOCKING_INITIATE ]' : '[ NEXT_COORDINATE ]'} <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
};

export default SpaceshipHUD;
