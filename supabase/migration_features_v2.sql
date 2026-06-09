-- =============================================
-- 기능 추가 마이그레이션 v2
--   #1 배송 방식(일반/편의점택배 + 배송비)
--   #3 낙찰 시 구매자 연락처 상호 공유
--   #4 프로필 프사/주소
-- Supabase SQL Editor에서 실행하세요 (migration_security_fixes.sql 이후)
-- =============================================

-- ── #1. 배송 방식 ────────────────────────────────────────────
-- shipping_type: 'included'(일반 — 배송비 포함) | 'convenience'(편의점택배)
-- shipping_fee : 편의점택배 시 판매자가 입력한 배송비(원). included면 0.
ALTER TABLE public.auctions
  ADD COLUMN IF NOT EXISTS shipping_type TEXT    DEFAULT 'included',
  ADD COLUMN IF NOT EXISTS shipping_fee  INTEGER DEFAULT 0;

-- ── #3. 정산 시 구매자 연락처 (판매자에게 공유) ──────────────
-- 판매자는 settlements SELECT 정책(seller_id = auth.uid())으로 조회 가능.
ALTER TABLE public.settlements
  ADD COLUMN IF NOT EXISTS buyer_contact TEXT;

-- ── #4. 프로필 프사 / 주소 (nickname 은 이미 존재) ───────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS address    TEXT;

-- 프사는 기존 'auction-images' 공개 버킷의 avatars/ 경로를 재사용하므로
-- 추가 스토리지 버킷/정책이 필요 없다. (로그인 업로드 정책 이미 존재)
