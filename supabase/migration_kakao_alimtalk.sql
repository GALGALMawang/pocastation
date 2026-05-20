-- 1. profiles에 전화번호 + 정산 계좌 컬럼 추가
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone        TEXT,
  ADD COLUMN IF NOT EXISTS bank_account TEXT;

-- 2. auctions에 낙찰자 + 알림 발송 여부 컬럼 추가
ALTER TABLE public.auctions
  ADD COLUMN IF NOT EXISTS winner_id         UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS kakao_notified_at TIMESTAMPTZ;

-- 3. pg_cron: 1분마다 kakao-alimtalk Edge Function 호출
SELECT cron.schedule(
  'kakao-alimtalk-job',
  '* * * * *',
  $$
  SELECT net.http_post(
    url     := current_setting('app.supabase_url') || '/functions/v1/kakao-alimtalk',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type',  'application/json'
    ),
    body    := '{}'::jsonb
  );
  $$
);
