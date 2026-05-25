-- =============================================
-- 즉시 구매 기능 마이그레이션
-- Supabase SQL Editor에서 실행하세요
-- =============================================

-- ── 1. auctions에 즉시 구매가 컬럼 추가 ─────────────────────
ALTER TABLE public.auctions
  ADD COLUMN IF NOT EXISTS buy_now_price INTEGER;  -- NULL이면 즉시 구매 미사용


-- ── 2. buy_now RPC ───────────────────────────────────────────
-- 즉시 구매: 크레딧 차감 + 경매 즉시 종료 + winner_id 설정
CREATE OR REPLACE FUNCTION public.buy_now(
  p_auction_id BIGINT,
  p_user_id    UUID,
  p_user_name  TEXT
) RETURNS JSON AS $$
DECLARE
  v_buy_now_price INTEGER;
  v_status        TEXT;
  v_ends_at       TIMESTAMPTZ;
  v_credit        INTEGER;
  v_prev_bidder_id UUID;
  v_prev_amount    INTEGER;
BEGIN
  -- 경매 상태 확인
  SELECT buy_now_price, status, ends_at
    INTO v_buy_now_price, v_status, v_ends_at
    FROM public.auctions
   WHERE id = p_auction_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', '경매를 찾을 수 없습니다.');
  END IF;

  IF v_status != 'live' THEN
    RETURN json_build_object('success', false, 'message', '진행 중인 경매가 아닙니다.');
  END IF;

  IF v_buy_now_price IS NULL THEN
    RETURN json_build_object('success', false, 'message', '즉시 구매가 설정되지 않은 경매입니다.');
  END IF;

  -- 크레딧 잔액 확인
  SELECT COALESCE(balance, 0)
    INTO v_credit
    FROM public.credits
   WHERE user_id = p_user_id;

  IF COALESCE(v_credit, 0) < v_buy_now_price THEN
    RETURN json_build_object('success', false, 'message', '크레딧 잔액이 부족합니다.');
  END IF;

  -- 기존 최고 입찰자에게 크레딧 환불
  SELECT bidder_id, amount
    INTO v_prev_bidder_id, v_prev_amount
    FROM public.bids
   WHERE auction_id = p_auction_id
   ORDER BY amount DESC
   LIMIT 1;

  IF v_prev_bidder_id IS NOT NULL AND v_prev_bidder_id != p_user_id THEN
    INSERT INTO public.credits (user_id, balance)
      VALUES (v_prev_bidder_id, v_prev_amount)
      ON CONFLICT (user_id)
      DO UPDATE SET balance = credits.balance + v_prev_amount, updated_at = now();
  END IF;

  -- 구매자 크레딧 차감
  INSERT INTO public.credits (user_id, balance)
    VALUES (p_user_id, -v_buy_now_price)
    ON CONFLICT (user_id)
    DO UPDATE SET balance = credits.balance - v_buy_now_price, updated_at = now();

  -- 입찰 기록 남기고 경매 즉시 종료
  INSERT INTO public.bids (auction_id, bidder_id, bidder_name, amount)
  VALUES (p_auction_id, p_user_id, p_user_name, v_buy_now_price);

  UPDATE public.auctions
     SET status        = 'ended',
         current_price = v_buy_now_price,
         winner_id     = p_user_id,
         ends_at       = now()
   WHERE id = p_auction_id;

  RETURN json_build_object('success', true, 'message', '즉시 구매 완료!');

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
