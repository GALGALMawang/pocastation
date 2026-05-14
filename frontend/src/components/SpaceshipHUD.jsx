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
    <div style={{ position: 'absolute', inset: '5%', pointerEvents: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '20px',
        padding: '56px 64px',
        width: '100%',
        maxWidth: '860px',
        display: 'flex',
        flexDirection: 'column',
        gap: '36px',
        pointerEvents: 'auto',
        color: '#E0FFFF',
        boxShadow: '0 8px 48px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
        position: 'relative'
      }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div>{current.icon}</div>
          <div>
            <div style={{ fontSize: '12px', letterSpacing: '3px', opacity: 0.6, fontFamily: 'monospace', color: '#00E5FF' }}>[ {current.num} ]</div>
            <h3 style={{ fontSize: '28px', fontWeight: '800', fontFamily: 'monospace', margin: '6px 0 0 0', letterSpacing: '1px', color: '#00E5FF' }}>
              {current.title}
            </h3>
          </div>
        </div>

        <div style={{ fontSize: '17px', lineHeight: '2', color: '#B0E0E6', fontFamily: 'monospace', minHeight: '80px', whiteSpace: 'pre-line' }}>
          <TypewriterText text={current.desc} delay={15} onComplete={() => setIsReady(true)} />
          <span className="blink-text" style={{ opacity: isReady ? 1 : 0, color: '#00E5FF', marginLeft: '4px' }}>_</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
          <button
            onClick={() => onNext(true)}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              color: 'rgba(255,255,255,0.3)',
              border: '1px solid rgba(255,255,255,0.1)',
              fontSize: '12px',
              fontFamily: 'monospace',
              letterSpacing: '1.5px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
            onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
          >
            [ SKIP ]
          </button>
          <button
            onClick={() => onNext(false)}
            style={{
              padding: '12px 32px',
              background: 'rgba(0, 229, 255, 0.1)',
              color: '#00E5FF',
              border: '1px solid rgba(0, 229, 255, 0.4)',
              fontSize: '14px',
              fontWeight: '700',
              fontFamily: 'monospace',
              letterSpacing: '1.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: isReady ? 'pointer' : 'default',
              opacity: isReady ? 1 : 0,
              transition: 'all 0.2s',
            }}
            onMouseOver={e => isReady && (e.currentTarget.style.background = 'rgba(0, 229, 255, 0.2)')}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(0, 229, 255, 0.1)'}
            disabled={!isReady}
          >
            {step === 4 ? '[ DOCKING_INITIATE ]' : '[ NEXT_COORDINATE ]'} <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SpaceshipHUD;
