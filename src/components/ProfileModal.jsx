/**
 * ProfileModal.jsx — 프로필 설정 모달
 *
 * 유저가 저장하는 정보:
 *   phone        - 카카오 알림톡 수신용 전화번호
 *   bank_account - 판매자 정산 계좌 (은행명 + 계좌번호 + 예금주)
 *
 * Props:
 *   user       - Supabase 유저 객체
 *   onClose    - 모달 닫기
 *   fetchExtra - 저장 후 상위 컴포넌트의 프로필 재조회 콜백
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

function ProfileModal({ user, onClose, fetchExtra }) {
  const [phone,   setPhone]   = useState('');
  const [bank,    setBank]    = useState('');
  const [loading, setLoading] = useState(false);

  // 기존 프로필 데이터 로드
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('profiles').select('*').eq('id', user.id).single();
      if (data) {
        setPhone(data.phone        || '');
        setBank(data.bank_account  || '');
      }
    };
    load();
  }, [user]);

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ phone, bank_account: bank })
      .eq('id', user.id);
    setLoading(false);
    if (error) {
      alert(error.message);
    } else {
      alert('설정이 저장되었습니다.');
      fetchExtra();
      onClose();
    }
  };

  return (
    <div className="mod-wrap open">
      <div className="mod-ov">
        <div className="modal" style={{maxWidth:'400px'}}>
          <div className="mod-hd">
            <div className="mod-ttl">내 프로필 & 알림 설정</div>
            <button className="mod-cl" onClick={onClose}>×</button>
          </div>
          <div className="mod-body">
            <div className="form-grp">
              <label>전화번호 (카카오 알림톡용)</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="010-0000-0000"
              />
            </div>
            <div className="form-grp">
              <label>정산 계좌 정보 (판매자용)</label>
              <input
                type="text"
                value={bank}
                onChange={e => setBank(e.target.value)}
                placeholder="은행명 계좌번호 예금주"
              />
            </div>
            <button className="bid-btn df" onClick={handleSave} disabled={loading}>
              {loading ? '저장 중...' : '설정 저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileModal;
