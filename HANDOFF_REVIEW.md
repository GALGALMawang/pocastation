# 인수인계 점검 문서 (Handoff Review)

> 객관적 코드 점검 결과를 기록하는 문서입니다. **자동 수정은 하지 않으며**, 발견사항만 정리합니다.
> 6시간마다 갱신됩니다. 항목을 처리하면 체크박스를 채워주세요.

**최종 점검: 2026-06-10**
**판정: 🟢 코드 정리 완료 (배포 단계만 남음)** — 보안 2건 코드 수정 완료(배포 필요), 바이브코딩 흔적·중복 정리 완료.

> **2026-06-10 처리 완료:**
> - 🔴 보안 #1 tracker secret → `track-delivery` Edge Function으로 이전 (코드 완료, 배포·secret 설정·기존 secret 폐기 필요)
> - 🔴 보안 #2 toss-webhook → Toss 결제 조회 검증 추가 (코드 완료, 재배포 필요)
> - 🟠 `init_fix.js` 삭제
> - 🟠 박스드로잉 장식주석 전부 제거 (라벨 텍스트는 유지)
> - 🟡 `getTimeLeft` 3중 중복 → `lib/utils.js` 단일 함수로 통합
> - 미적용(문서 유지): 모달 보일러플레이트 추출, `formatKRW` 유틸화, `alert/confirm` 통일, UI placeholder 이모지(기능성이라 보존), `index.html` Toss 스크립트(결제 리스크로 보류)

---

## 🔴 보안 — 핸드오프 전 반드시 처리

- [ ] **1. tracker.delivery Client Secret이 클라이언트 번들에 노출 (심각)**
  `src/lib/delivery.js:46-47` + `.env.local`
  `VITE_TRACKER_CLIENT_SECRET`는 `VITE_` 접두사라 Vite가 빌드 시 **공개 JS 번들에 인라인**한다. `getAccessToken()`이 브라우저에서 OAuth 요청을 보내므로 누구나 DevTools로 secret 추출 가능.
  → **조치**: 배송 조회 로직을 Edge Function으로 이전(secret을 서버 환경변수로) + 이미 노출된 secret은 tracker.delivery 대시보드에서 **즉시 폐기/재발급**.

- [ ] **2. toss-webhook 서명 검증 부재 → 크레딧 위조 (심각, 직접 확인됨)**
  `supabase/functions/toss-webhook/index.ts:3,10,46`
  `TOSS_SECRET_KEY`를 선언만 하고 사용하지 않음. 서명 검증 없이 들어온 JSON을 신뢰해 `adjust_credit` 호출. 본인 충전 orderId(`charge_{userId8}_{timestamp}`)만 알면 **실제 입금 없이 크레딧 발급** 가능.
  → **조치**: Toss webhook signature 검증 추가 + 지급 전 Toss 결제 조회 API로 금액·상태 재확인.

- [ ] **3. .env.local의 실제 secret — 인수인계 시 재발급 정책 명시**
  git 추적 안 됨(정상). anon key는 공개키라 무방하나 위 1번 secret은 노출 자산.
  → **조치**: 핸드오프 문서에 "모든 secret은 새 소유자가 재발급"을 명시.

> 참고(문제 아님): 마이그레이션 SQL은 `<SECRET>` 플레이스홀더만 사용(하드코딩 secret 없음). Edge Function은 모두 `Deno.env.get()` 사용. `console.error`는 3곳, 민감정보 미노출.

---

## 🟠 바이브 코딩 티 (사람이 쓴 것처럼 정리 필요)

- [ ] **`init_fix.js` (루트) — 죽은 실험 파일.** 구버전 vanilla-JS. `src/`·`index.html`·`package.json`·`vercel.json` 어디서도 참조 안 됨(grep 0). → **삭제**.
- [ ] **박스 드로잉(`──────`) 장식 구분선 주석.** `AuctionModal.jsx:71~159`(라벨 없는 빈 구분선 7쌍), `Home.jsx`, `SettlementModal.jsx`, `ChargeModal.jsx`, `SalesModal.jsx`, `BidsModal.jsx`. → 일반 `// 설명` 주석으로 교체, 빈 구분선은 제거.
- [ ] **코드 내 placeholder 이모지.** `Admin.jsx:122`, `BidsModal.jsx:82,114`(`🃏`) 등 비-UI 영역. → 상수화/정리.
- [ ] **`TODO.md` (gitignored) — 구버전 Supabase URL·구어체.** 인계 참고자료로 줄 거면 URL 갱신, 아니면 폐기.

---

## 🟡 모듈화 / 중복

- [ ] **시간 포맷 함수 3중 중복 (가장 심각).**
  `lib/utils.js:4` `formatTimeLeft`(어디서도 import 안 됨, 죽은 코드), `AuctionCard.jsx:22` `getTimeLeft`, `AuctionModal.jsx:23` `getTimeLeft`. **출력이 다름** — 카드는 `"N시간 M분"`, 모달은 `"N시간 M분 S초"`. → `lib/utils.js` 단일 함수로 통합 후 두 컴포넌트가 import. 미사용 `formatTimeLeft`/`isEndingSoon`(:15) 정리.
- [ ] **모달 오버레이 보일러플레이트 중복 (6개 모달 + Home).** `position:fixed; inset:0` + `window.innerWidth<768` + `onClick/stopPropagation` 패턴 반복. → `<ModalShell>` 공통 컴포넌트 + `useIsMobile` 훅 추출(현재 리사이즈 미반응).
- [ ] **통화 포맷 `₩{x.toLocaleString()}` 20+곳 산재.** → `formatKRW(n)` 유틸화(중요도 낮음).
- [ ] **`alert()`/`confirm()` 혼용** (`Admin.jsx` 6회 등). → 토스트 등으로 통일(선택).

✅ 양호: `lib/delivery.js`(CARRIERS/STATUS_KO 분리), `lib/constants.js` 잘 모듈화됨.

---

## 🟢 문서·주석 품질

**강점 (핸드오프 자산으로 유지):**
- 컴포넌트 파일 헤더 주석이 일관·정확. `Home.jsx`, `Admin.jsx`(상태머신+RLS 경고), `SettlementModal.jsx`(결제흐름), `analyze-image`(보안설계) 우수.
- `supabase/README.md`(마이그레이션 순서·함수 최종정의·DROP TABLE 경고) — 온보딩 가치 높음.

**약점:**
- [ ] `lib/utils.js:1-13` 주석은 정확하나 함수가 죽은 코드라 오해 유발.
- [ ] `index.html:7` Toss v1 전역 `<script>`가 실제로는 npm SDK(`SettlementModal.jsx:27`) 사용과 중복 — **미사용 확인 후 제거**.
- [ ] 일부 자명한 코드 재진술 주석(`Admin.jsx:21,29`) — 경미.

---

## 처리 진행 메모
- (여기에 처리 내역을 날짜와 함께 기록)
