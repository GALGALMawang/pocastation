-- =============================================
-- 1. view_count 컬럼 추가
-- =============================================
alter table public.auctions
  add column if not exists view_count integer not null default 0;

-- view_count 증가 RPC
create or replace function public.increment_view_count(p_auction_id bigint)
returns void as $$
  update public.auctions set view_count = view_count + 1 where id = p_auction_id;
$$ language sql security definer;

-- =============================================
-- 2. 경매 자동 종료 cron 업데이트 (winner_id 포함)
-- (pg_cron 이미 활성화 + 기존 잡 있으면 아래만 실행)
-- =============================================

-- 기존 잡 삭제 후 재등록
select cron.unschedule('expire-auctions');

select cron.schedule(
  'expire-auctions',
  '* * * * *',
  $$
    update public.auctions a
    set
      status = 'ended',
      winner_id = (
        select bidder_id from public.bids
        where auction_id = a.id
        order by amount desc
        limit 1
      )
    where status = 'live'
      and ends_at is not null
      and ends_at < now();
  $$
);
