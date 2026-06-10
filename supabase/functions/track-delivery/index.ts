/**
 * track-delivery Edge Function
 *
 * tracker.delivery 배송 조회를 서버 측에서 대행한다.
 * Client Secret 이 브라우저 번들에 노출되지 않도록, OAuth 토큰 발급과
 * GraphQL 조회를 모두 이 함수 안에서 처리한다.
 *
 * 로그인한 유저만 호출 가능(Authorization 헤더의 Supabase JWT 검증).
 *
 * Request body: { carrierId: string, trackId: string }
 * Response:      { track: object | null }
 *
 * 환경변수 (Supabase Dashboard → Edge Functions → Secrets):
 *   TRACKER_CLIENT_ID, TRACKER_CLIENT_SECRET
 *   SUPABASE_URL, SUPABASE_ANON_KEY  - 런타임 기본 제공
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TOKEN_URL = 'https://auth.tracker.delivery/oauth2/token';
const GQL_URL   = 'https://apis.tracker.delivery/graphql';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

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

async function getAccessToken(): Promise<string | null> {
  const clientId     = Deno.env.get('TRACKER_CLIENT_ID');
  const clientSecret = Deno.env.get('TRACKER_CLIENT_SECRET');
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
  return json.access_token ?? null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  try {
    // 로그인 유저만 허용
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ track: null, message: '로그인이 필요합니다.' }, 401);
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ track: null, message: '인증에 실패했습니다.' }, 401);

    const { carrierId, trackId } = await req.json();
    if (!carrierId || !trackId) return json({ track: null, message: '필수 파라미터 누락' }, 400);

    const token = await getAccessToken();
    if (!token) return json({ track: null, message: '배송 조회 인증 실패' }, 500);

    const res = await fetch(GQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ query: TRACK_QUERY, variables: { carrierId, trackId } }),
    });
    const result = await res.json();
    return json({ track: result?.data?.track ?? null });

  } catch (e) {
    return json({ track: null, message: e.message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
