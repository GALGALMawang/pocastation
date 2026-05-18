import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import WarpBackground from '../components/WarpBackground';
import GlobeStation from '../components/GlobeStation';

const STATUS_LABELS = { pending: '대기', live: '진행중', ended: '종료', rejected: '거부' };
const STATUS_COLORS = {
  pending:  { bg: 'rgba(255,180,0,0.1)',   color: '#b07700',  border: 'rgba(255,180,0,0.25)'   },
  live:     { bg: 'rgba(0,180,80,0.1)',    color: '#006d30',  border: 'rgba(0,180,80,0.25)'    },
  ended:    { bg: 'rgba(0,0,0,0.06)',      color: 'rgba(0,0,0,0.4)', border: 'rgba(0,0,0,0.1)' },
  rejected: { bg: 'rgba(220,50,50,0.08)', color: '#b02020',  border: 'rgba(220,50,50,0.2)'    },
};

const FILTER_TABS = [
  { id: 'all',      label: '전체' },
  { id: 'pending',  label: '대기중' },
  { id: 'live',     label: '진행중' },
  { id: 'ended',    label: '종료' },
  { id: 'rejected', label: '거부됨' },
];

export default function Admin() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [auctions, setAuctions] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);
  const globeSyncRef = React.useRef({ y: 0 });

  // Auth guard
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/login');
    }
  }, [authLoading, user, isAdmin, navigate]);

  // Fetch + realtime
  useEffect(() => {
    if (!isAdmin) return;

    const fetchAuctions = async () => {
      const { data } = await supabase
        .from('auctions')
        .select('*, profiles(nickname, email)')
        .order('created_at', { ascending: false });
      setAuctions(data ?? []);
      setDataLoading(false);
    };

    fetchAuctions();

    const channel = supabase
      .channel('admin-auctions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auctions' }, () => {
        fetchAuctions();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [isAdmin]);

  const updateStatus = async (id, status) => {
    setActionLoading(id + status);
    const update = { status };
    if (status === 'live') {
      // Find the duration_hours of this auction
      const auction = auctions.find(a => a.id === id);
      const hours = auction?.duration_hours ?? 24;
      update.ends_at = new Date(Date.now() + hours * 3600 * 1000).toISOString();
    }
    const { error } = await supabase.from('auctions').update(update).eq('id', id);
    if (!error) {
      setAuctions(prev => prev.map(a => a.id === id ? { ...a, ...update } : a));
    }
    setActionLoading(null);
  };

  const stats = {
    pending:  auctions.filter(a => a.status === 'pending').length,
    live:     auctions.filter(a => a.status === 'live').length,
    ended:    auctions.filter(a => a.status === 'ended').length,
    rejected: auctions.filter(a => a.status === 'rejected').length,
  };

  const filtered = filterTab === 'all' ? auctions : auctions.filter(a => a.status === filterTab);

  if (authLoading) return null;

  const inputStyle = {
    fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.4)',
    padding: '3px 10px', borderRadius: 6, border: 'none',
    cursor: 'pointer', transition: 'all 0.2s', background: 'transparent',
  };

  return (
    <div style={{ height: '100vh', width: '100vw', overflow: 'hidden', position: 'relative', background: 'transparent' }}>
      <WarpBackground phase="station" />

      {/* Header */}
      <header style={{
        position: 'fixed', top: 0, width: '100%', zIndex: 300,
        background: '#ffffff',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
      }}>
        <div style={{ padding: '0 2rem', display: 'flex', alignItems: 'center', height: 56, gap: 20 }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 900, letterSpacing: 2, color: '#111', flexShrink: 0 }}>
              POCA<span style={{ color: '#7c3aed' }}>STATION</span>
            </div>
          </Link>
          <div style={{
            padding: '3px 10px', borderRadius: 6,
            background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)',
            fontSize: 10, fontWeight: 800, color: '#7c3aed', letterSpacing: 1,
          }}>
            ADMIN
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,60,60,0.06)', border: '1px solid rgba(255,60,60,0.15)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#e03030', display: 'inline-block', boxShadow: '0 0 5px rgba(220,50,50,0.5)' }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#c02020', letterSpacing: 0.5 }}>LIVE {stats.live}건</span>
            </div>
            <Link to="/" style={{ padding: '6px 16px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)', background: 'transparent', color: 'rgba(0,0,0,0.6)', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>← 스테이션</Link>
          </div>
        </div>
      </header>

      {/* Globe background */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 5,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{ width: 'min(78vh, 78vw)', height: 'min(78vh, 78vw)' }}>
          <GlobeStation onSectorSelect={() => {}} noMenu syncRef={globeSyncRef} master />
        </div>
      </div>

      {/* Main layout */}
      <main style={{
        position: 'fixed',
        inset: `calc(56px + clamp(10px, 2vmin, 20px)) clamp(10px, 2vmin, 20px) clamp(10px, 2vmin, 20px) clamp(10px, 2vmin, 20px)`,
        display: 'flex',
        borderRadius: 'clamp(14px, 2vmin, 20px)',
        overflow: 'hidden',
        zIndex: 10,
        boxShadow: '0 8px 48px rgba(0,0,0,0.18)',
      }}>

        {/* Left Sidebar */}
        <aside style={{
          width: 240,
          flexShrink: 0,
          borderRight: '1px solid rgba(0,0,0,0.06)',
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 0',
          overflowY: 'auto',
        }}>
          {/* Mini Globe */}
          <div style={{ width: '100%', height: 180, flexShrink: 0, position: 'relative' }}>
            <GlobeStation onSectorSelect={() => {}} compact syncRef={globeSyncRef} />
          </div>
          <div style={{ margin: '0 14px 8px', height: 1, background: 'rgba(0,0,0,0.06)' }} />

          {/* Filter nav */}
          <div style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(0,0,0,0.25)', letterSpacing: 2, fontFamily: 'monospace', marginBottom: 8, paddingLeft: 12 }}>FILTER</div>
            {FILTER_TABS.map(tab => (
              <button key={tab.id} onClick={() => setFilterTab(tab.id)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: filterTab === tab.id ? 'rgba(0,0,0,0.06)' : 'transparent',
                textAlign: 'left', transition: 'all 0.2s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: filterTab === tab.id ? '#111' : 'rgba(0,0,0,0.15)' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: filterTab === tab.id ? '#111' : 'rgba(0,0,0,0.4)' }}>{tab.label}</span>
                </div>
                {tab.id !== 'all' && stats[tab.id] > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 800, padding: '1px 7px', borderRadius: 10,
                    background: tab.id === 'pending' ? 'rgba(255,150,0,0.1)' : tab.id === 'live' ? 'rgba(0,180,80,0.1)' : 'rgba(0,0,0,0.06)',
                    color: tab.id === 'pending' ? '#b07700' : tab.id === 'live' ? '#006d30' : 'rgba(0,0,0,0.4)',
                  }}>{stats[tab.id]}</span>
                )}
              </button>
            ))}
          </div>

          {/* Stats */}
          <div style={{ marginTop: 'auto', padding: '14px 16px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(0,0,0,0.3)', letterSpacing: 2, fontFamily: 'monospace', marginBottom: 10 }}>SUMMARY</div>
            {[
              { label: '승인 대기', val: stats.pending, color: '#b07700' },
              { label: '진행 중',   val: stats.live,    color: '#006d30' },
              { label: '종료',     val: stats.ended,   color: 'rgba(0,0,0,0.4)' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)' }}>{s.label}</span>
                <span style={{ fontSize: 14, fontWeight: 900, color: s.color, fontFamily: 'monospace' }}>{s.val}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'rgba(255,255,255,0.82)' }}>

          {/* Topbar */}
          <div style={{ padding: '10px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 900, color: '#111' }}>경매 관리</span>
            <div style={{ display: 'flex', gap: 5, marginLeft: 'auto' }}>
              {FILTER_TABS.map(tab => (
                <button key={tab.id} onClick={() => setFilterTab(tab.id)} style={{
                  ...inputStyle,
                  background: filterTab === tab.id ? 'rgba(0,0,0,0.06)' : 'transparent',
                  color: filterTab === tab.id ? '#111' : 'rgba(0,0,0,0.4)',
                  border: '1px solid ' + (filterTab === tab.id ? 'rgba(0,0,0,0.12)' : 'transparent'),
                }}>{tab.label}</button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
            {dataLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60%', color: 'rgba(0,0,0,0.25)', fontSize: 12, fontFamily: 'monospace', letterSpacing: 2 }}>
                LOADING...
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60%', color: 'rgba(0,0,0,0.2)', fontSize: 11, fontFamily: 'monospace', letterSpacing: 2 }}>
                NO ITEMS
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid rgba(0,0,0,0.07)' }}>
                      {['ID', '그룹/멤버', '앨범', '판매자', '시작가', '현재가', '입찰', '인증코드', '상태', '등록일', '액션'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'rgba(0,0,0,0.35)', letterSpacing: 1, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(a => {
                      const st = STATUS_COLORS[a.status] ?? STATUS_COLORS.ended;
                      const isActing = actionLoading?.startsWith(String(a.id));
                      return (
                        <tr key={a.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)', transition: 'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ padding: '10px 10px', fontFamily: 'monospace', fontSize: 11, color: 'rgba(0,0,0,0.35)' }}>#{String(a.id).padStart(4, '0')}</td>
                          <td style={{ padding: '10px 10px' }}>
                            <div style={{ fontWeight: 800, color: '#111', fontSize: 12 }}>{a.member}</div>
                            <div style={{ fontSize: 10, color: '#7c3aed', fontWeight: 700, letterSpacing: 1, fontFamily: 'monospace', marginTop: 1 }}>{a.group_name}</div>
                          </td>
                          <td style={{ padding: '10px 10px', color: 'rgba(0,0,0,0.45)', fontSize: 11 }}>{a.album ?? '—'}</td>
                          <td style={{ padding: '10px 10px', fontSize: 11, color: 'rgba(0,0,0,0.5)' }}>{a.profiles?.nickname ?? a.seller_name ?? '—'}</td>
                          <td style={{ padding: '10px 10px', fontFamily: 'monospace', fontSize: 12, color: '#111', fontWeight: 700 }}>₩{a.start_price?.toLocaleString()}</td>
                          <td style={{ padding: '10px 10px', fontFamily: 'monospace', fontSize: 12, color: a.current_price > a.start_price ? '#006d30' : '#111', fontWeight: 700 }}>₩{a.current_price?.toLocaleString()}</td>
                          <td style={{ padding: '10px 10px', fontSize: 11, color: 'rgba(0,0,0,0.5)', textAlign: 'center' }}>{a.bid_count}</td>
                          <td style={{ padding: '10px 10px' }}>
                            {a.verification_word ? (
                              <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 800, color: '#7c3aed', background: 'rgba(124,58,237,0.07)', padding: '3px 7px', borderRadius: 5, letterSpacing: 1 }}>{a.verification_word}</span>
                            ) : <span style={{ color: 'rgba(0,0,0,0.2)', fontSize: 10 }}>—</span>}
                          </td>
                          <td style={{ padding: '10px 10px' }}>
                            <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: st.bg, color: st.color, border: `1px solid ${st.border}`, whiteSpace: 'nowrap' }}>
                              {STATUS_LABELS[a.status] ?? a.status}
                            </span>
                          </td>
                          <td style={{ padding: '10px 10px', fontSize: 10, color: 'rgba(0,0,0,0.35)', whiteSpace: 'nowrap' }}>
                            {new Date(a.created_at).toLocaleDateString('ko-KR')}
                          </td>
                          <td style={{ padding: '10px 10px' }}>
                            <div style={{ display: 'flex', gap: 5 }}>
                              {a.status === 'pending' && (
                                <>
                                  <button
                                    disabled={isActing}
                                    onClick={() => updateStatus(a.id, 'live')}
                                    style={{ padding: '5px 10px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 800, cursor: isActing ? 'default' : 'pointer', background: '#111', color: '#fff', transition: 'opacity 0.2s', opacity: isActing ? 0.5 : 1 }}>
                                    승인
                                  </button>
                                  <button
                                    disabled={isActing}
                                    onClick={() => updateStatus(a.id, 'rejected')}
                                    style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(220,50,50,0.3)', fontSize: 11, fontWeight: 800, cursor: isActing ? 'default' : 'pointer', background: 'rgba(220,50,50,0.06)', color: '#b02020', transition: 'opacity 0.2s', opacity: isActing ? 0.5 : 1 }}>
                                    거부
                                  </button>
                                </>
                              )}
                              {a.status === 'live' && (
                                <button
                                  disabled={isActing}
                                  onClick={() => updateStatus(a.id, 'ended')}
                                  style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.15)', fontSize: 11, fontWeight: 700, cursor: isActing ? 'default' : 'pointer', background: 'transparent', color: 'rgba(0,0,0,0.5)', transition: 'opacity 0.2s', opacity: isActing ? 0.5 : 1 }}>
                                  강제종료
                                </button>
                              )}
                              {(a.status === 'ended' || a.status === 'rejected') && (
                                <span style={{ fontSize: 10, color: 'rgba(0,0,0,0.25)', fontFamily: 'monospace' }}>—</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
