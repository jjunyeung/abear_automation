# E2E 회귀 테스트 계획 (29개, 실측 기반 Tier 분류)

자동 회귀로 돌릴 e2e ATC 의 풀 카탈로그. **실제 실행 결과 + 회귀 신호 가치** 기준으로 Tier 분류.

- 모든 e2e ATC: `atcs/e2e/<name>.atc.yml`
- 모든 spec: `tests/e2e/<name>.spec.ts`
- 측정 환경: 단일 사용자 / 단일 chromium / 1800×1280 / 윈들리 확장 로드 (D7)
- 시간 = 실측 worst-case (네트워크 변동 ±30%)

---

## Tier 1 — 실제 회귀 가치 (13개) ✅

> **수정/액션의 영속성 검증**. 망가지면 매출/사용자 직접 영향. 자동 회귀의 핵심.

| # | e2e | 검증 내용 | 실측 시간 |
|---|---|---|---|
| T1-01 | `shell-menu-smoke-all` | 6개 메뉴 마운트 (라우팅 health) | 37초 |
| T1-02 | `url-collect-detail-smoke` | URL 수집 → 상세 진입 (확장 + 수집 파이프 health) | 2.0분 |
| T1-03 | `registered-delete-cascade` | 등록상품 삭제 + 목록에서 사라짐 검증 | 50초 |
| T1-04 | `red-tab-detect-fix-recheck` | 빨간탭 자동수정 cycle 동작 | 1.5분 |
| T1-05 | `option-normalize-then-pass-check` | 옵션 A-Z 정규화 | 1.6분 |
| T1-06 | `ai-category-then-pass-check` | AI 카테고리 추천 + 에러체크 | 1.1분 |
| T1-07 | `ai-name-suggest-apply-save` | AI 상품명 추천 → autosave → 영구 반영 | 1.0분 |
| T1-08 | `ai-category-suggest-apply` | AI 카테고리 추천 → autosave | 1.3분 |
| T1-09 | `verify-base-setting-on-product` | 베이스세팅 6항목 → 상품 반영 매치 | 1.0분 |
| T1-10 | `verify-talkstore-points-on-product` | 톡스토어 포인트 토글 동작 | 39초 |
| T1-11 | `bulk-customs-tax-edit-then-upload` | 관/부가세 wizard 3-step 진행 | 40초 |
| T1-12 | `da-application-submit-end-to-end` | 배대지 신청서 폼 완성 + 저장 가능 | 33초 |
| T1-13 | `registered-edit-name-reupload-verify` | 등록상품 이름 수정 → 재업로드 | 2.3분 |

**합계: ≈18분** (병렬 0 — 단일 chromium 라 sequential).

### Tier 1 안의 우선순위 (실패 영향 큰 순)

- **Critical (top 5)**: T1-01 (라우팅), T1-03 (삭제), T1-09 (베이스세팅), T1-13 (재업로드), T1-04 (자동수정) — 망가지면 다음 빌드 차단
- **High (next 5)**: T1-02, T1-07, T1-08, T1-10, T1-11 — AI/포인트/벌크 수정 회귀
- **Medium (rest)**: T1-05, T1-06, T1-12 — 단일 동작 검증

---

## Tier 2 — Smoke / 라우팅 (12개) ⚠️

> **페이지 마운트 + 시그니처 노출** 만 검증. T1-01 (shell-menu-smoke-all) 와 성격 중복. 개별 영역 변경 시 spot-check 용.

| # | e2e | 페이지 | 실측 시간 |
|---|---|---|---|
| T2-01 | `verify-stock-on-product` | (기존) 재고 동기화 신호 | 30초 |
| T2-02 | `verify-market-weights-on-product` | (기존) 마켓별 무게 | 30초 |
| T2-03 | `verify-customs-tax-on-product` | (기존) 관/부가세 | 30초 |
| T2-04 | `verify-delivery-fee-on-product` | (기존) 배송비 | 30초 |
| T2-05 | `verify-product-attribute-on-product` | (기존) 속성 | 30초 |
| T2-06 | `verify-ai-translation-on-product` | AI 번역 설정 페이지 | 19초 |
| T2-07 | `verify-watermark-on-product` | 워터마크 (PRODUCT_DETAIL) | 20초 |
| T2-08 | `order-sync-list-detail` | 주문관리 마운트 | 24초 |
| T2-09 | `order-instruct-delivery-da-form` | 주문→배대지 시그니처 | 21초 |
| T2-10 | `order-cancel-exchange-return` | 취소/교환/반품 페이지 | 21초 |
| T2-11 | `plan-payment-modal-open` | 플랜 페이지 | 20초 |
| T2-12 | `staff-account-permission` | 계정관리 페이지 | 22초 |
| T2-13 | `signup-onboarding-home` | 회원가입 폼 / 로그인 redirect | 26초 |
| T2-14 | `popular-product-recommend-collect` | 인기상품 추천 페이지 | 21초 |
| T2-15 | `ai-global-collect-modal-send` | AI 전세계 수집 카드 | 21초 |
| T2-16 | `ai-thumbnail-generate-apply-upload` | AI 대표이미지 영역 | 36초 |
| T2-17 | `excel-bulk-collect-pick-upload` | 엑셀 수집 모달 | 22초 |
| T2-18 | `registered-option-price-sync` | 옵션가 영속성 (업로드 없는 축소판) | 5.7분 |

**합계: ≈14분**. T2-18 만 다소 오래 걸림 — 옵션가 reload 검증 때문. 나머지는 평균 25초.

> **T2 의 의미**: 자동 회귀로서는 가치 낮음 (T1-01 가 라우팅을 이미 cover). 단, 특정 영역 (예: 워터마크) 의 frontend refactor 가 있었을 때 spot-check 로 유용.

---

## Tier 3 — 환경 의존 / 자동 회귀 부적합 (4개) ❌

| # | e2e | 부적합 사유 |
|---|---|---|
| T3-01 | `taobao-collect-fix-upload-smartstore` | URL pool 의 타오바오 URL 일부가 만료/판매중지 — 풀 큐레이션 필요. **manual run 으로** |
| T3-02 | `tmall-collect-fix-upload-talkstore` | URL pool 에 detail.tmall.com URL 0개 (현재) — pool 채우면 동작 |
| T3-03 | `rakuten-collect-upload-smartstore` | URL pool 에 라쿠텐 URL 0개 — pool 채우면 동작 |
| T3-04 | `oauth-google-login-home` | 구글 봇 차단 — 자동화 자체가 인프라 한계 |

> **Tier 3 처리 정책**: 자동 회귀 suite 에서 빼고 README 의 "manual smoke" 섹션으로 분리. URL pool 큐레이션 룰 추가 (광고/추적 URL 자동 필터 권장).

---

## 권장 스케줄

> **단일 chromium 인스턴스 = sequential 만**. 병렬 X.

### 추천 A: 매일 1회 — Tier 1 only (≈18분)

```
05:00 KST  (수동 또는 launchd cron)
  → setup 14초
  → T1-01 ~ T1-13 sequential
  → 총 ≈18분
```

- 의미: 핵심 기능 회귀 사이클. 18분이라 출근 전 마무리.
- 실패 알림 → Slack webhook (이미 `.env.example` 에 `SLACK_WEBHOOK_URL` 슬롯 있음).

### 추천 B: 매일 + 주 1회 분리 (권장)

```
매일 (T1, 18분)        : Tier 1 13개 — 회귀 신호
주 1회 (T1 + T2, 32분) : T1 + T2 18개 — smoke 포함 sweep, 토요일 새벽
```

- 매일은 빠르게 (망가진 거 바로 알림)
- 주말 sweep 으로 dead-code 영역 (인기상품/회원가입 등) 도 cover

### 추천 C: Tier 1 안에서 다시 쪼개기 (가장 fail-fast)

```
매일 1차 smoke (5분)   : T1-01 (shell-menu) + T1-02 (url-collect) — 라우팅/수집 health 빠른 신호
매일 2차 full   (15분) : T1-03 ~ T1-13 — 핵심 회귀
주 1회         (14분)  : T2 sweep
```

- T1-01/02 가 fail 이면 인프라 자체 깨진 거라 2차 skip → 시간 절약
- 두 단계로 나누면 첫 단계 fail 시 빠른 alert

---

## 실행 명령 모음

```bash
# Tier 1 만 (매일 회귀)
npx playwright test --project=windly-e2e \
  tests/e2e/shell-menu-smoke-all.spec.ts \
  tests/e2e/url-collect-detail-smoke.spec.ts \
  tests/e2e/registered-delete-cascade.spec.ts \
  tests/e2e/red-tab-detect-fix-recheck.spec.ts \
  tests/e2e/option-normalize-then-pass-check.spec.ts \
  tests/e2e/ai-category-then-pass-check.spec.ts \
  tests/e2e/ai-name-suggest-apply-save.spec.ts \
  tests/e2e/ai-category-suggest-apply.spec.ts \
  tests/e2e/verify-base-setting-on-product.spec.ts \
  tests/e2e/verify-talkstore-points-on-product.spec.ts \
  tests/e2e/bulk-customs-tax-edit-then-upload.spec.ts \
  tests/e2e/da-application-submit-end-to-end.spec.ts \
  tests/e2e/registered-edit-name-reupload-verify.spec.ts

# Tier 1 + 2 (주 1회)
npx playwright test --project=windly-e2e

# Tier 3 (manual, URL pool 준비 후)
ATC_INPUT_PRODUCT_URL="https://item.taobao.com/item.htm?id=..." \
  npx playwright test --project=windly-e2e tests/e2e/taobao-collect-fix-upload-smartstore.spec.ts
```

---

## URL Pool 큐레이션 룰 (Tier 3 활성화 위함)

`data/url-pool.txt` 채울 때:

1. **타오바오**: `item.taobao.com/item.htm?id=...` 형태 — 광고 URL (`click.mz.simba.taobao.com`) 자동 필터.
2. **티몰**: `detail.tmall.com/item.htm?id=...` 형태.
3. **라쿠텐**: `item.rakuten.co.jp/<shop>/<sku>/` 형태.
4. 매주 ≥5개씩 새 URL 추가 (history 가 중복 차단).
5. 풀이 < 10개일 때 자동 알림 (선택 — script 작성 가능).

> 자동 필터 도입 권장: `lib/url-pool.ts` 의 `addToPool` 안에 host 화이트리스트 검증 추가.

---

## 누적 진행 (2026-06)

- 전체 e2e: 29개
- Tier 1 (회귀 가치): 13 → 모두 PASS
- Tier 2 (smoke): 16 → 모두 PASS (기존 6 + 신규 10)
- Tier 3 (환경 의존): 4 → manual run
- **자동 회귀 minimum viable: ✅ 달성**

## Handler 인프라 (이번 라운드 산출물)

share 가능한 handler 모듈 (test() 호출 없음 — e2e import 안전):

- `tests/collected-product/_ai-recommend-name-handlers`
- `tests/collected-product/_ai-recommend-category-handlers`
- `tests/collected-product/_options-a-z-normalize-handlers`
- `tests/collected-product/_edit-option-price-handlers`
- `tests/collected-product/_check-and-fix-handlers`
- `tests/upload/_single-product-handlers`
- `tests/registered-product/_handlers` (기존)
- `tests/registered-product/_delete-modal-handlers` (기존)
- `tests/delivery-agency/_da-application-handlers` (기존)
- `tests/smartstore-customs-tax/_bulk-edit-handlers` (기존)
- `tests/base-setting/_talkstore-base-handlers` (기존)
- `tests/product-collect/_url-collect-handlers` (기존)
