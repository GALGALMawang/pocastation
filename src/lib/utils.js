/**
 * 마감(ends_at)까지 남은 시간을 한글 문자열로 반환한다.
 * withSeconds 가 true면 시간 단위에서도 초까지 표시한다(상세 카운트다운용).
 *
 * @param {string} endsAt - ISO 시각 문자열
 * @param {{ withSeconds?: boolean }} [opts]
 * @returns {string|null} "1시간 5분", "3분 20초", "종료" 등. endsAt 없으면 null.
 */
export function getTimeLeft(endsAt, { withSeconds = false } = {}) {
  if (!endsAt) return null;
  const diff = new Date(endsAt) - new Date();
  if (diff <= 0) return '종료';

  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  if (h > 0) return withSeconds ? `${h}시간 ${m}분 ${s}초` : `${h}시간 ${m}분`;
  if (m > 0) return `${m}분 ${s}초`;
  return `${s}초`;
}

/**
 * 원화 금액 포맷. 예: 12000 → "₩12,000".
 */
export function formatKRW(n) {
  return `₩${(n || 0).toLocaleString('ko-KR')}`;
}
