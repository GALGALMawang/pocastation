import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle, XCircle } from 'lucide-react';
import { ADMIN_ITEMS_MOCK } from '../lib/mockData';

export default function Admin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data for prototype
    setTimeout(() => {
      setItems(ADMIN_ITEMS_MOCK);
      setLoading(false);
    }, 800);
  }, []);

  const handleApprove = (id) => {
    setItems(items.map(item => item.id === id ? { ...item, status: 'live' } : item));
  };

  const handleReject = (id) => {
    setItems(items.map(item => item.id === id ? { ...item, status: 'rejected' } : item));
  };

  return (
    <div className="admin-container">
      <div className="pg">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--fe)', fontSize: '28px', fontWeight: '900', color: '#fff' }}>관제 센터</h1>
            <p style={{ color: 'var(--t2)', marginTop: '8px' }}>포카스테이션 시스템 모니터링 및 승인 관리</p>
          </div>
          <span className="status-badge status-live" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', background: '#00F0FF', borderRadius: '50%' }}></span> 시스템 정상 가동 중
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '40px' }}>
          <div className="glass" style={{ padding: '24px', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '14px', color: 'var(--t2)', marginBottom: '12px' }}>대기 중인 전송(승인 대기)</h3>
            <p style={{ fontSize: '32px', fontWeight: '800', fontFamily: 'var(--fe)', color: '#FFD700' }}>
              {items.filter(i => i.status === 'pending').length}
            </p>
          </div>
          <div className="glass" style={{ padding: '24px', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '14px', color: 'var(--t2)', marginBottom: '12px' }}>활성화된 궤도(진행 중)</h3>
            <p style={{ fontSize: '32px', fontWeight: '800', fontFamily: 'var(--fe)', color: 'var(--ok)' }}>
              {items.filter(i => i.status === 'live').length}
            </p>
          </div>
          <div className="glass" style={{ padding: '24px', borderRadius: '16px', border: '1px solid rgba(255, 42, 109, 0.3)' }}>
            <h3 style={{ fontSize: '14px', color: 'var(--t2)', marginBottom: '12px' }}>AI 위험 감지</h3>
            <p style={{ fontSize: '32px', fontWeight: '800', fontFamily: 'var(--fe)', color: 'var(--ac)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <ShieldAlert size={32} /> 0
            </p>
          </div>
        </div>

        <div className="glass" style={{ borderRadius: '16px', padding: '24px', overflowX: 'auto' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px', color: '#fff' }}>물품 전송 로그</h2>
          
          {loading ? (
            <p style={{ color: 'var(--t2)' }}>스캔 중...</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Trace ID</th>
                  <th>피사체 (아티스트)</th>
                  <th>오리진 (앨범)</th>
                  <th>송신자</th>
                  <th>초기 가치 (KRW)</th>
                  <th>상태</th>
                  <th>AI 스캔</th>
                  <th>명령</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontFamily: 'var(--fe)', color: 'var(--t3)' }}>#{String(item.id).padStart(4, '0')}</td>
                    <td style={{ fontWeight: '700', color: '#fff' }}>{item.group_name} · {item.member}</td>
                    <td style={{ color: 'var(--t2)' }}>{item.album}</td>
                    <td style={{ color: 'var(--t2)' }}>{item.seller_name}</td>
                    <td style={{ fontFamily: 'var(--fe)', color: '#fff' }}>{item.price.toLocaleString()}</td>
                    <td>
                      <span className={`status-badge status-${item.status}`}>
                        {item.status === 'pending' ? '대기' : item.status === 'live' ? '활성' : '거부됨'}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--ok)', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle size={14} /> 98% 안전
                      </span>
                    </td>
                    <td>
                      {item.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            onClick={() => handleApprove(item.id)}
                            style={{ padding: '8px 16px', background: 'var(--ok)', color: '#000', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                            승인
                          </button>
                          <button 
                            onClick={() => handleReject(item.id)}
                            style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--ac)', color: 'var(--ac)', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                            차단
                          </button>
                        </div>
                      )}
                      {item.status !== 'pending' && (
                        <span style={{ fontSize: '12px', color: 'var(--t3)' }}>처리됨</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
