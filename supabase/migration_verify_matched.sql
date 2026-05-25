-- verify_matched 컬럼 추가 (Gemini 손글씨 검증 결과)
ALTER TABLE public.auctions
  ADD COLUMN IF NOT EXISTS verify_matched BOOLEAN DEFAULT NULL;
-- NULL = Gemini 미실행, true = 일치, false = 불일치
