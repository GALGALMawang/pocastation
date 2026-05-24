import React from 'react';

function Footer() {
  return (
    <footer className="ftr"><div className="pg">
      <div className="ftr-grid">
        <div><div className="ftr-br"><div className="ftr-bri">★</div>POCA</div><p className="ftr-desc">K-pop 포토카드·굿즈 전문 경매 플랫폼.</p></div>
        <div className="ftr-col"><h4>서비스</h4><a href="#" className="ftr-lk">경매 참여</a><a href="#" className="ftr-lk">판매 등록</a></div>
        <div className="ftr-col"><h4>고객지원</h4><a href="#" className="ftr-lk">1:1 문의</a><a href="#" className="ftr-lk">공지사항</a></div>
        <div className="ftr-col"><h4>정책</h4><a href="#" className="ftr-lk">이용약관</a><a href="#" className="ftr-lk">개인정보처리방침</a></div>
      </div>
      <div className="ftr-btm">
        <span>© 2026 POCA. All rights reserved.</span>
      </div>
    </div></footer>
  );
}

export default Footer;
