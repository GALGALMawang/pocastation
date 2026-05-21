import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

function CreateAuctionModal({ user, onClose }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ group: '', member: '', album: '', price: 10000 });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return alert('로그인이 필요합니다.');
    setLoading(true);

    const { error } = await supabase.from('auctions').insert({
      seller_id: user.id,
      group_name: form.group,
      member: form.member,
      album: form.album,
      category: '포토카드',
      grade: 'A',
      emoji: '✨',
      price: form.price,
      current_price: form.price,
      status: 'live',
      ends_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24시간 뒤
    });

    setLoading(false);
    if (error) alert('등록 실패: ' + error.message);
    else { alert('경매가 성공적으로 등록되었습니다!'); onClose(); }
  };

  return (
    <div className="mod-wrap open"><div className="mod-ov"><div className="modal" style={{maxWidth:'500px'}}>
      <div className="mod-hd"><div className="mod-ttl">판매 등록</div><button className="mod-cl" onClick={onClose}>×</button></div>
      <div className="mod-body">
        <form onSubmit={handleSubmit}>
          <div className="form-grp">
            <label>아티스트 (그룹명)</label>
            <input required value={form.group} onChange={e=>setForm({...form, group:e.target.value})} placeholder="예: BTS, aespa" />
          </div>
          <div className="form-grp">
            <label>멤버 이름</label>
            <input required value={form.member} onChange={e=>setForm({...form, member:e.target.value})} placeholder="예: 정국, 카리나" />
          </div>
          <div className="form-grp">
            <label>앨범/버전 명</label>
            <input required value={form.album} onChange={e=>setForm({...form, album:e.target.value})} placeholder="예: Proof 특전" />
          </div>
          <div className="form-grp">
            <label>시작 가격 (₩)</label>
            <input type="number" required min="1000" step="1000" value={form.price} onChange={e=>setForm({...form, price:parseInt(e.target.value)})} />
          </div>
          <button type="submit" className="bid-btn df" style={{marginTop:'20px'}} disabled={loading}>
            {loading ? '등록 중...' : '경매 시작하기'}
          </button>
        </form>
      </div>
    </div></div></div>
  );
}

export default CreateAuctionModal;
