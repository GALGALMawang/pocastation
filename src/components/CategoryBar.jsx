import React from 'react';

const CATEGORIES = ['🌟 전체', '🃏 포토카드', '💿 앨범', '🎀 슬로건', '🔮 키링', '🖼 포스터', '✨ 팬메이드', '🛍 공식굿즈'];

function CategoryBar({ active, onSelect }) {
  return (
    <div className="cat-bar"><div className="pg"><div className="cat-in">
      {CATEGORIES.map((cat) => (
        <button key={cat} className={`cat-tb ${active === cat ? 'on' : ''}`} onClick={() => onSelect(cat)}>
          {cat}
        </button>
      ))}
    </div></div></div>
  );
}

export default CategoryBar;
