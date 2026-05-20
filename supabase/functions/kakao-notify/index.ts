import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const KAKAO_REFRESH_URL = 'https://kauth.kakao.com/oauth/token';
const KAKAO_MSG_URL = 'https://kapi.kakao.com/v2/api/talk/memo/default/send';
const KAKAO_REST_API_KEY = Deno.env.get('KAKAO_REST_API_KEY') ?? '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' } });
  }

  const sb = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // 방금 종료된 경매 조회 (ends_at이 지났고 status가 아직 ended가 아닌 것)
  const { data: ended } = await sb
    .from('auctions')
    .select('id, group_name, member, current_price, winner_id, seller_id')
    .eq('status', 'ended')
    .is('kakao_notified_at', null)
    .limit(20);

  if (!ended?.length) {
    return new Response(JSON.stringify({ sent: 0 }), { headers: { 'Content-Type': 'application/json' } });
  }

  let sent = 0;

  for (const auction of ended) {
    // 낙찰자 알림
    if (auction.winner_id) {
      const notified = await sendKakaoNotify(sb, auction.winner_id, {
        type: 'winner',
        group: auction.group_name,
        member: auction.member,
        price: auction.current_price,
        auctionId: auction.id,
      });
      if (notified) sent++;
    }

    // 판매자 알림
    if (auction.seller_id) {
      const notified = await sendKakaoNotify(sb, auction.seller_id, {
        type: 'seller',
        group: auction.group_name,
        member: auction.member,
        price: auction.current_price,
        auctionId: auction.id,
      });
      if (notified) sent++;
    }

    // 알림 발송 완료 표시
    await sb.from('auctions').update({ kakao_notified_at: new Date().toISOString() }).eq('id', auction.id);
  }

  return new Response(JSON.stringify({ sent }), { headers: { 'Content-Type': 'application/json' } });
});

async function sendKakaoNotify(
  sb: ReturnType<typeof createClient>,
  userId: string,
  info: { type: 'winner' | 'seller'; group: string; member: string; price: number; auctionId: string },
): Promise<boolean> {
  const { data: profile } = await sb
    .from('profiles')
    .select('kakao_access_token, kakao_refresh_token, kakao_token_expires_at')
    .eq('id', userId)
    .single();

  if (!profile?.kakao_access_token) return false;

  let token = profile.kakao_access_token;

  // 토큰 만료 시 갱신
  if (profile.kakao_token_expires_at && new Date(profile.kakao_token_expires_at) < new Date()) {
    if (!profile.kakao_refresh_token) return false;
    const refreshed = await refreshKakaoToken(profile.kakao_refresh_token);
    if (!refreshed) return false;
    token = refreshed.access_token;
    await sb.from('profiles').update({
      kakao_access_token: refreshed.access_token,
      kakao_token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      ...(refreshed.refresh_token ? { kakao_refresh_token: refreshed.refresh_token } : {}),
    }).eq('id', userId);
  }

  const title = info.type === 'winner' ? '🎉 낙찰을 축하드려요!' : '📦 경매가 종료됐어요!';
  const desc = info.type === 'winner'
    ? `${info.group} ${info.member} 포토카드를 ₩${info.price.toLocaleString()}에 낙찰받으셨어요.\n마이페이지에서 결제를 진행해 주세요.`
    : `${info.group} ${info.member} 포토카드 경매가 ₩${info.price.toLocaleString()}에 낙찰됐어요.\n마이페이지에서 정산을 확인해 주세요.`;

  const siteUrl = Deno.env.get('SITE_URL') ?? 'https://pocastation.vercel.app';

  const template = {
    object_type: 'text',
    text: `[POCASTATION]\n${title}\n\n${desc}`,
    link: {
      web_url: siteUrl,
      mobile_web_url: siteUrl,
    },
    button_title: '지금 확인하기',
  };

  const res = await fetch(KAKAO_MSG_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `template_object=${encodeURIComponent(JSON.stringify(template))}`,
  });

  return res.ok;
}

async function refreshKakaoToken(refreshToken: string) {
  const res = await fetch(KAKAO_REFRESH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=refresh_token&client_id=${KAKAO_REST_API_KEY}&refresh_token=${refreshToken}`,
  });
  if (!res.ok) return null;
  return res.json();
}
