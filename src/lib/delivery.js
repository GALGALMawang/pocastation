/**
 * delivery.js — tracker.delivery GraphQL API 래퍼
 *
 * 한국 주요 택배사 배송 현황 조회.
 * API 키는 .env.local에 VITE_TRACKER_API_KEY 로 설정.
 * https://tracker.delivery 에서 무료 발급 가능.
 */

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

const GQL_ENDPOINT = 'https://apis.tracker.delivery/graphql';

const TRACK_QUERY = `
  query Track($carrierId: ID!, $trackId: ID!) {
    track(carrierId: $carrierId, trackId: $trackId) {
      lastEvent {
        time
        status { code name }
        description
        location { name }
      }
      events(last: 10) {
        edges {
          node {
            time
            status { code name }
            description
            location { name }
          }
        }
      }
    }
  }
`;

/**
 * 배송 현황 조회
 * @param {string} carrierId - e.g. 'kr.cjlogistics'
 * @param {string} trackId   - 운송장 번호
 * @returns {{ lastEvent, events } | null}
 */
export async function fetchTracking(carrierId, trackId) {
  const apiKey = import.meta.env.VITE_TRACKER_API_KEY;
  if (!apiKey) return null;

  const res = await fetch(GQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query: TRACK_QUERY,
      variables: { carrierId, trackId },
    }),
  });

  const json = await res.json();
  return json?.data?.track ?? null;
}
