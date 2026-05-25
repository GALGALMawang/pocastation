-- =============================================
-- 경매 필드 추가 + handle_new_bid 트리거
-- Supabase SQL Editor에서 실행하세요
-- =============================================

-- ── 1. 새 컬럼 추가 ──────────────────────────────────────────
ALTER TABLE public.auctions
  ADD COLUMN IF NOT EXISTS gender    TEXT,      -- 남돌 / 여돌
  ADD COLUMN IF NOT EXISTS card_name TEXT;      -- 포카 이름 (버전명 등)


-- ── 2. handle_new_bid 트리거 ─────────────────────────────────
-- 새 입찰이 들어오면 auctions.current_price + bid_count 자동 갱신
CREATE OR REPLACE FUNCTION public.handle_new_bid()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.auctions
     SET current_price = NEW.amount,
         bid_count     = COALESCE(bid_count, 0) + 1
   WHERE id = NEW.auction_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 기존 트리거가 있으면 교체
DROP TRIGGER IF EXISTS on_new_bid ON public.bids;

CREATE TRIGGER on_new_bid
  AFTER INSERT ON public.bids
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_bid();
