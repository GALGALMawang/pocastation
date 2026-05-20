import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { hmac } from 'https://esm.sh/@noble/hashes@1.3.3/hmac';
import { sha256 } from 'https://esm.sh/@noble/hashes@1.3.3/sha256';

const SOLAPI_API_KEY    = Deno.env.get('SOLAPI_API_KEY')    ?? '';
const SOLAPI_API_SECRET = Deno.env.get('SOLAPI_API_SECRET') ?? '';
const KAKAO_SENDER_KEY  = Deno.env.get('KAKAO_SENDER_KEY')  ?? ''; // 솔라피 발신 프로필 키
const KAKAO_PF_ID       = Deno.env.get('KAKAO_PF_ID')       ?? ''; // 카카오 채널 ID (@포카스테이션)
const SITE_URL          = Deno.env.get('SITE_URL')           ?? 'https://pocastation.vercel.app';

// 낙찰자/판매자 템플릿 코드 (솔라피에서 승인받은 후 교체)
const TEMPLATE_WINNER = Deno.env.get('KAKAO_TEMPLATE_WINNER') ?? '';
const TEMPLATE_SELLER = Deno.env.get('KAKAO_TEMPLATE_SELLER') ?? '';

// Solapi HMAC-SHA256 인증 헤더
function makeSolapiAuth(): string {
  const date = new Date().toISOString();
  const salt = Math.random().toString(36).slice(2, 18);
  const key = new TextEncoder().encode(SOLAPI_API_SECRET);
  const msg = new TextEncoder().encode(date + salt);
  const sig = Array.from(hmac(sha256, key, msg))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `HMAC-SHA256 apiKey=${SOLAPI_API_KEY}, date=${date}, salt=${salt}, signature=${sig}`;
}

async function sendAlimtalk(to: string, templateCode: string, variables: Record<string, string>): Promise<boolean> {
  const payload = {
    message: {
      to,
      from: KAKAO_SENDER_KEY,
      kakaoOptions: {
        pfId: KAKAO_PF_ID,
        templateCode,
        variables,
        buttons: [{ buttonType: 'WL', buttonName: '지금 확인하기', linkMo: SITE_URL, linkPc: SITE_URL }],
      },
    },
  };

  const res = await fetch('https://api.solapi.com/messages/v4/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': makeSolapiAuth(),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Solapi error:', err);
  }
  return res.ok;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' },
    });
  }

  const sb = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // 종료됐지만 알림 아직 안 보낸 경매
  const { data: auctions } = await sb
    .from('auctions')
    .select('id, group_name, member, current_price, winner_id, seller_id')
    .eq('status', 'ended')
    .is('kakao_notified_at', null)
    .limit(20);

  if (!auctions?.length) {
    return new Response(JSON.stringify({ sent: 0 }), { headers: { 'Content-Type': 'application/json' } });
  }

  let sent = 0;

  for (const auction of auctions) {
    const item = `${auction.group_name} ${auction.member} 포토카드`;
    const price = Number(auction.current_price).toLocaleString('ko-KR');

    // 낙찰자 알림
    if (auction.winner_id && TEMPLATE_WINNER) {
      const { data: winner } = await sb.from('profiles').select('phone').eq('id', auction.winner_id).single();
      if (winner?.phone) {
        const ok = await sendAlimtalk(winner.phone, TEMPLATE_WINNER, { 상품명: item, 낙찰가: price });
        if (ok) sent++;
      }
    }

    // 판매자 알림
    if (auction.seller_id && TEMPLATE_SELLER) {
      const { data: seller } = await sb.from('profiles').select('phone').eq('id', auction.seller_id).single();
      if (seller?.phone) {
        const ok = await sendAlimtalk(seller.phone, TEMPLATE_SELLER, { 상품명: item, 낙찰가: price });
        if (ok) sent++;
      }
    }

    await sb.from('auctions').update({ kakao_notified_at: new Date().toISOString() }).eq('id', auction.id);
  }

  return new Response(JSON.stringify({ sent }), { headers: { 'Content-Type': 'application/json' } });
});
