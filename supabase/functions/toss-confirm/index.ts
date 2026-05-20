import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TOSS_SECRET_KEY = Deno.env.get('TOSS_SECRET_KEY') ?? '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' },
    });
  }

  const { paymentKey, orderId, amount } = await req.json();

  // 1. 토스 결제 승인 API 호출
  const tossRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(TOSS_SECRET_KEY + ':')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });

  if (!tossRes.ok) {
    const err = await tossRes.json();
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const payment = await tossRes.json();

  // 2. Supabase에 결제 결과 기록
  const sb = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // orderId 형식: settlement_{settlementId}
  const settlementId = orderId.replace('settlement_', '');
  await sb.from('settlements').update({
    status: 'paid',
    toss_payment_key: payment.paymentKey,
    updated_at: new Date().toISOString(),
  }).eq('id', settlementId);

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
});
