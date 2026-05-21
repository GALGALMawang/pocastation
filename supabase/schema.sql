-- =============================================
-- POCASTATION 데이터베이스 스키마
-- Supabase SQL Editor에서 순서대로 실행하세요
-- =============================================

-- 1. 프로필 테이블 (auth.users 확장)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text unique not null,
  nickname text,
  is_admin boolean default false,
  created_at timestamptz default now()
);

-- 2. 경매 테이블
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
  status text default 'pending' check (status in ('pending','live','ended','rejected')),
  start_price integer not null,
  current_price integer not null,
  bid_count integer default 0,
  duration_hours integer default 24,
  ends_at timestamptz,
  created_at timestamptz default now()
);

-- 3. 입찰 테이블
create table if not exists public.bids (
  id bigserial primary key,
  auction_id bigint references public.auctions(id) on delete cascade,
  bidder_id uuid references public.profiles(id) on delete set null,
  bidder_name text,
  amount integer not null,
  created_at timestamptz default now()
);

-- =============================================
-- RLS (Row Level Security) 활성화
-- =============================================
alter table public.profiles enable row level security;
alter table public.auctions enable row level security;
alter table public.bids enable row level security;

-- =============================================
-- PROFILES 정책
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
-- AUCTIONS 정책
-- =============================================
-- 누구나 live 경매 조회
create policy "라이브 경매 공개 조회" on public.auctions
  for select using (status = 'live');

-- 본인 등록 경매 조회
create policy "본인 경매 조회" on public.auctions
  for select using (seller_id = auth.uid());

-- 관리자 전체 조회
create policy "관리자 전체 경매 조회" on public.auctions
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- 로그인 사용자 경매 등록
create policy "경매 등록" on public.auctions
  for insert with check (auth.uid() is not null and seller_id = auth.uid());

-- 관리자 경매 상태 변경
create policy "관리자 경매 수정" on public.auctions
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- =============================================
-- BIDS 정책
-- =============================================
create policy "입찰 공개 조회" on public.bids
  for select using (true);

create policy "입찰하기" on public.bids
  for insert with check (auth.uid() is not null and bidder_id = auth.uid());

-- =============================================
-- 함수: 신규 유저 프로필 자동 생성
-- =============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, nickname)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nickname', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================
-- 함수: 입찰 시 경매 현재가 + 입찰수 자동 업데이트
-- =============================================
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
-- 샘플 데이터 (관리자 계정 설정 후 실행)
-- profiles 테이블에서 본인 row의 is_admin을 true로 바꾸세요:
-- update public.profiles set is_admin = true where email = 'your@email.com';
-- =============================================
