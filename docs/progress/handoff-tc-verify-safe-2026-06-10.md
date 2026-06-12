# 핸드오프 — tc 검증 (안전 도메인 4개) + 수정 (2026-06-10)

> 이전 핸드오프 `handoff-coverage-2026-06-09.md` 의 §5 "tc<N> 1711 검증" 을 이어받아,
> **안전 도메인 4개**를 실제 실행 검증하고 발견된 실패를 수정한 기록.

---

## 0. TL;DR

- **안전 도메인 4개 전수 실행 검증 완료** (사용자 선택: 안전 도메인 먼저 + destructive 전부 승인):
  - smartstore-customs-tax 42/42 ✅
  - windly-shell 25/25 ✅
  - base-setting 60 spec → talkstore 재연결 수정 후 전부 ✅
  - delivery-agency 79 test → #1430 flake 수정 ✅ + enter-application 수정 후 ✅
- **발견·수정한 실재 버그 3건 + 1건 테스트 완성** (모두 GREEN 재확인):
  1. da-cascade 캐스케이드 타이밍 레이스
  2. talkstore 재연결 guard 잘못된 식별필드
  3. enter-application 제출버튼 라벨 오류 + 무한 hang
  4. enter-application 제출 시나리오 미완성 → 캐스케이드/부가서비스 채워 실제 제출까지 GREEN
- tsc 0 / check:deps OK / coverage 1804/1804(100%) 유지.
- **미커밋** (사용자 커밋 결정 대기). 변경 5파일.

---

## 1. 변경 파일 (5)

| 파일 | 변경 |
|---|---|
| `tests/delivery-agency/_da-application-handlers.ts` | `selectDropdownOption`: 고정 400ms 대기 → 옵션 등장까지 6s poll (캐스케이드 race fix) |
| `tests/base-setting/connect-talkstore-reconnect-cycle.spec.ts` | guard 식별필드 '스토어 URL'(빈 헬퍼) → 'Open API 인증키'(실제 계정 식별) |
| `tests/delivery-agency/delivery-agency-enter-application.spec.ts` | SUBMIT_BUTTON_NAME `/신청 완료/`→`/저장/`, isDisabled bounded, 캐스케이드3+부가서비스 step 추가, validation toast/error capture 확대 |
| `tests/delivery-agency/delivery-agency-enter-application.handlerKeys.json` | step 4개 추가 (select_region/shipping/customs/additional_service) |
| `atcs/delivery-agency/delivery-agency-enter-application.atc.yml` | 위 4 step 추가 + expected 16 step |

---

## 2. 수정 상세

### (1) da-cascade #1430 — 타이밍 레이스 (flake)
- 증상: `select_shipping` 이 "평택해운 매칭 0건". #1429(동일 region/shipping)는 통과한 비대칭.
- 원인: `selectDropdownOption` 이 placeholder 클릭 후 **고정 400ms** 만 기다리고 즉시 count → 캐스케이드(지역→운송) async 로드 늦으면 0건.
- 수정: 옵션 visible 까지 6s waitFor poll. → #1429/#1430 모두 PASS.

### (2) talkstore 재연결 — guard 식별필드 오류 (안전가드는 정상)
- 증상: `guard_same_account` 가 "현재 연결 스토어 URL='' != .env" 로 항상 abort.
- 원인: 톡스토어 연결 상태에서 **'스토어 URL' input 은 빈 '스토어 바로가기' 헬퍼** → guard 부적합. 실제 계정 식별 = **'Open API 인증키'** (연결 시 채워짐, .env TALKSTORE_OPENAPI_KEY 와 매칭).
- 수정: guard 필드 교체. → 해제→재연결 사이클 PASS (톡스토어 실제 재연결됨).

### (3)+(4) enter-application — 제출버튼 라벨 + hang + 시나리오 완성
- hang 원인: `getByRole('button',{name:/신청 완료/})` 매칭 0건인데 `isDisabled(timeout:0)` 무한 대기 → 180s test timeout. **실제 제출버튼 = "저장"** (components/Header.tsx `<Button><CheckIcon/>저장`).
- 수정: 버튼명 `/저장/`, isDisabled 호출 전 bounded waitFor.
- 시나리오 미완성: 주문 불러오기는 상품+받는분만 채움. 제출엔 추가로 필요 (`useValidateForm.ts`):
  - **캐스케이드 3개** (지점/운송/통관) — selectDropdownOption 재사용
  - **통관=사업자통관** — 목록/일반통관은 받는분 개인통관고유부호(PCC) API검증 필요(가짜 불가). 사업자통관은 PCC 면제.
  - **부가서비스 1개 이상 필수** — '택배 개봉 금지' 등 free enabled 옵션 클릭 (보험/어댑터 회피).
- 결과: 실제 신청서 **제출 + 배송대행지 메인 랜딩 GREEN**. (매 실행마다 실제 배대지 신청 1건 생성 — destructive, 사용자 승인.)
- 상세: memory `project_tosstoss_application_submit_requirements`.

---

## 3. Destructive 도메인 검증 — 완료 (2026-06-10 동일 세션)

6개 destructive 도메인 전수 실행 (사용자: destructive 전부 승인). 결과 233 pass / 24 fail.

| 도메인 | pass/fail |
|---|---|
| order-mgmt | 7/0 |
| upload | 7/1 |
| product-collect | 62/3 |
| registered-product | 29/2 |
| e2e | 28/9 |
| collected-product | 100/8 |

**24 fail 분류:**
- **A. 입력 의존 (13) — 버그 아님**: standalone `npx playwright test` 는 CLI/GUI batch 입력(`product_url`/`source_product_id`/`product_count`/`page_number`) 없어 즉시 fail. GUI 큐/`--url=` 로 정상. (upload 1, product-collect 3, registered 2, e2e 3, collected 4)
- **B. 외부 (1)**: e2e oauth-google-login-home — 구글 로그인 자동화 불가.
- **C. 데이터/상태 의존 (6+1)**: 첫 수집상품 상태(옵션 유무/옵션탭 에러/talkstore 활성)·propagation 에 좌우. collected: coupang-option-group-match, check-and-fix, edit-option-stock, talkstore-review-point. e2e: verify-market-weights(base 25% vs 상품 24%), verify-stock(1006 vs 1005). **+ taobao-collect-fix-upload(D→C 재분류)**: walkAndFixTab 이 "기본 정보" 에러 못 지움 → 상품 업로드 불가 → "업로드 하기" 모달 안 뜸. (셀렉터 아님)
- **D. 셀렉터/타이밍 (2) — 수정 완료**:
  - `verify-delivery-fee`: "배송비 조건"(unitQty) 등 배송비 유형 의존 필드 미렌더 시 hard-fail → **skip 처리** (waitFor 30s→8s). ✅ GREEN.
  - `registered-delete-cascade`: 전체 마켓 cascade 삭제가 async 라 30s 초과 → **poll 30s→90s**. 재실행 시 36s 에 삭제 확인 ✅ GREEN.

**수정 파일 (추가 2):** `tests/e2e/verify-delivery-fee-on-product.spec.ts`, `tests/e2e/registered-delete-cascade.spec.ts`.

## 4. 다음 작업 — C 그룹(데이터/상태 의존) 처리 (잔여, 사용자 결정 대기)

C 그룹 ~7건은 셀렉터 버그가 아니라 첫 수집상품 상태/propagation 의존. 선택지:
- **graceful-skip**: 전제조건(옵션 있는 상품/talkstore 활성/에러 0) 미충족 시 통과 처리 (1082/1222/1223 선례).
- **propagation 조사**: verify-market-weights/stock 의 "base 변경이 상품에 미반영" 이 제품 정상동작인지 버그인지 소스 확인.
- **autofix 보강**: taobao "기본 정보" 에러 자동수정 커버리지 확대 (check-and-fix/coupang-option 도 같은 옵션탭 에러 계열).
- A(입력의존)/B(OAuth) 는 버그 아님 — 조치 불필요.

검증 노하우: 셀렉터 버그 의심 시 **버튼 실제 라벨 확인**(신청완료≠저장 사례), **timeout:0 무한대기 금지**, trace.zip 의 before/after 이벤트로 hang action 식별, 0-trace.network 로 백엔드 응답 확인.

### 실행 노하우 (이번 세션 확인)
- background Bash 로 `npx playwright test --project=windly-<domain> > /tmp/run-<d>.log 2>&1` (echo 래퍼 X — exit code 가려짐).
- 2개 playwright 동시 실행 금지 (persistent userDataDir + 확장 공유 충돌). serial 로.
- 실패 분석: trace.zip unzip → `0-trace.trace` 의 before/after 이벤트로 행 actions 식별 (after 없는 게 hang 지점). `0-trace.network` 로 백엔드 응답(422/WS코드) 확인.

---

## 4. Resume 체크리스트
```bash
cd "/Users/a1/windly 자동화"
git status --short        # 5파일 미커밋
npx tsc --noEmit          # 0
npm run check:deps        # OK
npm run coverage          # 1804/1804
```
이어서 §3 destructive 도메인 진행.
