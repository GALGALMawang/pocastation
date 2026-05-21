-- profiles 테이블에 카카오 토큰 컬럼 추가
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS kakao_access_token  TEXT,
  ADD COLUMN IF NOT EXISTS kakao_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS kakao_token_expires_at TIMESTAMPTZ;

-- auctions 테이블에 낙찰자 + 알림 발송 여부 컬럼 추가
ALTER TABLE public.auctions
  ADD COLUMN IF NOT EXISTS winner_id          UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS kakao_notified_at  TIMESTAMPTZ;

-- pg_cron: 1분마다 kakao-notify Edge Function 호출
-- (이미 pg_cron이 활성화돼 있어야 함)
SELECT cron.schedule(
  'kakao-notify-job',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT value FROM vault.secrets WHERE name = 'supabase_url') || '/functions/v1/kakao-notify',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT value FROM vault.secrets WHERE name = 'supabase_service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
