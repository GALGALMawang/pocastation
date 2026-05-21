-- =============================================
-- 경매 자동 종료 + 추가 RLS
-- Supabase SQL Editor에서 실행하세요
-- =============================================

-- 1. pg_cron 확장 활성화
-- (Supabase → Database → Extensions → pg_cron 먼저 활성화 필요)
-- Extensions 활성화 후 아래 실행:

select cron.schedule(
  'expire-auctions',   -- 잡 이름
  '* * * * *',         -- 매 1분마다
  $$
    update public.auctions
    set status = 'ended'
    where status = 'live'
      and ends_at is not null
      and ends_at < now();
  $$
);

-- =============================================
-- 2. 입찰 내역 본인 조회 RLS (알림 탭용)
-- =============================================

create policy "본인 입찰 조회" on public.bids
  for select using (bidder_id = auth.uid());

-- =============================================
-- setup.sql 이미 실행한 경우 아래만 따로 실행:
-- alter table public.auctions add column if not exists img_sha256 text;
-- alter table public.auctions add column if not exists img_phash text;
-- alter table public.auctions add column if not exists verification_word text;
-- =============================================
