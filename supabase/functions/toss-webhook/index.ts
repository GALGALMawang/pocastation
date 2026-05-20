import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TOSS_SECRET_KEY = Deno.env.get('TOSS_SECRET_KEY') ?? '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  const event = await req.json();

  // 가상계좌 입금 완료 이벤트만 처리
  if (event.eventType !== 'PAYMENT_STATUS_CHANGED') {
    return new Response('ok', { status: 200 });
  }

  const payment = event.data;
  if (payment.status !== 'DONE') {
    return new Response('ok', { status: 200 });
  }

  // orderId 형식: charge_{userId8}_{timestamp}
  if (!payment.orderId?.startsWith('charge_')) {
    return new Response('ok', { status: 200 });
  }

  const sb = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // 대기중 거래에서 userId 조회
  const { data: tx } = await sb
    .from('credit_transactions')
    .select('user_id, amount')
    .eq('ref_id', payment.orderId)
    .eq('type', 'charge')
    .single();

  if (!tx) {
    console.error('거래 내역 없음:', payment.orderId);
    return new Response('not found', { status: 404 });
  }

  // 크레딧 지급
  const { error } = await sb.rpc('adjust_credit', {
    p_user_id: tx.user_id,
    p_amount:  tx.amount,
    p_type:    'charge',
    p_ref_id:  payment.orderId,
    p_note:    `가상계좌 입금 완료 — ${payment.paymentKey}`,
  });

  if (error) {
    console.error('크레딧 지급 실패:', error);
    return new Response('error', { status: 500 });
  }

  // 중복 처리 방지: 대기중 거래 삭제
  await sb.from('credit_transactions')
    .delete()
    .eq('ref_id', payment.orderId)
    .eq('balance_after', 0);

  return new Response('ok', { status: 200 });
});
