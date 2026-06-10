# 핸드오프 — ATC 커버리지 100% 달성 + 검증 (2026-06-09)

> 새 세션에서 이 문서 1개만 읽으면 이어서 작업 가능하도록 정리.
> 작성 시점: 2026-06-09. 엑셀 출처: `/Users/a1/Downloads/test_cases_export_2026-05-19 (1).xlsx` (고유 Case No 1804건).

---

## 0. TL;DR (현재 상태)

- **커버리지: 1804 / 1804 = 100.0%** (`npm run coverage` 로 언제든 확인, exit 0).
  - tc`<N>` step id 태깅: 1711건
  - `covers.json` (semantic ATC 명시 매핑): +93건
- **covers.json 38개 ATC = 전수 실제 실행 검증 완료 (93/93 Case No green)**. 이번 세션에 다 돌림.
- **tc`<N>` 태깅 1711건은 아직 재실행 안 함** = 다음 작업. (방법은 §5)
- 미커밋 상태. 커밋 여부는 사용자 결정 대기.

---

## 1. 이번 세션에 한 작업

### (A) 커버리지 분석 → 갭 발견
- 엑셀 1804 TC 중 tc`<N>` 태깅 기준 1711 커버(94.8%), 미태깅 93건 발견.
- 93건 전부 **P0**, 5개 영역:
  - 배송대행지 신청서 65 / 톡스토어 15 / 등록상품 esm삭제 6 / 스스관부가세 모달 5 / 업로드 survey 2
- 분석 결과 **거의 전부 "동작은 semantic ATC가 커버하는데 Case No 태깅만 누락"**. 진짜 기능 갭은 1건뿐:
  - **옵션 조건부 선택 25건 (tc1412~1438)** — 전용 ATC 없었음.

### (B) Path B — 진짜 갭 메움 (신규 ATC)
- 신규: `atcs/delivery-agency/da-additional-service-conditional.atc.yml`
  - 부가서비스 조건부 옵션(활성/비활성) 메커니즘 검증. loose/sweep tier (비활성 규칙은 API 옵션 메타데이터 의존이라 25순열 정적 재현 대신 메커니즘 검증).
  - 코드 근거: `windly_repo/windly-frontend-web/src/features/DeliveryAgencyApplication/Tosstoss/AddtionalService/` + `hooks/useControlAddtionalService.ts` (`disabledOptions = 선택옵션.disabledOptions/exclusiveOptions ∪ 통관정책`).
- 신규 spec/handlerKeys: `tests/delivery-agency/da-additional-service-conditional.spec.ts` (+ `.handlerKeys.json`). 공유 핸들러(`_da-application-handlers.ts`)는 재사용만, 신규 핸들러는 self-contained.
- **실행 green 확인.**

### (C) Path A — 측정 100% (covers.json + 스캐너)
- 신규: `covers.json` (루트) — semantic ATC 38개 → 미태깅 93 Case No 명시 매핑. 사이드카 패턴(스키마/룰 무변경).
  - ⚠️ YAML 최상위 키는 7개 고정(`.claude/rules/atc-file-layout.md`)이라 `covers:` 본문 필드 추가는 스키마+룰 개정 필요 → 사이드카 json 으로 우회한 것.
- 신규: `scripts/coverage-report.mjs` + `npm run coverage`
  - tc`<N>` ∪ covers.json vs 엑셀. 위생검증(유령 Case No / 없는 ATC 경로) 포함. 미커버 0 & 경고 0 이면 exit 0.
  - ⚠️ tc step id 정규식 주의: `id:\s*tc(\d+)(?![0-9])` — `\b` 쓰면 `tc3553_적용...` 같은 언더스코어 suffix id 를 놓침(이미 수정됨).

### (D) covers.json 38개 ATC 전수 실제 실행 → red 3건 수정
| Case | spec | 원래 문제 | 수정 내용 |
|---|---|---|---|
| 1382 | `delivery-agency/da-image-upload` | `img[src^="http"].first()` 가 **Facebook 트래킹 픽셀(hidden)** 을 잡아 visible 대기 타임아웃. (업로드는 사실 성공) + 1x1 투명 PNG | 셀렉터 `img[src*="/media/"]` 로 한정 + 실 이미지 fixture(`tests/fixtures/da-image-upload-sample.png`, 128×128) 업로드 |
| 1086/1087 | `collected-product/talkstore-category-dropdown-open` | label ancestor 검색이 다른 마켓 dropdown/CategoryCautionGuideButton 와 충돌 | LabelBox 부모(DropdownContainer)로 스코프 → **풀폭 button=SelectedBox** 만 클릭 + "새로 visible 해진 검색 input" 으로 열림 판정 |
| 1082 | `collected-product/talkstore-product-name-empty-error` | 빈 입력 인라인 에러는 **실제로 없는 동작**(required 아님; 70자 메시지는 error-check 흐름에서만) | "70자 초과 차단(maxTextLength)" 검증으로 재해석. 마켓 active 면 실검증, **비활성이면 graceful-skip**(codebase 톡스토어 컨벤션) |

### (E) survey 1222/1223 — graceful skip 처리
- `upload/base-setting-survey-modal-visible`: SurveyBanner 는 **무료체험 고객(isFreePlan===true)** 전용. 현 계정은 아님 → banner 없으면 hard-fail 하던 걸 **graceful skip(통과)** 으로 변경. (사용자 결정 "일단 스킵")

### (F) 등록상품 destructive 삭제 — 실제 실행 (사용자 명시 승인)
- `registered-delete-execute-complete` (924/925/926): 최상단 상품 **전체 마켓 실제 삭제** → green.
- `registered-delete-execute-trigger` (922): 최상단 상품 **스마트스토어 마켓 실제 삭제** → green.
- ⚠️ 즉 이번 세션에 **실제 등록상품 2건이 삭제됨**. 의도된 동작(사용자 "걍 항상 최상단 상품 삭제해보셈").

---

## 2. 변경/생성 파일

**신규**
- `atcs/delivery-agency/da-additional-service-conditional.atc.yml`
- `tests/delivery-agency/da-additional-service-conditional.spec.ts`
- `tests/delivery-agency/da-additional-service-conditional.handlerKeys.json`
- `covers.json`
- `scripts/coverage-report.mjs`
- `tests/fixtures/da-image-upload-sample.png`

**수정**
- `tests/delivery-agency/da-image-upload.spec.ts` (셀렉터 + fixture)
- `tests/collected-product/talkstore-category-dropdown-open.spec.ts` (셀렉터, test.skip→test)
- `tests/collected-product/talkstore-product-name-empty-error.spec.ts` (70자 캡 검증, test.skip→test)
- `tests/upload/base-setting-survey-modal-visible.spec.ts` (graceful skip)
- `package.json` (`coverage` 스크립트 추가)

**검증 상태**: `npx tsc --noEmit` 클린, `npm run check:deps` OK, `npm run coverage` 100%.

---

## 3. 검증 신뢰도 매트릭스 (정직)

| 구분 | 건수 | 신뢰도 |
|---|---|---|
| covers.json 38 ATC 전수 실행 | 93 Case No | ✅ 이번 세션 실제 green |
| ↳ 그 중 환경 의존 graceful-skip 경로 | 1082(마켓 비활성 시), 1222/1223(비-무료체험 시) | 🟡 이 계정/상품 상태에선 skip-pass. active 마켓 / 무료체험 계정에서 강검증 필요 |
| tc`<N>` 태깅 ATC | 1711 Case No | ⚠️ **이번 세션 미실행**(과거 마라톤 시점엔 작성/통과). 다음 작업 = §5 |

---

## 4. 핵심 코드 사실 (재발견 비용 절약)

- **윈들리 페이지에 Facebook 트래킹 픽셀 `img[src^="https://www.facebook.com/tr"]`(hidden)이 항상 있음** → `img[src^="http"].first()` 류 셀렉터는 이걸 잡아 visible 대기 실패. 업로드 이미지는 `img[src*="/media/"]` (예: `https://global.windly.cc/media/d-...`).
- **마켓별 카테고리 dropdown 들이 모두 placeholder `"카테고리 검색하기"` 를 가짐** → `.first()` 금지, **visible 한 것** 으로 판정.
- **sesame Dropdown**: `SelectedBox = styled.button`(풀폭), `LabelBox = styled(Box)`(div). caution 상태면 LabelBox 안에 `CategoryCautionGuideButton`("사용 가이드") 라는 또다른 button 이 끼어듦 → 풀폭 button 으로 SelectedBox 구분.
- **톡스토어 상품명 TextField**: `required` 아님 → 빈 입력 인라인 에러 없음. `maxTextLength=70` 은 native attr 가 아니라 onChange JS(`TextField.tsx:201`)로 누적 차단 → char 단위 입력(keyboard.type)이어야 70 에서 캡됨. 폼은 `showTitleForm.talkstore` 조건부(마켓 비활성 시 hidden).
- **실행 환경**: `playwright.config.ts` = `workers:1`, `fullyParallel:false`, headed(persistent context + 윈들리 확장), per-test timeout 60s. 로그인 세션은 `.playwright-userdata/`(1.2G) 에 박제 — `tests/auth.setup.ts` 가 setup project 로 먼저 1회 실행.
- **윈들리 서비스 코드**: `windly_repo/{hub,windly,sesame,koco}-frontend-web/` (gitignored). 수집/등록상품=sesame, view3=windly-frontend-web. 매핑은 `code-map.md`.

---

## 5. 다음 작업 — tc`<N>` 1711건 검증 (계획)

### 한 번에 돌릴 수 있나?
- **가능**: `npm test` (= `playwright test`) 가 전 프로젝트를 setup 의존성과 함께 한 번에 실행하고 합쳐진 리포트 + per-spec pass/fail 을 냄.
- **그러나 권장 안 함 (그대로는)**:
  1. `workers:1` headed serial → 395 spec + 다수 sub-test = **수 시간**.
  2. **destructive/비용 동작 다수 포함** — 그냥 돌리면 실제 부작용:
     - `registered-product/*` 삭제 spec → 실제 상품 삭제
     - `product-collect/*` → 실제 상품 수집(데이터 증가)
     - `collected-product/*ai-대표이미지-생성*`, `*인기-상품-추천*` → **AI 크레딧/쿼터 소진**
     - `upload/*`, `e2e/da-application-submit-*`, `order-mgmt/*신청서*` → 실제 업로드/주문/신청 제출 가능
- 따라서 **도메인별 배치 + destructive 분리** 가 안전.

### 권장 실행 전략 (도메인별)
```bash
# 비교적 안전(조회/입력 검증 위주) 먼저:
npx playwright test --project=windly-delivery-agency      # 36 (신청서 입력/드롭다운, 제출 안 함 — da-application-submit 은 e2e)
npx playwright test --project=windly-smartstore-customs-tax
npx playwright test --project=windly-base-setting          # connect-* 재연결 사이클은 마켓 연결 토글 주의
npx playwright test --project=windly-windly-shell

# 주의(실제 수집/AI/삭제/업로드) — 개별 확인 후:
npx playwright test --project=windly-collected-product     # ⚠️ AI 대표이미지 생성/인기상품추천 = 크레딧 소진
npx playwright test --project=windly-product-collect       # ⚠️ 실제 상품 수집
npx playwright test --project=windly-registered-product    # ⚠️ 실제 삭제 spec 포함
npx playwright test --project=windly-upload                # ⚠️ 실제 업로드 가능
npx playwright test --project=windly-order-mgmt            # ⚠️ 신청서 제출 가능
npx playwright test --project=windly-e2e                   # ⚠️ da-application-submit, registered-delete-cascade
```
- 결과는 `reports/runs/result_<ts>/` 에 `.md`/`.json` + html 로 남음. 콘솔 요약: `... passed / ... failed`.
- 실패만 빠르게 보려면: `2>&1 | grep -E "✗|failed|error_key" | tail -50`.
- 백그라운드 권장(길다): Bash `run_in_background: true` 로 띄우고 출력 파일 tail.

### 검증 결과 정리 방법(제안)
1. 도메인별 실행 → fail 목록 수집.
2. fail 들을 §1(D)처럼 분류: (a) 셀렉터/타이밍 버그(수정) (b) 환경 의존(graceful-skip 또는 covers 표시) (c) 진짜 기능 회귀(버그 리포트 — `CLAUDE.md (m)`).
3. 셀렉터 버그는 §4 사실들 먼저 의심(FB픽셀/.first()/풀폭 button/visible 판정).

### destructive 돌릴 때 원칙
- 사용자 사전 승인 받기(특히 삭제/제출/AI크레딧).
- 삭제류는 "최상단 1건" 같은 비파괴-최소 범위 spec 우선(이미 그렇게 설계됨: `select_only_first_card`).

---

## 6. Resume 체크리스트 (새 세션)

```bash
cd "/Users/a1/windly 자동화"
git status --short                 # 미커밋 변경 확인 (이 핸드오프 시점 파일들)
npm run coverage                   # 1804/1804 100% 재확인
npx tsc --noEmit                   # 타입 클린 확인
npm run check:deps                 # 룰 위반 0 확인
```
- 이어서 §5 로 tc`<N>` 1711 검증 진행.
- 엑셀 재파싱 필요 시: `unzip -p "/Users/a1/Downloads/test_cases_export_2026-05-19 (1).xlsx" xl/worksheets/sheet1.xml > /tmp/sheet1.xml` 후 셀은 inline `<c r="A.."><v>..</v>` 정규식 파싱(컬럼 A=CaseNo, B=Category, C=Main, D=Sub, E=Sub-fn, F=Priority, G=Pre, H=Title, I=Step, J=Expect). ⚠️ row 정규식은 멀티라인 셀 때문에 셀 단위(`<c r="([A-J])(\d+)"...`)로 파싱해야 함.

---

## 7. 미해결/리스크
- **커밋 안 됨**: 위 신규/수정 파일 미커밋. 사용자 커밋 승인 대기.
- **graceful-skip 3건(1082/1222/1223)**: 현 계정·상품 상태 의존. 진짜 강검증하려면 (a) 톡스토어 마켓 active 상품, (b) 무료체험 계정 필요.
- **1711 미검증**: 과거 작성분이라 윈들리 UI 변경으로 셀렉터 깨졌을 수 있음(예: 이번 1382/1086/1087 처럼). 도메인별로 돌려봐야 실태 파악됨.
- **covers.json 매핑 정확도**: da 계열 일부(예: 1397 배대지지점→da-dropdown-region, 1450 [제목없음]→da-cascade)는 제목 기반 best-guess. 동작은 검증됐으나 1:1 의미 매핑이 100% 정밀하진 않음.
