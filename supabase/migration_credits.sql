-- 1. 크레딧 잔액 테이블
CREATE TABLE IF NOT EXISTS public.credits (
  user_id  UUID PRIMARY KEY REFERENCES auth.users(id),
  balance  INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "본인 크레딧 조회" ON public.credits FOR SELECT USING (user_id = auth.uid());

-- 2. 크레딧 거래 내역
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  type          TEXT NOT NULL CHECK (type IN ('charge', 'bid_hold', 'bid_release', 'settle')),
  amount        INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  ref_id        TEXT,   -- 토스 orderId or 경매 id
  note          TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "본인 거래내역 조회" ON public.credit_transactions FOR SELECT USING (user_id = auth.uid());

-- 3. 크레딧 충전/차감 함수 (동시성 안전)
CREATE OR REPLACE FUNCTION public.adjust_credit(
  p_user_id   UUID,
  p_amount    INTEGER,   -- 양수: 충전, 음수: 차감
  p_type      TEXT,
  p_ref_id    TEXT DEFAULT NULL,
  p_note      TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  INSERT INTO public.credits (user_id, balance)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.credits
  SET balance = balance + p_amount, updated_at = now()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_balance;

  IF v_balance < 0 THEN
    RAISE EXCEPTION '잔액 부족';
  END IF;

  INSERT INTO public.credit_transactions (user_id, type, amount, balance_after, ref_id, note)
  VALUES (p_user_id, p_type, p_amount, v_balance, p_ref_id, p_note);

  RETURN v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
