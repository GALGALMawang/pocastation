# Supabase 마이그레이션 적용 가이드

이 디렉터리의 `.sql` 파일은 **누적 마이그레이션**이다. 신규 환경을 구성할 때는
아래 순서대로 Supabase Dashboard → SQL Editor 에서 실행한다.
(이미 운영 중인 DB라면 아직 적용하지 않은 파일만, 같은 순서로 실행)

## 적용 순서

| # | 파일 | 내용 |
|---|------|------|
| 1 | `schema.sql` | 기본 테이블 + RLS 골격 |
| 2 | `setup.sql` | 초기 셋업 (버킷/정책 등) |
| 3 | `migration_kakao_notify.sql` | 낙찰 카카오 알림 |
| 4 | `migration_credits.sql` | 크레딧 테이블 |
| 5 | `migration_antifaud.sql` | 이미지 해시(sha256/phash) 중복검사 RPC |
| 6 | `migration_cron.sql` | 경매 자동 종료 cron |
| 7 | `migration_kakao_alimtalk.sql` | 알림톡 + winner_id/seller_contact 컬럼 |
| 8 | `migration_settlement.sql` | 정산(settlements) 테이블 |
| 9 | `migration_bids_rpc.sql` | `place_bid` 초기 정의 |
| 10 | `migration_view_count_and_cron_fix.sql` | 조회수 + cron 보정 |
| 11 | `migration_bugfix.sql` | settlements 타입 수정, **`place_bid` 재정의**, 종료경매 RLS |
| 12 | `migration_credit_bidding.sql` | 크레딧 기반 입찰 |
| 13 | `migration_auction_fields.sql` | 경매 부가 컬럼 |
| 14 | `migration_shipping.sql` | 배송 정보 |
| 15 | `migration_buy_now.sql` | 즉시구매(`buy_now`) + buy_now_price 컬럼 |
| 16 | `migration_verify_matched.sql` | 손글씨 인증 결과 컬럼(verification_word, verify_matched) |
| 17 | `migration_security_fixes.sql` | **보안 강화** — 아래 참고 |
| 18 | `migration_features_v2.sql` | 배송방식(shipping_type/fee), 구매자 연락처, 프로필 프사/주소 |

## 함수 최종 정의 위치 (중복 주의)

여러 파일에서 `CREATE OR REPLACE` 로 같은 함수를 재정의한다. **나중에 실행한 파일이
최종본**이므로, 함수 로직을 고칠 때는 아래 "최종 정의" 파일을 수정해야 한다.

| 함수 | 최종 정의 파일 |
|------|----------------|
| `place_bid` | `migration_security_fixes.sql` (그 전: bids_rpc → bugfix) |
| `buy_now` | `migration_security_fixes.sql` (그 전: buy_now) |

## `migration_security_fixes.sql` 실행 전 준비

이 파일은 verify_matched 위조 방지를 위해 **HMAC 공유 비밀키**를 사용한다.
DB와 Edge Function이 같은 키를 가져야 한다.

1. 랜덤 키 생성: `openssl rand -hex 32`
2. 파일 안 `app_secrets` INSERT 의 `<SECRET>` 를 위 값으로 바꿔 실행
   (Supabase는 `ALTER DATABASE SET` 권한이 없어 비밀키를 `app_secrets` 테이블에 저장)
3. Supabase Dashboard → Edge Functions → Secrets 에 **`VERIFY_SECRET`** 으로
   동일한 값 등록
4. `analyze-image` 함수 재배포

> 키가 미설정이거나 `<SECRET>` 그대로면, 트리거가 모든 `verify_matched` 를
> `false` 로 강제하므로 보안상 안전하게 동작한다(인증 ✓ 표시만 안 될 뿐).

## 주의

- 마이그레이션 파일에는 마이그레이션 버전 추적 테이블이 없다(수동 관리).
  새 환경 셋업 시 위 표 순서를 그대로 따를 것.
- 운영 DB에 중복 실행해도 대부분 `IF NOT EXISTS` / `CREATE OR REPLACE` 라 멱등하지만,
  `migration_bugfix.sql` 의 `DROP TABLE settlements` 는 데이터를 지우므로
  **이미 정산 데이터가 있으면 재실행 금지**.
