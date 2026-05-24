-- =============================================
-- 버그 수정 마이그레이션
-- Supabase SQL Editor에서 실행하세요
-- =============================================

-- ── 1. settlements.auction_id 타입 수정 ───────────────────────
-- auctions.id는 bigint(bigserial)인데 settlements.auction_id가 UUID로
-- 잘못 선언되어 FK 오류 발생. 테이블을 다시 만든다.
DROP TABLE IF EXISTS public.settlements;

CREATE TABLE public.settlements (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id       BIGINT  NOT NULL REFERENCES public.auctions(id),  -- bigint로 수정
  buyer_id         UUID    NOT NULL REFERENCES auth.users(id),
  seller_id        UUID    NOT NULL REFERENCES auth.users(id),
  method           TEXT    NOT NULL CHECK (method IN ('toss', 'direct')),
  amount           INTEGER NOT NULL,
  status           TEXT    NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'paid', 'shipped', 'completed', 'cancelled')),
  toss_order_id    TEXT,
  toss_payment_key TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "본인 정산 조회" ON public.settlements
  FOR SELECT USING (buyer_id = auth.uid() OR seller_id = auth.uid());

CREATE POLICY "낙찰자만 정산 생성" ON public.settlements
  FOR INSERT WITH CHECK (buyer_id = auth.uid());


-- ── 2. place_bid 크레딧 체크 수정 ─────────────────────────────
-- 기존 로직: credits row가 없으면 체크 통과 → 0원으로도 입찰 가능한 버그
-- 수정: row가 없으면 잔액 0으로 간주
CREATE OR REPLACE FUNCTION public.place_bid(
  p_auction_id BIGINT,
  p_user_id    UUID,
  p_user_name  TEXT,
  p_amount     INTEGER
) RETURNS JSON AS $$
DECLARE
  v_current_price INTEGER;
  v_status        TEXT;
  v_ends_at       TIMESTAMPTZ;
  v_credit        INTEGER;
BEGIN
  -- 경매 상태 확인 (동시성 보호를 위해 FOR UPDATE)
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

  -- 입찰 등록 (handle_new_bid 트리거가 current_price + bid_count 업데이트)
  INSERT INTO public.bids (auction_id, bidder_id, bidder_name, amount)
  VALUES (p_auction_id, p_user_id, p_user_name, p_amount);

  RETURN json_build_object('success', true, 'message', '입찰 완료!');

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ── 3. 종료된 경매 공개 조회 RLS 추가 ────────────────────────
-- 기존: ended 경매는 winner/seller만 조회 가능 → "종료된 경매" 탭 빈칸 버그
-- 수정: ended 경매는 누구나 조회 가능 (seller_contact 제외 — 별도 정책으로 관리)
CREATE POLICY "종료된 경매 공개 조회" ON public.auctions
  FOR SELECT USING (status = 'ended');


-- ── 4. winner_id, seller_contact 컬럼 확인 ───────────────────
-- migration_kakao_alimtalk.sql을 아직 실행하지 않은 경우를 위해 여기서도 추가
ALTER TABLE public.auctions
  ADD COLUMN IF NOT EXISTS winner_id       UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS kakao_notified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS seller_contact  TEXT;
