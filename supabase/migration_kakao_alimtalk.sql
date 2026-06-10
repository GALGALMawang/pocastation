-- 1. profiles에 전화번호 + 정산 계좌 컬럼 추가
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone        TEXT,
  ADD COLUMN IF NOT EXISTS bank_account TEXT;

-- 2. auctions에 낙찰자 + 알림 발송 여부 컬럼 추가
ALTER TABLE public.auctions
  ADD COLUMN IF NOT EXISTS winner_id         UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS kakao_notified_at TIMESTAMPTZ;

-- 3. pg_cron: 1분마다 kakao-alimtalk Edge Function 호출
-- ※ cron이 사용하는 supabase_url / service_role_key 등록 + 잡 스케줄은
--    migration_kakao_cron_fix.sql 에서 처리한다(app_secrets 테이블 기반).
--    (Supabase SQL Editor는 ALTER DATABASE SET 권한이 없어 GUC current_setting 방식 불가)
