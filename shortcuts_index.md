# Automation Shortcuts Index

자동화 코드베이스에서 단축어/SSOT(단일 진실 공급원) 패턴으로 정리되어 있는 헬퍼·픽스처·상수 모음.

> 스캔 일자: 2026-05-06
> 루트: `/Users/a1/windly 자동화/automation`

---

## 1. 메뉴 / 네비게이션 (가장 핵심)

| 항목 | 위치 | 용도 |
|---|---|---|
| `MENU_MAP` | `tests/fixtures/extensionFixture.ts:59` | 메뉴명 → URL 매핑 21개 (단일 진실 공급원) |
| `authPage.goTo('수집상품')` | `tests/fixtures/extensionFixture.ts` | 메뉴 이동 + 모달 제거 + 익스텐션 확인 한방 |
| `navLogin` / `navToOverseasService` / `navToCollectedProducts` / `navToProductDetail` | `src/helpers/navigation.ts` | 단계별 네비게이션 |
| `loginAndNavigateToCollectedProducts` / `loginAndNavigateToProductDetail` | `src/helpers/navigation.ts` | 로그인+이동 풀 플로우 한방 |

### MENU_MAP 등록 메뉴 (21개)

- **홈**: 홈
- **상품 수집**: 상품 수집, AI 전세계 상품 수집, 1688 상품 검색, 인기 상품 추천
- **상품 관리**: 수집상품, 등록상품, 재고 업데이트
- **분석**: 상품 순위 분석, 유입수 분석
- **주문/CS**: 주문 관리, 문의 관리, 취소/교환/반품 관리
- **배송**: 배송대행지, 통관고유부호 조회
- **설정**: 연결 설정, 기본 설정, 단어 설정, 직원 관리
- **기타**: 공지사항, 플랜 결제

---

## 2. Playwright 픽스처 (test 베이스)

| 항목 | 위치 | 용도 |
|---|---|---|
| `extensionFixture.ts` (`{test, expect}`) | `tests/fixtures/extensionFixture.ts:175` | **확장 활성화 + authPage + collectedPage** — UI 테스트의 표준 베이스 |
| `src/fixtures/auth.ts` (`{test}`) | `src/fixtures/auth.ts:13` | API 토큰 자동 주입 픽스처 (API 테스트용) |
| `_autoSetup` | `tests/fixtures/extensionFixture.ts:28` | 모든 테스트 시작 전 자동 모달 제거 + 익스텐션 보장 |

---

## 3. 환경 변수

| 항목 | 위치 | 용도 |
|---|---|---|
| `env` | `src/fixtures/env.ts:11` | `.env` 변수 한 객체로 묶음 (baseUrl, email, password, accessToken, planId, testProductId 등) |
| `getAuthToken()` | `src/fixtures/env.ts:28` | 토큰 가져오기 단축 |

---

## 4. UI 액션 헬퍼 (반복 작업 단축)

| 함수 | 위치 | 용도 |
|---|---|---|
| `inputAndBlur(locator, value, fieldDesc)` | `src/helpers/uiActions.ts:31` | 입력+blur+에러 메시지 한방 |
| `waitForToast(page, expected)` | `src/helpers/uiActions.ts:114` | 성공/실패 토스트 대기 |
| `assertToastSuccess(result)` | `src/helpers/uiActions.ts:146` | 토스트 결과 단언 |
| `expectValidationMessage(...)` | `src/helpers/uiActions.ts:197` | validation 메시지 검증 |
| `clickAndWait(...)` | `src/helpers/uiActions.ts:255` | 클릭+응답 대기 결합 |
| `safeClick(locator, opts)` | `src/utils/uiHelper.ts:193` | normal → force → React Fiber 순차 시도 |
| `triggerReactClick(locator)` | `src/utils/uiHelper.ts:121` | React Fiber `memoizedProps.onClick` 직접 호출 (저수준) |
| `dismissNoticeModal(page)` | `src/utils/uiHelper.ts:38` | 공지사항 모달 + backdrop 자동 제거 |
| `ensureExtensionInstalled(page)` | `src/utils/uiHelper.ts:85` | `extension-installed` 속성 보장 |

---

## 5. 로케이터 정책 (셀렉터 안정화)

| 항목 | 위치 | 용도 |
|---|---|---|
| `LocatorStrategy` 타입 | `src/helpers/locatorHelper.ts:21` | testId → role → label → text → css 우선순위 정책 |
| `resolveLocator(page, strategy)` | `src/helpers/locatorHelper.ts:90` | 정책 기반 locator 생성 |
| `findVisible(...)` | `src/helpers/locatorHelper.ts:108` | 보이는 요소 단축 탐색 |
| `clickTab(page, tabName)` | `src/helpers/locatorHelper.ts:163` | 탭 클릭 단축 |

---

## 6. 페이지 오브젝트

| 항목 | 위치 | 용도 |
|---|---|---|
| `CollectedProductPage` | `src/pages/collectedProductPage.ts:56` | 수집상품 상세: navigate / getProductIdFromUrl / 상품명 fill+save 등 일괄 |

---

## 7. API 클라이언트

| 항목 | 위치 | 용도 |
|---|---|---|
| `windlyGet<T>(...)` | `src/clients/windlyApiClient.ts:20` | 윈들리 API GET 단축 |
| `loginAndGetToken(request)` | `src/clients/authClient.ts:13` | 로그인→토큰 발급 |
| `ApiClient` 클래스 | `src/helpers/apiClient.ts:21` | 공통 API 호출 베이스 |
| `CollectedProductApi` 클래스 | `src/helpers/collectedProductApi.ts:33` | 수집상품 API 전용 메서드 묶음 |

---

## 8. 검증 (Validators)

| 항목 | 위치 | 용도 |
|---|---|---|
| `commonValidators` | `src/validators/commonValidators.ts` | OK 응답, 필드 존재, 리스트 구조 등 공통 단언 |
| `windlyValidators` | `src/validators/windlyValidators.ts` | 계정/공지/온보딩/플랜/구독 등 도메인 단언 (10여 개) |
| `p1Validators` / `p2Validators` | `src/validators/p1Validators.ts` / `p2Validators.ts` | P1/P2 시나리오 전용 단언 |
| `apiDiffValidator` | `src/validators/apiDiffValidator.ts` | `snapshotBefore` → 동작 → `snapshotAfter` → `assertFieldChanged*` 변경 추적 |

---

## 9. 상태 스냅샷

| 항목 | 위치 | 용도 |
|---|---|---|
| `captureSnapshot(...)` | `src/state/stateCollector.ts:31` | UI/API 상태 한 번에 스냅샷 |
| `summarizeSnapshot(snapshot)` | `src/state/stateCollector.ts:128` | 스냅샷 요약 출력 |

---

## 10. 로깅 / 유틸

| 항목 | 위치 | 용도 |
|---|---|---|
| `stepLogger` | `src/helpers/stepLogger.ts:32` | `step / pass / info / warn` 표준 로그 |
| `sanitize(obj)` | `src/utils/sanitize.ts:48` | 비밀값 마스킹 |
| `skipIf({condition, testId, reason, hint})` | `src/utils/skip.ts:26` | 조건부 스킵 단축 |
| `logRequest` / `logResponse` / `logError` | `src/utils/logger.ts` | API 호출 로깅 |

---

## 한 줄 요약 — 새 spec 시작 템플릿

새 spec 짤 때 보통 이 4개만 import 하면 80%는 끝.

```ts
import { test, expect, MENU_MAP } from 'tests/fixtures/extensionFixture';
import { env } from 'src/fixtures/env';
import { inputAndBlur, waitForToast, assertToastSuccess } from 'src/helpers/uiActions';
import { stepLogger } from 'src/helpers/stepLogger';

test('...', async ({ authPage }) => {
  await authPage.goTo('수집상품');
  // ...
});
```

---

## 메뉴 추가 시 체크리스트

1. `tests/fixtures/extensionFixture.ts`의 `MENU_MAP`에 항목 추가
2. 카테고리 주석(`── 상품 관리 ──` 등)에 맞춰 배치
3. URL은 실제 LNB 스캔으로 확인된 값 기준
4. 새 spec에서 `authPage.goTo('새메뉴명')`으로 즉시 사용 가능
