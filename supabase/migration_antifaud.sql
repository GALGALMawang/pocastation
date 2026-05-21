-- =============================================
-- ANTI-FRAUD: 해시 + 자필 인증 컬럼 추가
-- Supabase SQL Editor에서 실행하세요
-- =============================================

-- auctions 테이블에 컬럼 추가
alter table public.auctions
  add column if not exists verification_word text,
  add column if not exists img_sha256 text,
  add column if not exists img_phash text;

-- 해시 빠른 조회를 위한 인덱스
create index if not exists idx_auctions_img_sha256 on public.auctions(img_sha256);
create index if not exists idx_auctions_img_phash  on public.auctions(img_phash);

-- =============================================
-- RPC: SHA-256 중복 확인 (anon 도 호출 가능)
-- =============================================
create or replace function public.check_img_sha256(hash text)
returns boolean as $$
  select exists (
    select 1 from public.auctions
    where img_sha256 = hash
      and status not in ('rejected')
  );
$$ language sql security definer;

-- =============================================
-- RPC: pHash 유사 이미지 조회 (거리 계산은 프론트에서)
-- 등록된 모든 pHash 반환 (rejected 제외)
-- =============================================
create or replace function public.get_all_phashes()
returns table(id bigint, img_phash text) as $$
  select id, img_phash
  from public.auctions
  where img_phash is not null
    and status not in ('rejected');
$$ language sql security definer;
