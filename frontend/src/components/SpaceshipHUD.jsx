import React, { useState, useEffect } from 'react';
import { ChevronRight, Compass, CircleDollarSign, BellRing, PackageCheck } from 'lucide-react';
import TypewriterText from './TypewriterText';

const C  = '#00E5FF';
const C2 = '#bf5fff';

const Corner = ({ pos }) => {
  const size = 18;
  const styles = {
    position: 'absolute', width: size, height: size,
    ...(pos.includes('top')    ? { top: 0 }    : { bottom: 0 }),
    ...(pos.includes('left')   ? { left: 0 }   : { right: 0 }),
    borderColor: C,
    borderStyle: 'solid',
    borderWidth: 0,
    ...(pos.includes('top')   && pos.includes('left')  ? { borderTopWidth: 2, borderLeftWidth: 2 }   : {}),
    ...(pos.includes('top')   && pos.includes('right') ? { borderTopWidth: 2, borderRightWidth: 2 }  : {}),
    ...(pos.includes('bottom')&& pos.includes('left')  ? { borderBottomWidth: 2, borderLeftWidth: 2 }: {}),
    ...(pos.includes('bottom')&& pos.includes('right') ? { borderBottomWidth: 2, borderRightWidth: 2}: {}),
  };
  return <div style={styles} />;
};

const SpaceshipHUD = ({ step, onNext }) => {
  const [isReady, setIsReady] = useState(false);
  const [tick, setTick]       = useState(0);

  const steps = [
    { num: 'STEP_01', icon: <Compass size={28} color={C} />,           title: 'SCAN_GOODS',    sub: '경매 탐색',       desc: '희귀 포토카드 데이터 스캔 중...\n필터를 설정하여 목표 좌표를 확인하십시오.' },
    { num: 'STEP_02', icon: <CircleDollarSign size={28} color={C} />,  title: 'TRANSMIT_BID',  sub: '입찰 전송',       desc: '목표 발견 완료.\n최고가 이상의 금액을 전송하여 소유권을 쟁취하십시오.' },
    { num: 'STEP_03', icon: <BellRing size={28} color={C} />,          title: 'BID_CONFIRMED', sub: '낙찰 확정',       desc: '카운트다운 종료.\n최고 입찰자에게 즉각적인 낙찰 확보 알림이 수신됩니다.' },
    { num: 'STEP_04', icon: <PackageCheck size={28} color={C} />,      title: 'SAFE_TRANSFER', sub: '안전 결제 및 배송', desc: '자산 보호 시스템 가동 중.\n안전한 배송 확인 후 정산 절차가 실행됩니다.' },
  ];

  const current = steps[step - 1];

  useEffect(() => { setIsReady(false); }, [step]);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1200);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{
      position: 'relative',
      background: 'rgba(2,4,14,0.96)',
      border: `1px solid rgba(0,229,255,0.18)`,
      borderRadius: 4,
      padding: 'clamp(24px, 5vw, 44px) clamp(20px, 5vw, 52px) clamp(20px, 4vw, 40px)',
      overflow: 'hidden',
      boxShadow: `0 0 60px rgba(0,229,255,0.06), inset 0 0 80px rgba(0,0,0,0.4)`,
    }}>

      {/* 코너 브래킷 */}
      <Corner pos="top-left"     />
      <Corner pos="top-right"    />
      <Corner pos="bottom-left"  />
      <Corner pos="bottom-right" />

      {/* 상단 상태바 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 36 }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(0,229,255,0.35)', letterSpacing: 3 }}>POCASTATION</span>
          <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(0,229,255,0.2)', letterSpacing: 2 }}>v2.0.1</span>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#00ff88', boxShadow: '0 0 6px #00ff88', display: 'inline-block' }} />
          <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(0,255,136,0.6)', letterSpacing: 2 }}>SYS.ONLINE</span>
        </div>
      </div>

      {/* 진행 바 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 40 }}>
        {[1,2,3,4].map(n => (
          <div key={n} style={{ flex: 1, position: 'relative', height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 2,
              background: n < step ? C2 : n === step ? C : 'transparent',
              boxShadow: n === step ? `0 0 8px ${C}` : 'none',
              width: n < step ? '100%' : n === step ? '100%' : '0%',
              transition: 'width 0.5s ease',
            }} />
          </div>
        ))}
        <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(0,229,255,0.25)', letterSpacing: 1, marginLeft: 10, flexShrink: 0 }}>{step}/4</span>
      </div>

      {/* 스텝 번호 */}
      <div style={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(0,229,255,0.5)', letterSpacing: 4, marginBottom: 16 }}>
        [ SYSTEM.{current.num} ] ── {current.sub}
      </div>

      {/* 아이콘 + 타이틀 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 28 }}>
        <div style={{
          width: 50, height: 50, borderRadius: 8, flexShrink: 0,
          background: 'rgba(0,229,255,0.08)',
          border: '1px solid rgba(0,229,255,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 20px rgba(0,229,255,0.15)',
        }}>
          {current.icon}
        </div>
        <h3 style={{
          margin: 0, fontSize: 22, fontWeight: 800, fontFamily: 'monospace',
          color: '#ffffff', letterSpacing: 1,
        }}>
          &gt; {current.title}
        </h3>
      </div>

      {/* 설명 */}
      <div style={{
        fontSize: 14, lineHeight: 2, color: 'rgba(220,240,255,0.8)',
        fontFamily: 'monospace', minHeight: 72, whiteSpace: 'pre-line',
        borderLeft: `2px solid rgba(0,229,255,0.25)`, paddingLeft: 16,
        marginBottom: 36,
      }}>
        <TypewriterText text={current.desc} delay={18} onComplete={() => setIsReady(true)} />
        <span className="blink-text" style={{ opacity: isReady ? 1 : 0, color: C }}>█</span>
      </div>

      {/* 하단 구분선 */}
      <div style={{ height: 1, background: 'rgba(0,229,255,0.07)', marginBottom: 28 }} />

      {/* 버튼 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={() => onNext(true)}
          style={{
            padding: '8px 18px', background: 'transparent', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 4, fontSize: 10, fontFamily: 'monospace', letterSpacing: 3,
            color: 'rgba(255,255,255,0.18)', cursor: 'pointer', transition: 'all 0.2s',
          }}
          onMouseOver={e => e.currentTarget.style.color = 'rgba(255,255,255,0.45)'}
          onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.18)'}
        >
          [ SKIP ]
        </button>

        <button
          onClick={() => onNext(false)}
          disabled={!isReady}
          style={{
            padding: '11px 32px', borderRadius: 4, fontSize: 12, fontWeight: 700,
            fontFamily: 'monospace', letterSpacing: 2,
            display: 'flex', alignItems: 'center', gap: 10,
            background: isReady ? 'rgba(0,229,255,0.08)' : 'transparent',
            color: isReady ? C : 'rgba(0,229,255,0.2)',
            border: `1px solid ${isReady ? 'rgba(0,229,255,0.35)' : 'rgba(0,229,255,0.08)'}`,
            boxShadow: isReady ? `0 0 24px rgba(0,229,255,0.12)` : 'none',
            cursor: isReady ? 'pointer' : 'default',
            opacity: isReady ? 1 : 0.3,
            transition: 'all 0.4s',
          }}
          onMouseOver={e => isReady && (e.currentTarget.style.background = 'rgba(0,229,255,0.15)')}
          onMouseOut={e => { if (isReady) e.currentTarget.style.background = 'rgba(0,229,255,0.08)'; }}
        >
          {step === 4 ? '[ DOCKING_INITIATE ]' : '[ NEXT_COORDINATE ]'}
          <ChevronRight size={13} />
        </button>
      </div>

      {/* 스캔라인 오버레이 */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
      }} />
    </div>
  );
};

export default SpaceshipHUD;
