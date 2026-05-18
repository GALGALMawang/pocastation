import React, { useState } from 'react';
import { formatTimeLeft, isEndingSoon } from '../lib/utils';

export default function AuctionCard({ item, onBid }) {
  const [hovered, setHovered] = useState(false);

  const ending = item.ends_at ? isEndingSoon(item.ends_at) : item.status === 'ending';
  const timeLeft = item.ends_at ? formatTimeLeft(item.ends_at) : item.ends_in;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#fff',
        border: hovered ? '1px solid rgba(0,0,0,0.15)' : '1px solid rgba(0,0,0,0.07)',
        borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
        transition: 'all 0.25s',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered ? '0 12px 32px rgba(0,0,0,0.12)' : '0 2px 8px rgba(0,0,0,0.05)',
      }}
    >
      {/* Image */}
      <div style={{ height: 160, overflow: 'hidden', position: 'relative' }}>
        <img
          src={item.img ?? item.img_url}
          alt={item.member}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s', transform: hovered ? 'scale(1.06)' : 'scale(1)' }}
        />
        {/* Status badge */}
        <div style={{
          position: 'absolute', top: 10, left: 10,
          padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 800, letterSpacing: 1,
          background: ending ? 'rgba(255,80,80,0.9)' : 'rgba(0,0,0,0.6)',
          color: ending ? '#fff' : 'rgba(255,255,255,0.8)',
          backdropFilter: 'blur(4px)',
        }}>
          {ending ? '⚡ 마감임박' : '● LIVE'}
        </div>
        {/* Grade */}
        <div style={{
          position: 'absolute', top: 10, right: 10,
          width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: item.grade === 'S' ? 'rgba(255,200,0,0.9)' : 'rgba(100,180,255,0.9)',
          fontSize: 10, fontWeight: 900, color: '#000',
        }}>
          {item.grade}
        </div>
        {/* Timer */}
        {timeLeft && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 10px 8px',
            background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
            fontSize: 10, fontFamily: 'monospace',
            color: ending ? '#ff8080' : 'rgba(255,255,255,0.6)', letterSpacing: 1,
          }}>
            ⏱ {timeLeft}
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontSize: 9, color: '#7c3aed', fontWeight: 800, letterSpacing: 1.5, fontFamily: 'monospace' }}>{item.group_name}</div>
        <div style={{ fontSize: 14, fontWeight: 900, margin: '3px 0 10px', color: '#111' }}>{item.member}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 900, color: '#111' }}>₩{(item.current_price ?? item.start_price)?.toLocaleString()}</div>
            <div style={{ fontSize: 9, color: 'rgba(0,0,0,0.3)', marginTop: 1 }}>{item.bid_count}회 입찰</div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onBid?.(item); }}
            style={{
              padding: '5px 12px', borderRadius: 6,
              background: hovered ? '#111' : 'transparent',
              color: hovered ? '#fff' : '#111',
              border: '1px solid rgba(0,0,0,0.15)',
              fontSize: 10, fontWeight: 900, cursor: 'pointer', transition: 'all 0.2s',
            }}
          >BID</button>
        </div>
      </div>
    </div>
  );
}
