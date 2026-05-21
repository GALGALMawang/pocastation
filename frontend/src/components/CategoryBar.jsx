import React from 'react';

function CategoryBar() {
  const categories = ['🌟 전체', '🃏 포토카드', '💿 앨범', '🎀 슬로건', '🔮 키링', '🖼 포스터', '✨ 팬메이드', '🛍 공식굿즈'];
  
  return (
    <div className="cat-bar"><div className="pg"><div className="cat-in">
      {categories.map((cat, i) => (
        <button key={i} className={`cat-tb ${i === 0 ? 'on' : ''}`}>
          {cat}
        </button>
      ))}
    </div></div></div>
  );
}

export default CategoryBar;
