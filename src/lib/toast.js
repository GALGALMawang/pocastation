/**
 * toast — 화면 하단에 잠깐 떴다 사라지는 알림. 네이티브 alert() 대체.
 * 전역 .toast 스타일(styles/global.css)을 사용하며, 별도 Provider가 필요 없다.
 *
 * @param {string} message - 표시할 문구
 * @param {'ok'|'err'} [type='ok'] - 성공(ok)/오류(err) 색상
 */
export function toast(message, type = 'ok') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  document.body.appendChild(el);

  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 320);
  }, 2600);
}
