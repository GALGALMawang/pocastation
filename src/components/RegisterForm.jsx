import React, { useState, useContext } from 'react';
import { AuthContext } from '../App';
import { supabase } from '../lib/supabase';
import { sha256File, pHashFile, hammingDistance, generateVerificationWord } from '../lib/imageHash';

const FIELD_STYLE = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid rgba(0,0,0,0.1)', outline: 'none',
  fontSize: 13, background: '#fff', color: '#111', boxSizing: 'border-box',
};

const INITIAL_FORM = { group: '', gender: '여돌', member: '', cardName: '', album: '', category: '포토카드', grade: 'A', price: '', buyNow: '', duration: '24', durationMode: '24', contact: '' };

export default function RegisterForm() {
  const { user, profile } = useContext(AuthContext);

  const [form, setForm]               = useState(INITIAL_FORM);
  const [file, setFile]               = useState(null);
  const [preview, setPreview]         = useState(null);
  const [hashStatus, setHashStatus]   = useState(null);
  const [verifyStatus, setVerifyStatus] = useState(null); // null | 'checking' | 'ok' | 'fail'
  const [dragOver, setDragOver]       = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [success, setSuccess]         = useState(false);
  const [verificationWord]            = useState(() => generateVerificationWord());

  const handleFile = async (f) => {
    if (!f || !f.type.startsWith('image/')) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setHashStatus('checking');
    setVerifyStatus('checking');

    // 중복 이미지 검사 + 손글씨 인증 코드 검증을 병렬 실행
    const [hashResult, verifyResult] = await Promise.allSettled([
      checkImageHash(f),
      verifyHandwriting(f),
    ]);

    if (hashResult.status === 'fulfilled') setHashStatus(hashResult.value);
    else setHashStatus('error');

    if (verifyResult.status === 'fulfilled') setVerifyStatus(verifyResult.value);
    else setVerifyStatus('fail');
  };

  const checkImageHash = async (f) => {
    const [sha, phash] = await Promise.all([sha256File(f), pHashFile(f)]);
    const { data: dupSha } = await supabase.rpc('check_img_sha256', { hash: sha });
    if (dupSha) return 'dup_sha';
    const { data: phashes } = await supabase.rpc('get_all_phashes');
    if (phashes?.some(row => hammingDistance(row.img_phash, phash) <= 10)) return 'dup_phash';
    return 'ok';
  };

  const verifyHandwriting = async (f) => {
    const base64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(f);
    });

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-image`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType: f.type, verificationWord }),
      }
    );
    const json = await res.json();
    return json.matched ? 'ok' : 'fail';
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!file || hashStatus !== 'ok' || !form.group || !form.member || !form.price || !form.contact) return;
    setSubmitting(true);
    try {
      const [sha, phash] = await Promise.all([sha256File(file), pHashFile(file)]);
      const ext = file.name.split('.').pop();
      const path = `auctions/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('auction-images').upload(path, file);
      if (uploadErr) throw uploadErr;
      const { data: { publicUrl } } = supabase.storage.from('auction-images').getPublicUrl(path);
      const { error: insertErr } = await supabase.from('auctions').insert({
        seller_id:        user.id,
        seller_name:      profile?.nickname ?? user.email,
        group_name:       form.group,
        gender:           form.gender,
        member:           form.member,
        card_name:        form.cardName,
        album:            form.album,
        category:         form.category,
        grade:            form.grade,
        img_url:          publicUrl,
        status:           'pending',
        start_price:      parseInt(form.price),
        current_price:    parseInt(form.price),
        duration_hours:   parseInt(form.duration),
        buy_now_price:    form.buyNow ? parseInt(form.buyNow) : null,
        verification_word: verificationWord,
        img_sha256:       sha,
        img_phash:        phash,
        seller_contact:   form.contact,
      });
      if (insertErr) throw insertErr;
      setSuccess(true);
    } catch (e) {
      alert('등록 실패: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setSuccess(false); setFile(null); setPreview(null);
    setHashStatus(null); setVerifyStatus(null); setForm(INITIAL_FORM);
  };

  const buyNowInvalid = form.buyNow && form.price && parseInt(form.buyNow) <= parseInt(form.price);
  // verifyStatus는 참고용 — 실패해도 등록 가능 (관리자가 이미지 보고 최종 판단)
  const canSubmit = hashStatus === 'ok' && form.group && form.member && form.price && form.contact && !submitting && !buyNowInvalid;

  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 18, fontWeight: 900, color: '#111', marginBottom: 8 }}>등록 신청 완료</div>
        <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', marginBottom: 28 }}>관리자 승인 후 경매가 시작됩니다.</div>
        <button onClick={reset} style={{ padding: '10px 28px', borderRadius: 10, border: 'none', background: '#111', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>다시 등록</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>

      {/* 인증 코드 */}
      <div style={{ marginBottom: 20, padding: '14px 18px', borderRadius: 12, background: 'rgba(124,58,237,0.04)', border: '1.5px solid rgba(124,58,237,0.15)' }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: '#7c3aed', letterSpacing: 2, marginBottom: 6 }}>VERIFICATION CODE</div>
        <div style={{ fontSize: 26, fontWeight: 900, fontFamily: 'monospace', color: '#111', letterSpacing: 4, marginBottom: 6 }}>{verificationWord}</div>
        <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', lineHeight: 1.6 }}>위 코드를 손으로 써서 포카와 함께 사진 찍어 업로드하세요.</div>
      </div>

      {/* 이미지 업로드 */}
      <input id="sell-file-input" type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); }} />

      <div
        onClick={() => document.getElementById('sell-file-input').click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
        style={{
          border: `2px dashed ${
            dragOver ? '#111'
            : hashStatus === 'ok' ? 'rgba(0,180,80,0.4)'
            : (hashStatus === 'dup_sha' || hashStatus === 'dup_phash') ? 'rgba(220,50,50,0.4)'
            : 'rgba(0,0,0,0.12)'
          }`,
          borderRadius: 14, overflow: 'hidden',
          cursor: 'pointer', transition: 'all 0.2s',
          background: dragOver ? 'rgba(0,0,0,0.02)' : 'transparent',
        }}
      >
        {preview ? (
          <div style={{ position: 'relative' }}>
            <img src={preview} alt="preview" style={{ width: '100%', maxHeight: 280, objectFit: 'cover', display: 'block' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 14px', background: 'linear-gradient(transparent, rgba(0,0,0,0.65))', display: 'flex', alignItems: 'center', gap: 8 }}>
              {(hashStatus === 'checking' || verifyStatus === 'checking') && (
                <span style={{ fontSize: 11, color: '#fff' }}>검사 중...</span>
              )}
              {hashStatus === 'ok' && verifyStatus === 'ok' && (
                <span style={{ fontSize: 11, color: '#6aff9c', fontWeight: 700 }}>✓ 이미지 · 코드 확인됨</span>
              )}
              {hashStatus === 'ok' && verifyStatus === 'fail' && (
                <span style={{ fontSize: 11, color: '#ff8080', fontWeight: 700 }}>✗ 인증 코드가 보이지 않아요</span>
              )}
              {hashStatus === 'dup_sha'   && <span style={{ fontSize: 11, color: '#ff8080', fontWeight: 700 }}>✗ 이미 등록된 파일</span>}
              {hashStatus === 'dup_phash' && <span style={{ fontSize: 11, color: '#ff8080', fontWeight: 700 }}>✗ 유사 이미지 존재</span>}
              {hashStatus === 'error'     && <span style={{ fontSize: 11, color: '#ffcc80', fontWeight: 700 }}>검사 실패</span>}
              <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>클릭하면 변경</span>
            </div>
          </div>
        ) : (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'center' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 4 }}>인증 코드와 포카를 함께 찍어 업로드</div>
            <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.3)' }}>드래그 또는 클릭</div>
          </div>
        )}
      </div>

      {/* 사진 올린 후 폼 표시 */}
      {preview && (hashStatus === 'ok' || hashStatus === 'error') && verifyStatus !== 'checking' && (
        <div style={{ marginTop: 20 }}>

          {/* 그룹명 + 남돌/여돌 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.45)', display: 'block', marginBottom: 5 }}>그룹명 *</label>
              <input value={form.group} onChange={e => setForm(p => ({ ...p, group: e.target.value }))} placeholder="BTS, aespa..." style={FIELD_STYLE} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.45)', display: 'block', marginBottom: 5 }}>구분</label>
              <div style={{ display: 'flex', gap: 6, paddingTop: 2 }}>
                {['남돌', '여돌'].map(g => (
                  <button key={g} type="button"
                    onClick={() => setForm(p => ({ ...p, gender: g }))}
                    style={{
                      padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: '1.5px solid',
                      background: form.gender === g ? '#111' : '#fff',
                      color: form.gender === g ? '#fff' : 'rgba(0,0,0,0.5)',
                      borderColor: form.gender === g ? '#111' : 'rgba(0,0,0,0.12)',
                    }}>{g}</button>
                ))}
              </div>
            </div>
          </div>

          {/* 멤버 + 포카 이름 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.45)', display: 'block', marginBottom: 5 }}>멤버 *</label>
              <input value={form.member} onChange={e => setForm(p => ({ ...p, member: e.target.value }))} placeholder="정국, 카리나..." style={FIELD_STYLE} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.45)', display: 'block', marginBottom: 5 }}>포카 이름</label>
              <input value={form.cardName} onChange={e => setForm(p => ({ ...p, cardName: e.target.value }))} placeholder="Fade ver., 화보..." style={FIELD_STYLE} />
            </div>
          </div>

          {/* 앨범 */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.45)', display: 'block', marginBottom: 5 }}>앨범</label>
            <input value={form.album} onChange={e => setForm(p => ({ ...p, album: e.target.value }))} placeholder="Yet To Come..." style={FIELD_STYLE} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.45)', display: 'block', marginBottom: 5 }}>카테고리</label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={FIELD_STYLE}>
                {['포토카드','슬로건','키링','브로마이드','기타'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.45)', display: 'block', marginBottom: 5 }}>등급</label>
              <select value={form.grade} onChange={e => setForm(p => ({ ...p, grade: e.target.value }))} style={FIELD_STYLE}>
                {['S','A','B','C'].map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.45)', display: 'block', marginBottom: 5 }}>경매 시간</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[['1','1h'],['3','3h'],['6','6h'],['12','12h'],['24','1일'],['48','2일'],['72','3일'],['custom','직접']].map(([v, l]) => (
                  <button key={v} type="button"
                    onClick={() => setForm(p => ({ ...p, duration: v === 'custom' ? '' : v, durationMode: v }))}
                    style={{
                      padding: '5px 10px', borderRadius: 7, fontSize: 12, fontWeight: 700,
                      cursor: 'pointer', border: '1.5px solid',
                      background: (form.durationMode || '24') === v ? '#111' : '#fff',
                      color:      (form.durationMode || '24') === v ? '#fff' : 'rgba(0,0,0,0.5)',
                      borderColor:(form.durationMode || '24') === v ? '#111' : 'rgba(0,0,0,0.12)',
                    }}
                  >{l}</button>
                ))}
              </div>
              {form.durationMode === 'custom' && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="number" min="1" max="168"
                    value={form.duration}
                    onChange={e => setForm(p => ({ ...p, duration: e.target.value }))}
                    placeholder="시간 직접 입력"
                    style={{ ...FIELD_STYLE, width: 130 }}
                  />
                  <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)' }}>시간 (최대 168h)</span>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.45)', display: 'block', marginBottom: 5 }}>시작가 (₩) *</label>
              <input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="10000" style={FIELD_STYLE} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.45)', display: 'block', marginBottom: 5 }}>
                즉시 구매가 (₩)
                <span style={{ fontSize: 10, fontWeight: 500, color: 'rgba(0,0,0,0.3)', marginLeft: 4 }}>선택</span>
              </label>
              <input
                type="number"
                value={form.buyNow}
                onChange={e => setForm(p => ({ ...p, buyNow: e.target.value }))}
                placeholder="비워두면 미사용"
                style={FIELD_STYLE}
              />
              {form.buyNow && form.price && parseInt(form.buyNow) <= parseInt(form.price) && (
                <div style={{ fontSize: 10, color: '#c02020', marginTop: 4 }}>시작가보다 높아야 해요</div>
              )}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.45)', display: 'block', marginBottom: 5 }}>직거래 연락처 *</label>
            <input value={form.contact} onChange={e => setForm(p => ({ ...p, contact: e.target.value }))} placeholder="카카오ID 또는 전화번호" style={FIELD_STYLE} />
          </div>

          <button
            disabled={!canSubmit}
            onClick={handleSubmit}
            style={{
              width: '100%', padding: '13px', borderRadius: 10, border: 'none',
              background: canSubmit ? '#111' : 'rgba(0,0,0,0.12)',
              color: canSubmit ? '#fff' : 'rgba(0,0,0,0.3)',
              fontSize: 14, fontWeight: 800,
              cursor: canSubmit ? 'pointer' : 'default',
              transition: 'all 0.2s',
            }}
          >
            {submitting ? '등록 중...' : '경매 등록 신청'}
          </button>
        </div>
      )}
    </div>
  );
}
