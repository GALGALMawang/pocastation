/**
 * ProfileModal.jsx — 프로필 설정 모달
 *
 * 유저가 저장하는 정보:
 *   avatar_url   - 프로필 사진 (auction-images 버킷 avatars/ 경로)
 *   nickname     - 닉네임 (경매/입찰에 표시)
 *   address      - 기본 배송지 (낙찰 결제 시 자동 입력)
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
import { toast } from '../lib/toast';

function ProfileModal({ user, onClose, fetchExtra }) {
  const [avatarUrl, setAvatarUrl] = useState('');
  const [nickname,  setNickname]  = useState('');
  const [address,   setAddress]   = useState('');
  const [phone,     setPhone]     = useState('');
  const [bank,      setBank]      = useState('');
  const [loading,   setLoading]   = useState(false);
  const [uploading, setUploading] = useState(false);

  // 기존 프로필 데이터 로드
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('profiles').select('*').eq('id', user.id).single();
      if (data) {
        setAvatarUrl(data.avatar_url   || '');
        setNickname(data.nickname      || '');
        setAddress(data.address        || '');
        setPhone(data.phone            || '');
        setBank(data.bank_account      || '');
      }
    };
    load();
  }, [user]);

  // 프사 업로드 (auction-images 공개 버킷 재사용)
  const handleAvatar = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setUploading(true);
    try {
      const ext  = file.name.split('.').pop();
      const path = `avatars/${user.id}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('auction-images').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage
        .from('auction-images').getPublicUrl(path);
      setAvatarUrl(publicUrl);
    } catch (e) {
      toast('사진 업로드 실패: ' + e.message, 'err');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        avatar_url:   avatarUrl || null,
        nickname,
        address,
        phone,
        bank_account: bank,
      })
      .eq('id', user.id);
    setLoading(false);
    if (error) {
      toast(error.message, 'err');
    } else {
      toast('설정이 저장되었습니다.', 'ok');
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

            {/* 프로필 사진 */}
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:10, marginBottom:18}}>
              <input id="avatar-input" type="file" accept="image/*" style={{display:'none'}}
                onChange={e => { if (e.target.files[0]) handleAvatar(e.target.files[0]); }} />
              <div
                onClick={() => document.getElementById('avatar-input').click()}
                style={{
                  width:84, height:84, borderRadius:'50%', cursor:'pointer', overflow:'hidden',
                  background:'var(--bg)', border:'2px solid var(--bd)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:30, color:'var(--t3)', position:'relative',
                }}
              >
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar" style={{width:'100%', height:'100%', objectFit:'cover'}} />
                  : '👤'}
                {uploading && (
                  <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:11, fontWeight:700}}>
                    업로드 중
                  </div>
                )}
              </div>
              <button onClick={() => document.getElementById('avatar-input').click()}
                style={{fontSize:12, fontWeight:700, color:'var(--pr)', background:'none', border:'none', cursor:'pointer'}}>
                사진 {avatarUrl ? '변경' : '추가'}
              </button>
            </div>

            <div className="form-grp">
              <label>닉네임</label>
              <input
                type="text"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="경매에 표시될 이름"
              />
            </div>
            <div className="form-grp">
              <label>기본 배송지 (낙찰 시 자동 입력)</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="서울시 강남구 ... (우편번호 포함)"
              />
            </div>
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
            <button className="bid-btn df" onClick={handleSave} disabled={loading || uploading}>
              {loading ? '저장 중...' : '설정 저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileModal;
