import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import WarpBackground from '../components/WarpBackground';

export default function Login() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [form, setForm] = useState({ email: '', password: '', nickname: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [signupDone, setSignupDone] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
    // 성공 시 Google 페이지로 리다이렉트됨
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    let err;
    if (mode === 'login') {
      err = await signIn(form.email, form.password);
    } else {
      err = await signUp(form.email, form.password, form.nickname);
    }

    setLoading(false);
    if (err) {
      setError(err.message);
    } else if (mode === 'login') {
      navigate('/');
    } else {
      // 회원가입 성공 — 이메일 인증 안내
      setSignupDone(true);
    }
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    border: '1px solid rgba(0,0,0,0.1)', outline: 'none',
    fontSize: 13, background: '#fff', color: '#111',
    boxSizing: 'border-box', transition: 'border 0.2s',
  };

  return (
    <div style={{ height: '100vh', width: '100vw', overflow: 'hidden', position: 'relative' }}>
      <WarpBackground phase="station" />

      <div style={{
        position: 'fixed', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 10,
      }}>
        <div style={{
          width: '100%', maxWidth: 400,
          margin: '0 16px',
          background: '#ffffff',
          borderRadius: 20,
          boxShadow: '0 8px 48px rgba(0,0,0,0.18)',
          overflow: 'hidden',
        }}>
          {/* 헤더 */}
          <div style={{ padding: '28px 32px 0' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 900, letterSpacing: 2, color: '#111', marginBottom: 20 }}>
              POCA<span style={{ color: '#7c3aed' }}>STATION</span>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: '#111', margin: '0 0 4px' }}>
              {mode === 'login' ? '로그인' : '회원가입'}
            </h2>
            <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.35)', margin: 0 }}>
              {mode === 'login' ? '계정에 로그인하세요' : '새 계정을 만드세요'}
            </p>
          </div>

          {/* 회원가입 완료 — 이메일 인증 안내 */}
          {signupDone && (
            <div style={{ padding: '32px', textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 16 }}>📬</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#111', marginBottom: 8 }}>이메일을 확인하세요</div>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', lineHeight: 1.7, marginBottom: 24 }}>
                <strong>{form.email}</strong>으로<br />인증 메일을 발송했습니다.<br />메일의 링크를 클릭하면 로그인할 수 있습니다.
              </div>
              <button onClick={() => { setSignupDone(false); setMode('login'); }}
                style={{ padding: '10px 28px', borderRadius: 10, border: 'none', background: '#111', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
                로그인 화면으로
              </button>
            </div>
          )}

          {/* 폼 */}
          {!signupDone && <form onSubmit={handleSubmit} style={{ padding: '24px 32px 32px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {mode === 'signup' && (
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.45)', display: 'block', marginBottom: 5 }}>닉네임</label>
                <input style={inputStyle} placeholder="닉네임" value={form.nickname}
                  onChange={e => setForm(p => ({ ...p, nickname: e.target.value }))} required />
              </div>
            )}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.45)', display: 'block', marginBottom: 5 }}>이메일</label>
              <input style={inputStyle} type="email" placeholder="email@example.com" value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.45)', display: 'block', marginBottom: 5 }}>비밀번호</label>
              <input style={inputStyle} type="password" placeholder="••••••••" value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
            </div>

            {error && (
              <div style={{ fontSize: 12, color: '#e03030', background: 'rgba(220,50,50,0.06)', border: '1px solid rgba(220,50,50,0.15)', borderRadius: 8, padding: '8px 12px' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              padding: '12px', borderRadius: 10, border: 'none',
              background: loading ? 'rgba(0,0,0,0.3)' : '#111',
              color: '#fff', fontSize: 14, fontWeight: 800, cursor: loading ? 'default' : 'pointer',
              marginTop: 4, transition: 'opacity 0.2s',
            }}>
              {loading ? '처리 중...' : mode === 'login' ? '로그인' : '가입하기'}
            </button>

            <div style={{ height: 1, background: 'rgba(0,0,0,0.06)' }} />

            {/* 구분선 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.07)' }} />
              <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.3)', whiteSpace: 'nowrap' }}>또는</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.07)' }} />
            </div>

            {/* Google 로그인 */}
            <button
              type="button"
              disabled={googleLoading}
              onClick={handleGoogleSignIn}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                padding: '11px', borderRadius: 10,
                border: '1.5px solid rgba(0,0,0,0.12)',
                background: googleLoading ? 'rgba(0,0,0,0.04)' : '#fff',
                color: '#111', fontSize: 13, fontWeight: 700,
                cursor: googleLoading ? 'default' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {/* Google SVG 아이콘 */}
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {googleLoading ? '연결 중...' : 'Google로 계속하기'}
            </button>

            <button type="button" onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(''); }}
              style={{ background: 'none', border: 'none', fontSize: 12, color: 'rgba(0,0,0,0.4)', cursor: 'pointer' }}>
              {mode === 'login' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
            </button>
          </form>}
        </div>
      </div>
    </div>
  );
}
