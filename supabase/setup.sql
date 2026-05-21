-- =============================================
-- POCASTATION — 전체 설정 (한 번에 실행)
-- Supabase → SQL Editor → 전체 복사 → Run
-- =============================================

-- =============================================
-- 1. 테이블
-- =============================================

create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text unique not null,
  nickname text,
  is_admin boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.auctions (
  id bigserial primary key,
  seller_id uuid references public.profiles(id) on delete set null,
  seller_name text,
  group_name text not null,
  member text not null,
  album text,
  category text default '포토카드',
  grade text default 'A',
  img_url text,
  img_sha256 text,
  img_phash text,
  verification_word text,
  status text default 'pending' check (status in ('pending','live','ended','rejected')),
  start_price integer not null,
  current_price integer not null,
  bid_count integer default 0,
  duration_hours integer default 24,
  ends_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.bids (
  id bigserial primary key,
  auction_id bigint references public.auctions(id) on delete cascade,
  bidder_id uuid references public.profiles(id) on delete set null,
  bidder_name text,
  amount integer not null,
  created_at timestamptz default now()
);

-- =============================================
-- 2. 인덱스
-- =============================================

create index if not exists idx_auctions_img_sha256 on public.auctions(img_sha256);
create index if not exists idx_auctions_img_phash  on public.auctions(img_phash);

-- =============================================
-- 3. RLS 활성화
-- =============================================

alter table public.profiles enable row level security;
alter table public.auctions enable row level security;
alter table public.bids enable row level security;

-- =============================================
-- 4. PROFILES 정책
-- =============================================

create policy "프로필 본인 조회" on public.profiles
  for select using (auth.uid() = id);

create policy "프로필 본인 수정" on public.profiles
  for update using (auth.uid() = id);

create policy "관리자 전체 프로필 조회" on public.profiles
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- =============================================
-- 5. AUCTIONS 정책
-- =============================================

create policy "라이브 경매 공개 조회" on public.auctions
  for select using (status = 'live');

create policy "본인 경매 조회" on public.auctions
  for select using (seller_id = auth.uid());

create policy "관리자 전체 경매 조회" on public.auctions
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "경매 등록" on public.auctions
  for insert with check (auth.uid() is not null and seller_id = auth.uid());

create policy "관리자 경매 수정" on public.auctions
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- =============================================
-- 6. BIDS 정책
-- =============================================

-- 해당 경매의 입찰 내역은 누구나 조회 가능 (경매 투명성)
create policy "입찰 공개 조회" on public.bids
  for select using (true);

create policy "입찰하기" on public.bids
  for insert with check (auth.uid() is not null and bidder_id = auth.uid());

-- =============================================
-- 7. Storage 버킷 (경매 이미지)
-- =============================================

insert into storage.buckets (id, name, public)
values ('auction-images', 'auction-images', true)
on conflict (id) do nothing;

create policy "누구나 이미지 조회" on storage.objects
  for select using (bucket_id = 'auction-images');

create policy "로그인 사용자 이미지 업로드" on storage.objects
  for insert with check (bucket_id = 'auction-images' and auth.uid() is not null);

create policy "본인 이미지 삭제" on storage.objects
  for delete using (bucket_id = 'auction-images' and auth.uid() is not null);

-- =============================================
-- 8. 함수 & 트리거
-- =============================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, nickname)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nickname', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.handle_new_bid()
returns trigger as $$
begin
  update public.auctions
  set current_price = new.amount,
      bid_count = bid_count + 1
  where id = new.auction_id and current_price < new.amount;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_new_bid
  after insert on public.bids
  for each row execute procedure public.handle_new_bid();

-- =============================================
-- 9. RPC 함수 (해시 중복 검사)
-- =============================================

create or replace function public.check_img_sha256(hash text)
returns boolean as $$
  select exists (
    select 1 from public.auctions
    where img_sha256 = hash
      and status not in ('rejected')
  );
$$ language sql security definer;

create or replace function public.get_all_phashes()
returns table(id bigint, img_phash text) as $$
  select id, img_phash
  from public.auctions
  where img_phash is not null
    and status not in ('rejected');
$$ language sql security definer;

-- =============================================
-- 10. 관리자 설정 (이 줄만 이메일 바꿔서 실행)
-- =============================================
-- update public.profiles set is_admin = true where email = 'your@email.com';
