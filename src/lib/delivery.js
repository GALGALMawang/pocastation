/**
 * delivery.js — 배송 조회 클라이언트 래퍼
 *
 * 실제 tracker.delivery API 호출(OAuth 토큰 발급 + GraphQL 조회)은
 * track-delivery Edge Function이 서버 측에서 처리한다. Client Secret 을
 * 브라우저 번들에 노출하지 않기 위함이다.
 */
import { supabase } from './supabase';

export const CARRIERS = [
  { id: 'kr.cjlogistics', name: 'CJ대한통운' },
  { id: 'kr.lotte',       name: '롯데택배'   },
  { id: 'kr.epost',       name: '우체국택배' },
  { id: 'kr.hanjin',      name: '한진택배'   },
  { id: 'kr.logen',       name: '로젠택배'   },
  { id: 'kr.kdexp',       name: '경동택배'   },
];

// 상태 코드 → 한글
export const STATUS_KO = {
  INFORMATION_RECEIVED: '접수 완료',
  AT_PICKUP:            '수거 중',
  IN_TRANSIT:           '배송 중',
  OUT_FOR_DELIVERY:     '배달 출발',
  ATTEMPT_FAIL:         '배달 실패',
  DELIVERED:            '배달 완료',
  AVAILABLE_FOR_PICKUP: '보관 중',
  EXCEPTION:            '예외 처리',
};

/**
 * 배송 현황 조회 (track-delivery Edge Function 경유)
 * @param {string} carrierId - e.g. 'kr.cjlogistics'
 * @param {string} trackId   - 운송장 번호
 * @returns {{ lastEvent, events } | null}
 */
export async function fetchTracking(carrierId, trackId) {
  const { data: { session } } = await supabase.auth.getSession();

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-delivery`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token ?? ''}`,
      },
      body: JSON.stringify({ carrierId, trackId }),
    },
  );
  const json = await res.json();
  return json?.track ?? null;
}
