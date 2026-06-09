/**
 * constants.js — 앱 전역 상수
 *
 * 코드 곳곳에 흩어져 있던 매직넘버를 한 곳에 모은다.
 */

// 입찰 최소 증가폭 (원). 현재가 + 이 값이 기본 입찰 금액.
export const BID_INCREMENT = 500;

// 중복 이미지 판정: 두 dHash 간 해밍 거리가 이 값 이하이면 "유사 이미지"로 간주.
export const PHASH_SIMILARITY_THRESHOLD = 10;

// 경매 진행 시간 (시간 단위) — 직접입력 모드 최대값.
export const MAX_AUCTION_HOURS = 168; // 7일
