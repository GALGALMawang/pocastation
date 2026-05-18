/**
 * ends_at (ISO string) → "N시간 M분" 또는 "마감임박" 또는 "종료"
 */
export function formatTimeLeft(endsAt) {
  if (!endsAt) return '';
  const diff = new Date(endsAt) - Date.now();
  if (diff <= 0) return '종료';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h === 0 && m < 30) return `${m}분`;
  if (h < 1) return `${m}분`;
  return `${h}시간 ${m}분`;
}

export function isEndingSoon(endsAt) {
  if (!endsAt) return false;
  return new Date(endsAt) - Date.now() < 30 * 60 * 1000; // 30분 미만
}
