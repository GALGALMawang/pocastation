-- =============================================
-- 크레딧 입찰 연동 마이그레이션
-- 입찰 시 크레딧 차감, 이전 최고 입찰자 환불
-- Supabase SQL Editor에서 실행하세요
-- =============================================

CREATE OR REPLACE FUNCTION public.place_bid(
  p_auction_id BIGINT,
  p_user_id    UUID,
  p_user_name  TEXT,
  p_amount     INTEGER
) RETURNS JSON AS $$
DECLARE
  v_current_price   INTEGER;
  v_status          TEXT;
  v_ends_at         TIMESTAMPTZ;
  v_credit          INTEGER;
  v_prev_bidder_id  UUID;
  v_prev_amount     INTEGER;
BEGIN
  -- 경매 상태 확인 (동시성 보호)
  SELECT current_price, status, ends_at
    INTO v_current_price, v_status, v_ends_at
    FROM public.auctions
   WHERE id = p_auction_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', '경매를 찾을 수 없습니다.');
  END IF;

  IF v_status != 'live' THEN
    RETURN json_build_object('success', false, 'message', '진행 중인 경매가 아닙니다.');
  END IF;

  IF v_ends_at < now() THEN
    RETURN json_build_object('success', false, 'message', '이미 마감된 경매입니다.');
  END IF;

  IF p_amount <= v_current_price THEN
    RETURN json_build_object('success', false, 'message', '현재가보다 높은 금액을 입력해야 합니다.');
  END IF;

  -- 크레딧 잔액 확인 (row 없으면 0으로 간주)
  SELECT COALESCE(balance, 0)
    INTO v_credit
    FROM public.credits
   WHERE user_id = p_user_id;

  IF COALESCE(v_credit, 0) < p_amount THEN
    RETURN json_build_object('success', false, 'message', '크레딧 잔액이 부족합니다.');
  END IF;

  -- 현재 최고 입찰자 조회 (환불 대상)
  SELECT bidder_id, amount
    INTO v_prev_bidder_id, v_prev_amount
    FROM public.bids
   WHERE auction_id = p_auction_id
   ORDER BY amount DESC
   LIMIT 1;

  -- 이전 최고 입찰자가 있고 본인이 아닐 경우 → 크레딧 환불
  IF v_prev_bidder_id IS NOT NULL AND v_prev_bidder_id != p_user_id THEN
    INSERT INTO public.credits (user_id, balance)
      VALUES (v_prev_bidder_id, v_prev_amount)
      ON CONFLICT (user_id)
      DO UPDATE SET balance = credits.balance + v_prev_amount,
                    updated_at = now();
  END IF;

  -- 새 입찰자 크레딧 차감
  INSERT INTO public.credits (user_id, balance)
    VALUES (p_user_id, -p_amount)
    ON CONFLICT (user_id)
    DO UPDATE SET balance = credits.balance - p_amount,
                  updated_at = now();

  -- 입찰 등록 (handle_new_bid 트리거가 current_price + bid_count 업데이트)
  INSERT INTO public.bids (auction_id, bidder_id, bidder_name, amount)
  VALUES (p_auction_id, p_user_id, p_user_name, p_amount);

  RETURN json_build_object('success', true, 'message', '입찰 완료!');

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- credits 테이블에 updated_at 컬럼 없으면 추가
ALTER TABLE public.credits ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
