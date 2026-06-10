-- =============================================
-- 카카오 알림톡 cron 수정
--   기존 cron은 current_setting('app.service_role_key') 등 GUC를 썼는데,
--   Supabase SQL Editor는 ALTER DATABASE SET 권한이 없어 해당 GUC를 설정할 수 없다.
--   → app_secrets 테이블(migration_security_fixes.sql에서 생성, RLS 잠금)에서 읽도록 변경.
-- Supabase SQL Editor에서 실행. (app_secrets 가 먼저 존재해야 함)
-- =============================================

-- pg_net (net.http_post) 필요. pg_cron 은 이미 활성화돼 있다고 가정(expire-auctions).
create extension if not exists pg_net;

-- ── 1. cron이 사용할 값 등록 ──────────────────────────────────
-- service_role_key: Supabase → Settings → API → service_role (secret) 값으로 교체.
-- supabase_url: 본인 프로젝트 URL (인수 시 새 프로젝트 URL로 교체).
-- ※ <SERVICE_ROLE_KEY> 를 그대로 두면 cron 호출은 인증 실패하지만 DB는 깨지지 않는다.
insert into public.app_secrets (key, value) values
  ('supabase_url',     'https://aizxaryprtbobftvlzib.supabase.co'),
  ('service_role_key', '<SERVICE_ROLE_KEY>')
on conflict (key) do update set value = excluded.value;

-- ── 2. 기존 잡 제거(있으면) 후 app_secrets 기반으로 재등록 ────
do $$
begin
  perform cron.unschedule('kakao-alimtalk-job');
exception when others then
  null; -- 잡이 없으면 무시
end $$;

select cron.schedule(
  'kakao-alimtalk-job',
  '* * * * *',
  $$
  select net.http_post(
    url     := (select value from public.app_secrets where key = 'supabase_url')
               || '/functions/v1/kakao-alimtalk',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select value from public.app_secrets where key = 'service_role_key'),
      'Content-Type',  'application/json'
    ),
    body    := '{}'::jsonb
  );
  $$
);
