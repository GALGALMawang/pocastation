import React from 'react';
import { useIsMobile } from '../lib/hooks';

/**
 * ModalSheet — 모달 공통 셸.
 *
 * 데스크톱에서는 가운데 정렬 카드, 모바일에서는 하단 시트(bottom sheet)로 표시한다.
 * 오버레이 클릭 시 닫히고, 카드 내부 클릭은 전파되지 않는다.
 *
 * @param {() => void} onClose   - 오버레이 클릭 시 호출
 * @param {number}     maxWidth  - 데스크톱 카드 최대 너비(px)
 * @param {object}     bodyStyle - 카드(div)에 덧붙일 스타일 (padding, maxHeight 등)
 */
export default function ModalSheet({ onClose, maxWidth = 480, bodyStyle, children }) {
  const isMobile = useIsMobile();

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 600,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff', width: '100%',
          maxWidth: isMobile ? '100%' : maxWidth,
          borderRadius: isMobile ? '20px 20px 0 0' : 20,
          ...bodyStyle,
        }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
