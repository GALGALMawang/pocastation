import React from 'react';

function PaymentModal({ onClose }) {
  return (
    <div className="mod-wrap open"><div className="mod-ov"><div className="modal" style={{maxWidth:'460px'}}>
      <div className="mod-hd"><div className="mod-ttl">낙찰 물품 결제</div><button className="mod-cl" onClick={onClose}>×</button></div>
      <div className="mod-body">
        <p style={{textAlign:'center', padding:'20px'}}>준비 중인 기능입니다.</p>
      </div>
    </div></div></div>
  );
}

export default PaymentModal;
