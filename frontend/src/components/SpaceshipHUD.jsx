import React, { useState, useEffect } from 'react';
import { ChevronRight, Compass, CircleDollarSign, BellRing, PackageCheck } from 'lucide-react';
import TypewriterText from './TypewriterText';

const SpaceshipHUD = ({ step, onNext }) => {
  const [isReady, setIsReady] = useState(false);

  const steps = [
    {
      num: 'SYSTEM.STEP_01',
      icon: <Compass size={36} color="#00E5FF" />,
      title: '> SCAN_GOODS // 경매 탐색',
      desc: '희귀 포토카드 데이터 스캔 중...\n필터를 설정하여 목표 좌표를 확인하십시오.'
    },
    {
      num: 'SYSTEM.STEP_02',
      icon: <CircleDollarSign size={36} color="#00E5FF" />,
      title: '> TRANSMIT_BID // 입찰 전송',
      desc: '목표 발견 완료.\n최고가 이상의 금액을 전송하여 소유권을 쟁취하십시오.'
    },
    {
      num: 'SYSTEM.STEP_03',
      icon: <BellRing size={36} color="#00E5FF" />,
      title: '> BID_CONFIRMED // 낙찰 확정',
      desc: '카운트다운 종료.\n최고 입찰자에게 즉각적인 낙찰 확보 알림이 수신됩니다.'
    },
    {
      num: 'SYSTEM.STEP_04',
      icon: <PackageCheck size={36} color="#00E5FF" />,
      title: '> SAFE_TRANSFER // 안전 결제 및 배송',
      desc: '자산 보호 시스템 가동 중.\n안전한 배송 확인 후 정산 절차가 실행됩니다.'
    }
  ];

  const current = steps[step - 1];

  useEffect(() => {
    setIsReady(false);
  }, [step]);

  return (
    <div style={{ width: '100%', maxWidth: 860, padding: '56px 64px', display: 'flex', flexDirection: 'column', gap: 36 }}>

      {/* Step progress bar */}
      <div style={{ display: 'flex', gap: 6 }}>
        {[1,2,3,4].map(n => (
          <div key={n} style={{
            height: 2, flex: 1, borderRadius: 2,
            background: n <= step ? '#00E5FF' : 'rgba(255,255,255,0.1)',
            boxShadow: n <= step ? '0 0 6px rgba(0,229,255,0.6)' : 'none',
            transition: 'all 0.4s',
          }} />
        ))}
      </div>

      {/* Icon + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: 'rgba(0,229,255,0.08)',
          border: '1px solid rgba(0,229,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {current.icon}
        </div>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 3, color: 'rgba(0,229,255,0.5)', fontFamily: 'monospace', marginBottom: 6 }}>[ {current.num} ]</div>
          <h3 style={{ fontSize: 26, fontWeight: 800, fontFamily: 'monospace', margin: 0, letterSpacing: 1, color: '#00E5FF' }}>
            {current.title}
          </h3>
        </div>
      </div>

      {/* Description */}
      <div style={{ fontSize: 16, lineHeight: 2, color: 'rgba(180,230,240,0.8)', fontFamily: 'monospace', minHeight: 80, whiteSpace: 'pre-line' }}>
        <TypewriterText text={current.desc} delay={16} onComplete={() => setIsReady(true)} />
        <span className="blink-text" style={{ opacity: isReady ? 1 : 0, color: '#00E5FF', marginLeft: 4 }}>_</span>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={() => onNext(true)}
          style={{
            padding: '10px 22px',
            background: 'transparent',
            color: 'rgba(255,255,255,0.25)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6,
            fontSize: 11,
            fontFamily: 'monospace',
            letterSpacing: 2,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseOver={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
          onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
        >
          [ SKIP ]
        </button>
        <button
          onClick={() => onNext(false)}
          style={{
            padding: '12px 32px',
            background: isReady ? 'rgba(0,229,255,0.12)' : 'transparent',
            color: '#00E5FF',
            border: '1px solid rgba(0,229,255,0.35)',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 700,
            fontFamily: 'monospace',
            letterSpacing: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: isReady ? 'pointer' : 'default',
            opacity: isReady ? 1 : 0,
            transition: 'all 0.3s',
          }}
          onMouseOver={e => isReady && (e.currentTarget.style.background = 'rgba(0,229,255,0.22)')}
          onMouseOut={e => { e.currentTarget.style.background = isReady ? 'rgba(0,229,255,0.12)' : 'transparent'; }}
          disabled={!isReady}
        >
          {step === 4 ? '[ DOCKING_INITIATE ]' : '[ NEXT_COORDINATE ]'} <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default SpaceshipHUD;
