import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TOSS_SECRET_KEY = Deno.env.get('TOSS_SECRET_KEY') ?? '';
const SITE_URL        = Deno.env.get('SITE_URL') ?? 'https://pocastation.vercel.app';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' },
    });
  }

  // JWT로 유저 인증
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const sb = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
  const { data: { user }, error: authErr } = await sb.auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: '인증 필요' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const { amount } = await req.json(); // 충전 금액 (원)
  if (!amount || amount < 1000) {
    return new Response(JSON.stringify({ error: '최소 충전 금액은 1,000원입니다' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const orderId = `charge_${user.id.slice(0, 8)}_${Date.now()}`;

  // 토스 가상계좌 발급
  const tossRes = await fetch('https://api.tosspayments.com/v1/virtual-accounts', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(TOSS_SECRET_KEY + ':')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      method: 'VIRTUAL_ACCOUNT',
      amount,
      orderId,
      orderName: `POCASTATION 크레딧 ₩${amount.toLocaleString('ko-KR')} 충전`,
      customerName: user.email,
      bank: 'IBK',           // 기업은행 (변경 가능)
      validHours: 24,        // 24시간 유효
      successUrl: `${SITE_URL}?charge=success`,
      failUrl:    `${SITE_URL}?charge=fail`,
    }),
  });

  if (!tossRes.ok) {
    const err = await tossRes.json();
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const payment = await tossRes.json();

  // 대기중 거래 기록 (웹훅 수신 전 pending 상태로)
  const sbAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
  await sbAdmin.from('credit_transactions').insert({
    user_id: user.id,
    type: 'charge',
    amount,
    balance_after: 0, // 웹훅에서 업데이트
    ref_id: orderId,
    note: `가상계좌 입금 대기 — ${payment.virtualAccount?.accountNumber}`,
  });

  return new Response(JSON.stringify({
    accountNumber: payment.virtualAccount?.accountNumber,
    bank: payment.virtualAccount?.bankCode,
    bankName: payment.virtualAccount?.bank,
    dueDate: payment.virtualAccount?.dueDate,
    amount,
    orderId,
  }), { headers: { 'Content-Type': 'application/json' } });
});
