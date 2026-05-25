/**
 * delivery.js — tracker.delivery API 래퍼
 *
 * OAuth 2.0 Client Credentials 방식으로 access token을 발급받아
 * 한국 주요 택배사 배송 현황을 조회한다.
 *
 * 환경변수 (.env.local):
 *   VITE_TRACKER_CLIENT_ID     - tracker.delivery Client ID
 *   VITE_TRACKER_CLIENT_SECRET - tracker.delivery Client Secret
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

const TOKEN_URL = 'https://auth.tracker.delivery/oauth2/token';
const GQL_URL   = 'https://apis.tracker.delivery/graphql';

// access token 메모리 캐시 (탭 새로고침 전까지 재사용)
let _cachedToken    = null;
let _tokenExpiresAt = 0;

async function getAccessToken() {
  // 만료 30초 전에 재발급
  if (_cachedToken && Date.now() < _tokenExpiresAt - 30_000) {
    return _cachedToken;
  }

  const clientId     = import.meta.env.VITE_TRACKER_CLIENT_ID;
  const clientSecret = import.meta.env.VITE_TRACKER_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     clientId,
      client_secret: clientSecret,
    }),
  });

  const json = await res.json();
  if (!json.access_token) return null;

  _cachedToken    = json.access_token;
  _tokenExpiresAt = Date.now() + (json.expires_in ?? 3600) * 1000;
  return _cachedToken;
}

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
  const token = await getAccessToken();
  if (!token) return null;

  const res = await fetch(GQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      query:     TRACK_QUERY,
      variables: { carrierId, trackId },
    }),
  });

  const json = await res.json();
  return json?.data?.track ?? null;
}
