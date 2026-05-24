import React from 'react';
import { supabase } from '../lib/supabase';

function AuthModal({ onClose }) {
  const loginWith = async (provider) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin }
    });
    if (error) alert(error.message);
  };

  return (
    <div className="auth-ov open">
      <div className="auth-box">
        <button className="auth-close" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <div className="auth-logo"><div className="auth-logo-i">★</div><div className="auth-logo-nm">POCA</div></div>
        <h2 className="auth-ttl">간편 로그인</h2>
        <p className="auth-sub">소셜 계정으로 바로 시작하세요</p>
        <button className="soc-btn kakao-btn" onClick={() => loginWith('kakao')}>
          <span className="soc-lbl">카카오로 시작하기</span>
        </button>
        <button className="soc-btn google-btn" onClick={() => loginWith('google')}>
          <span className="soc-lbl">Google로 시작하기</span>
        </button>
      </div>
    </div>
  );
}

export default AuthModal;
