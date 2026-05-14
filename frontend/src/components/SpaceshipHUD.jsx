import React, { useState, useEffect } from 'react';
import { ChevronRight, Compass, CircleDollarSign, BellRing, PackageCheck } from 'lucide-react';
import TypewriterText from './TypewriterText';

const SpaceshipHUD = ({ step, onNext }) => {
  const [isReady, setIsReady] = useState(false);

  const steps = [
    {
      num: 'SYSTEM.STEP_01',
      icon: <Compass size={32} color="#111" />,
      title: '> SCAN_GOODS // 경매 탐색',
      desc: '희귀 포토카드 데이터 스캔 중...\n필터를 설정하여 목표 좌표를 확인하십시오.'
    },
    {
      num: 'SYSTEM.STEP_02',
      icon: <CircleDollarSign size={32} color="#111" />,
      title: '> TRANSMIT_BID // 입찰 전송',
      desc: '목표 발견 완료.\n최고가 이상의 금액을 전송하여 소유권을 쟁취하십시오.'
    },
    {
      num: 'SYSTEM.STEP_03',
      icon: <BellRing size={32} color="#111" />,
      title: '> BID_CONFIRMED // 낙찰 확정',
      desc: '카운트다운 종료.\n최고 입찰자에게 즉각적인 낙찰 확보 알림이 수신됩니다.'
    },
    {
      num: 'SYSTEM.STEP_04',
      icon: <PackageCheck size={32} color="#111" />,
      title: '> SAFE_TRANSFER // 안전 결제 및 배송',
      desc: '자산 보호 시스템 가동 중.\n안전한 배송 확인 후 정산 절차가 실행됩니다.'
    }
  ];

  const current = steps[step - 1];

  useEffect(() => {
    setIsReady(false);
  }, [step]);

  return (
    <div style={{ padding: '52px 60px', display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* Step progress */}
      <div style={{ display: 'flex', gap: 6 }}>
        {[1,2,3,4].map(n => (
          <div key={n} style={{
            height: 2, flex: 1, borderRadius: 2,
            background: n <= step ? '#111' : 'rgba(0,0,0,0.1)',
            transition: 'background 0.4s',
          }} />
        ))}
      </div>

      {/* Icon + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 12,
          background: 'rgba(0,0,0,0.05)',
          border: '1px solid rgba(0,0,0,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {current.icon}
        </div>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 3, color: 'rgba(0,0,0,0.3)', fontFamily: 'monospace', marginBottom: 5 }}>
            [ {current.num} ]
          </div>
          <h3 style={{ fontSize: 22, fontWeight: 800, fontFamily: 'monospace', margin: 0, color: '#111', letterSpacing: 0.5 }}>
            {current.title}
          </h3>
        </div>
      </div>

      {/* Description */}
      <div style={{ fontSize: 15, lineHeight: 2, color: 'rgba(0,0,0,0.45)', fontFamily: 'monospace', minHeight: 76, whiteSpace: 'pre-line' }}>
        <TypewriterText text={current.desc} delay={16} onComplete={() => setIsReady(true)} />
        <span className="blink-text" style={{ opacity: isReady ? 1 : 0, color: '#111', marginLeft: 3 }}>_</span>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(0,0,0,0.07)' }} />

      {/* Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={() => onNext(true)}
          style={{
            padding: '9px 20px',
            background: 'transparent',
            color: 'rgba(0,0,0,0.25)',
            border: '1px solid rgba(0,0,0,0.1)',
            borderRadius: 8,
            fontSize: 11,
            fontFamily: 'monospace',
            letterSpacing: 2,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseOver={e => e.currentTarget.style.color = 'rgba(0,0,0,0.5)'}
          onMouseOut={e => e.currentTarget.style.color = 'rgba(0,0,0,0.25)'}
        >
          [ SKIP ]
        </button>
        <button
          onClick={() => onNext(false)}
          style={{
            padding: '11px 28px',
            background: isReady ? '#111' : 'transparent',
            color: isReady ? '#fff' : 'transparent',
            border: '1px solid rgba(0,0,0,0.15)',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            fontFamily: 'monospace',
            letterSpacing: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: isReady ? 'pointer' : 'default',
            transition: 'all 0.35s',
          }}
          disabled={!isReady}
        >
          {step === 4 ? '[ DOCKING_INITIATE ]' : '[ NEXT_COORDINATE ]'} <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
};

export default SpaceshipHUD;
