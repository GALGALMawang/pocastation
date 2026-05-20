-- 1. pg_cron 낙찰자 지정 포함하여 업데이트
SELECT cron.unschedule('expire-auctions');

SELECT cron.schedule(
  'expire-auctions',
  '* * * * *',
  $$
    UPDATE public.auctions a
    SET
      status    = 'ended',
      winner_id = (
        SELECT bidder_id FROM public.bids
        WHERE auction_id = a.id
        ORDER BY amount DESC
        LIMIT 1
      )
    WHERE status = 'live'
      AND ends_at IS NOT NULL
      AND ends_at < now();
  $$
);

-- 2. auctions에 판매자 연락처 컬럼 추가
ALTER TABLE public.auctions
  ADD COLUMN IF NOT EXISTS seller_contact TEXT; -- 직거래 연락처 (카카오ID or 전화)

-- 3. settlements 테이블 생성
CREATE TABLE IF NOT EXISTS public.settlements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id      UUID NOT NULL REFERENCES public.auctions(id),
  buyer_id        UUID NOT NULL REFERENCES auth.users(id),
  seller_id       UUID NOT NULL REFERENCES auth.users(id),
  method          TEXT NOT NULL CHECK (method IN ('toss', 'direct')),
  amount          INTEGER NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'paid', 'shipped', 'completed', 'cancelled')),
  toss_order_id   TEXT,
  toss_payment_key TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 4. RLS
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "본인 정산 조회" ON public.settlements
  FOR SELECT USING (buyer_id = auth.uid() OR seller_id = auth.uid());

CREATE POLICY "낙찰자만 정산 생성" ON public.settlements
  FOR INSERT WITH CHECK (buyer_id = auth.uid());

-- 5. 낙찰자만 판매자 연락처 조회 가능
CREATE POLICY "낙찰자 연락처 조회" ON public.auctions
  FOR SELECT USING (
    status != 'ended'
    OR winner_id = auth.uid()
    OR seller_id = auth.uid()
  );
