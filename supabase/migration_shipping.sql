-- =============================================
-- 배송 정보 마이그레이션
-- Supabase SQL Editor에서 실행하세요
-- =============================================

-- ── 1. settlements에 배송 컬럼 추가 ──────────────────────────
ALTER TABLE public.settlements
  ADD COLUMN IF NOT EXISTS shipping_address TEXT,    -- 구매자 배송지
  ADD COLUMN IF NOT EXISTS carrier          TEXT,    -- 택배사 ID (kr.cjlogistics 등)
  ADD COLUMN IF NOT EXISTS tracking_number  TEXT,    -- 운송장 번호
  ADD COLUMN IF NOT EXISTS shipped_at       TIMESTAMPTZ; -- 발송 처리 시각

-- ── 2. 판매자가 운송장 번호 입력할 수 있도록 UPDATE 정책 추가 ─
CREATE POLICY "판매자 운송장 입력" ON public.settlements
  FOR UPDATE USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

-- ── 3. 구매자가 자기 배송지 주소 업데이트 가능하도록 정책 추가 ─
CREATE POLICY "구매자 배송지 입력" ON public.settlements
  FOR UPDATE USING (buyer_id = auth.uid())
  WITH CHECK (buyer_id = auth.uid());
