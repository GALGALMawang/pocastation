import React from 'react';
import { Crosshair, X } from 'lucide-react';

const GlassPanel = ({ title, onClose, children }) => (
  <div style={{
    position: 'absolute', inset: '40px', zIndex: 500,
    background: 'rgba(250, 250, 255, 0.95)', // Bright theme for the inside panel
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(138, 43, 226, 0.2)', 
    borderRadius: '24px',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    animation: 'mod-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 32px', borderBottom: '1px solid rgba(0,0,0,0.05)', background: '#fff' }}>
      <h2 style={{ color: '#1A1A24', fontSize: '24px', fontFamily: 'var(--fe)', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '900' }}>
        <Crosshair size={24} color="var(--pr)" /> {title}
      </h2>
      <button onClick={onClose} style={{ color: 'var(--t3)', transition: 'color 0.2s', cursor: 'pointer', background: 'transparent', border: 'none' }} onMouseOver={e=>e.currentTarget.style.color='var(--ac)'} onMouseOut={e=>e.currentTarget.style.color='var(--t3)'}>
        <X size={28} />
      </button>
    </div>
    <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
      {children}
    </div>
  </div>
);

export default GlassPanel;
