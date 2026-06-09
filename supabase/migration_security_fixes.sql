-- =============================================
-- 보안 강화 마이그레이션
-- Supabase SQL Editor에서 실행하세요.
-- 반드시 기존 마이그레이션을 모두 적용한 뒤 마지막에 실행 (README.md 참고)
-- =============================================

-- ── 0. 사전 준비 ─────────────────────────────────────────────
-- HMAC 서명 검증에 pgcrypto 필요
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- verify_matched 위조 방지용 비밀키를 보관하는 테이블.
-- (Supabase SQL Editor는 ALTER DATABASE SET 권한이 없어 GUC 대신 테이블 사용)
-- RLS 활성화 + 정책 없음 → anon/authenticated 는 접근 불가.
-- 트리거(SECURITY DEFINER, 소유자 postgres)만 읽을 수 있다.
CREATE TABLE IF NOT EXISTS public.app_secrets (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;

-- 비밀키 등록. Supabase → Edge Functions → Secrets 의 VERIFY_SECRET 과 동일한 값이어야 한다.
INSERT INTO public.app_secrets (key, value)
VALUES ('verify_secret', '<SECRET>')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;


-- ── 1. place_bid: 본인 인증 검증 추가 ────────────────────────
-- 기존: 클라이언트가 보낸 p_user_id 를 그대로 신뢰 → 타인 명의 입찰 가능
-- 수정: p_user_id 가 호출자(auth.uid())와 일치할 때만 진행
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
  -- 호출자 본인 확인 (SECURITY DEFINER 함수 안에서도 auth.uid()는 호출자 JWT를 반영)
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN json_build_object('success', false, 'message', '로그인 정보가 일치하지 않습니다.');
  END IF;

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


-- ── 2. buy_now: 본인 인증 검증 추가 ──────────────────────────
CREATE OR REPLACE FUNCTION public.buy_now(
  p_auction_id BIGINT,
  p_user_id    UUID,
  p_user_name  TEXT
) RETURNS JSON AS $$
DECLARE
  v_buy_now_price  INTEGER;
  v_status         TEXT;
  v_ends_at        TIMESTAMPTZ;
  v_credit         INTEGER;
  v_prev_bidder_id UUID;
  v_prev_amount    INTEGER;
BEGIN
  -- 호출자 본인 확인
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN json_build_object('success', false, 'message', '로그인 정보가 일치하지 않습니다.');
  END IF;

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


-- ── 3. verify_matched 위조 방지 (HMAC 서명 검증) ─────────────
-- 기존: 클라이언트가 insert 시 verify_matched 를 직접 넣음 → true 위조 가능
-- 수정: analyze-image Edge Function이 발급한 HMAC 서명(verify_sig)이
--       (verification_word, verify_matched) 와 일치할 때만 verify_matched 유지.
--       서명이 없거나 불일치하면 강제로 false 로 떨어뜨린다.
-- verify_matched/verification_word 가 이전 마이그레이션에서 추가되지 않았을 수 있으므로
-- 여기서 함께 보장한다(IF NOT EXISTS — 이미 있으면 무시).
ALTER TABLE public.auctions
  ADD COLUMN IF NOT EXISTS verification_word TEXT,
  ADD COLUMN IF NOT EXISTS verify_matched    BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS verify_sig        TEXT;

-- SECURITY DEFINER: app_secrets(RLS 잠금)를 소유자 권한으로 읽기 위함.
-- search_path 고정: Supabase는 pgcrypto(hmac)를 extensions 스키마에,
-- 셀프호스트는 public 에 설치하므로 둘 다 포함시켜 함수 해석 실패를 막는다.
CREATE OR REPLACE FUNCTION public.enforce_verify_matched()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_secret   TEXT;
  v_expected TEXT;
BEGIN
  SELECT value INTO v_secret FROM public.app_secrets WHERE key = 'verify_secret';

  -- 비밀키 미설정 시 안전하게 false 처리
  IF v_secret IS NULL OR v_secret = '' OR v_secret = '<SECRET>' THEN
    NEW.verify_matched := false;
    RETURN NEW;
  END IF;

  -- Edge Function과 동일한 메시지 포맷: "<verification_word>:<matched>"
  v_expected := encode(
    hmac(
      COALESCE(NEW.verification_word, '') || ':' || lower(COALESCE(NEW.verify_matched, false)::text),
      v_secret, 'sha256'
    ),
    'hex'
  );

  IF NEW.verify_sig IS NULL OR NEW.verify_sig <> v_expected THEN
    NEW.verify_matched := false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_verify_matched ON public.auctions;
CREATE TRIGGER trg_enforce_verify_matched
  BEFORE INSERT OR UPDATE OF verify_matched, verify_sig ON public.auctions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_verify_matched();
