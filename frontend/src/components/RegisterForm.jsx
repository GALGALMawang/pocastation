import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { sha256File, pHashFile, hammingDistance, generateVerificationWord } from '../lib/imageHash';

const FIELD_STYLE = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid rgba(0,0,0,0.1)', outline: 'none',
  fontSize: 13, background: '#fff', color: '#111', boxSizing: 'border-box',
};

const INITIAL_FORM = { group: '', member: '', album: '', category: '포토카드', grade: 'A', price: '', duration: '24', contact: '' };

export default function RegisterForm() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [form, setForm]           = useState(INITIAL_FORM);
  const [file, setFile]           = useState(null);
  const [preview, setPreview]     = useState(null);
  const [hashStatus, setHashStatus] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed]   = useState(false);
  const [dragOver, setDragOver]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]     = useState(false);
  const [verificationWord]        = useState(() => generateVerificationWord());

  const analyzeWithGemini = async (f) => {
    setAnalyzing(true);
    try {
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
          body: JSON.stringify({ imageBase64: base64, mimeType: f.type }),
        }
      );
      const json = await res.json();
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const match = text.match(/\{[\s\S]*?\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        setForm(p => ({
          ...p,
          group:  parsed.group  || p.group,
          member: parsed.member || p.member,
          album:  parsed.album  || p.album,
        }));
      }
    } catch {}
    finally {
      setAnalyzing(false);
      setAnalyzed(true);
    }
  };

  const handleFile = async (f) => {
    if (!f || !f.type.startsWith('image/')) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setHashStatus('checking');
    setAnalyzed(false);

    analyzeWithGemini(f);

    try {
      const [sha, phash] = await Promise.all([sha256File(f), pHashFile(f)]);
      const { data: dupSha } = await supabase.rpc('check_img_sha256', { hash: sha });
      if (dupSha) { setHashStatus('dup_sha'); return; }
      const { data: phashes } = await supabase.rpc('get_all_phashes');
      if (phashes?.some(row => hammingDistance(row.img_phash, phash) <= 10)) {
        setHashStatus('dup_phash'); return;
      }
      setHashStatus('ok');
    } catch {
      setHashStatus('error');
    }
  };

  const handleSubmit = async () => {
    if (!user) { navigate('/login'); return; }
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
        seller_id: user.id,
        seller_name: profile?.nickname ?? user.email,
        group_name: form.group,
        member: form.member,
        album: form.album,
        category: form.category,
        grade: form.grade,
        img_url: publicUrl,
        status: 'pending',
        start_price: parseInt(form.price),
        current_price: parseInt(form.price),
        duration_hours: parseInt(form.duration),
        verification_word: verificationWord,
        img_sha256: sha,
        img_phash: phash,
        seller_contact: form.contact,
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
    setHashStatus(null); setAnalyzed(false); setForm(INITIAL_FORM);
  };

  const canSubmit = hashStatus === 'ok' && !analyzing && form.group && form.member && form.price && form.contact && !submitting;

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
          borderRadius: 14, marginBottom: preview ? 0 : 0, overflow: 'hidden',
          cursor: 'pointer', transition: 'all 0.2s',
          background: dragOver ? 'rgba(0,0,0,0.02)' : 'transparent',
        }}
      >
        {preview ? (
          <div style={{ position: 'relative' }}>
            <img src={preview} alt="preview" style={{ width: '100%', maxHeight: 280, objectFit: 'cover', display: 'block' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 14px', background: 'linear-gradient(transparent, rgba(0,0,0,0.65))', display: 'flex', alignItems: 'center', gap: 8 }}>
              {hashStatus === 'checking'  && <span style={{ fontSize: 11, color: '#fff' }}>검사 중...</span>}
              {hashStatus === 'ok'        && !analyzing && <span style={{ fontSize: 11, color: '#6aff9c', fontWeight: 700 }}>✓ 등록 가능</span>}
              {hashStatus === 'ok'        && analyzing  && <span style={{ fontSize: 11, color: '#ffe580', fontWeight: 700 }}>✦ AI 분석 중...</span>}
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
            <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 4 }}>사진 한 장으로 시작하기</div>
            <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.3)' }}>드래그 또는 클릭 · AI가 정보를 자동으로 채워드려요</div>
          </div>
        )}
      </div>

      {/* 사진 올린 후 폼 표시 */}
      {preview && (hashStatus === 'ok' || hashStatus === 'error') && (
        <div style={{
          marginTop: 20,
          opacity: analyzed || !analyzing ? 1 : 0.5,
          transition: 'opacity 0.4s',
          pointerEvents: analyzing ? 'none' : 'auto',
        }}>

          {analyzed && (
            <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>✦</span> AI가 정보를 채웠어요. 확인 후 수정하세요.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            {[
              { label: '그룹명 *', key: 'group',  placeholder: 'BTS, aespa...' },
              { label: '멤버 *',   key: 'member', placeholder: '정국, 카리나...' },
              { label: '앨범',     key: 'album',  placeholder: 'Yet To Come...' },
            ].map(f => (
              <div key={f.key} style={{ gridColumn: f.key === 'album' ? '1 / -1' : 'auto' }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.45)', display: 'block', marginBottom: 5 }}>{f.label}</label>
                <input value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={FIELD_STYLE} />
              </div>
            ))}
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
              <select value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} style={FIELD_STYLE}>
                {[['12','12시간'],['24','24시간'],['48','48시간'],['72','72시간']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.45)', display: 'block', marginBottom: 5 }}>시작가 (₩) *</label>
              <input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="10000" style={FIELD_STYLE} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.45)', display: 'block', marginBottom: 5 }}>직거래 연락처 *</label>
              <input value={form.contact} onChange={e => setForm(p => ({ ...p, contact: e.target.value }))} placeholder="카카오ID 또는 전화번호" style={FIELD_STYLE} />
            </div>
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
            {submitting ? '등록 중...' : analyzing ? 'AI 분석 중...' : '경매 등록 신청'}
          </button>
        </div>
      )}
    </div>
  );
}
