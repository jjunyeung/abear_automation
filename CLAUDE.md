# Windly ATC Framework — CLAUDE.md

> Playwright 기반 ATC(자동화 테스트 케이스) 실행 프레임워크.
> 자유양식 ATC를 코드로 변환·실행, 에러 시 복구 플로우 분기 후 복귀, 단계별 결과 리포팅.

이 문서는 **Claude를 위한 단일 진입점**이다. 새 세션의 Claude는 작업 시작 전 이 문서를 1회 읽으면 충분하도록 설계됐다 (R-A3.1). 결정의 근거가 더 필요할 때만 `.hoyeon/specs/atc-framework/requirements.md`로 들어간다.

> **새 ATC 만들 때는 두 문서 추가 참조 ((d) 절차 참고)**:
> - `CODE-MAP.md` — 시나리오 ↔ 윈들리 frontend 4개 레포 매핑 (어디 컴포넌트 보면 되는지, 어느 host 인지, selector 우선순위)
> - `shortcuts_index.md` — 레거시 `automation/` 코드의 헬퍼·픽스처·패턴 카탈로그 (D1 의 "패턴만 차용" 참조용)

---

## (a) 도메인 컨텍스트

### 수집 소스
- 타오바오 (`item.taobao.com`)
- 티몰 (`detail.tmall.com`)
- 라쿠텐 (`item.rakuten.co.jp`)

### 윈들리 본체
- API: `app-api.windly.cc`
- 웹앱: `app.windly.cc`
- 윈들리 Chrome 확장: 수집·가공 중계 (`WINDLY_EXTENSION_PATH` env로 로드, D7)

### 워크플로우
수집 → 가공 (이미지/카테고리/배송/속성/이름 등) → 마켓 등록 → 동기화

### 대상 마켓
스마트스토어(스스), 쿠팡, 톡스토어, 11번가, 인터파크(에스엠2), 롯데온 등.

### 용어
- **ATC** = Automated Test Case. 본 프레임워크의 단위 실행 케이스.
- **에러체크** = 상품을 마켓에 업로드 가능한 상태인지 검사하는 윈들리 기능.
- **복구 플로우** = 에러를 자동 수정하는 별도 코드 경로. `recoveries/<id>.ts`.
- **본 플로우** = ATC가 정의한 정상 시나리오.
- **on_error** = ATC step에서 매칭되면 실행할 복구 후보 목록.
- **runId** = `result_YYYY-MM-DD_HH-MM-SS` 형식의 실행 식별자 (D6).
- **ErrorKey** = `lib/errors.ts`에 등록된 복구 가능한 에러 키 유니온.
- **unhandled** = 등록되지 않은 에러. 자동 복구 시도 없이 리포트로만 기록 (D11).

---

## (b) 팀 컨벤션

- **솔로 프로젝트**. 자유롭게 작업.
- 커밋 메시지: 자유 양식 (한국어 권장).
- 브랜치 전략 없음. 필요 시 `main`에 직접 작업.
- PR/리뷰 프로세스 없음.
- 코드 주석은 한국어 OK, 식별자(파일명·함수명·타입명)는 영문 snake/camel/kebab.
- **브라우저 자동화는 무조건 이 프로젝트의 Playwright (`npm run atc`)로. chrome-devtools MCP / chromux / browser-explorer 등 외부 브라우저 도구 사용 금지.** 상세: `.claude/rules/playwright-only-browser.md`.
- **모든 ATC 실행은 무조건 1800 × 1280 윈도우 + viewport.** `page.setViewportSize` 호출 금지. 단일 source = `lib/test-fixture.ts` 의 `ATC_WINDOW_WIDTH`/`ATC_WINDOW_HEIGHT` 상수. 상세: `.claude/rules/playwright-window-size.md`.

---

## (c) 아키텍처 결정 요약 (D1-D13)

| ID  | 결정                                                                                    |
|-----|-----------------------------------------------------------------------------------------|
| D1  | 기존 `/Users/a1/automation` 패턴만 차용 (ATC 개념·확장 로딩·도메인 디렉토리)            |
| D2  | 패키지 매니저 = `npm` 단독                                                              |
| D3  | ATC DSL = YAML + 구조적 step (느슨, Claude가 정규화). 고정 키 6개: title/description?/inputs/outputs?/steps/expected (description 은 GUI 표시용 메모, 실행 무영향. outputs 는 spec.ts 의 `emitOutput()` 으로 채워 GUI 큐의 같은 batch 안 뒤 TC 의 `inputs.<name>.from: previous` 자리에 자동 주입 — 사용자 직접 입력값이 우선). |
| D4  | 복구 후 재개 = **실패 step부터** (ATC 작성자가 `on_recovery.restart_from`으로 override 가능) |
| D5  | 복구 등록 = `recoveries/<id>.ts` + ATC step의 `on_error: [<id>, ...]` 명시              |
| D6  | 리포트 = `reports/runs/{runId}/` 안 `.md` + `.json` + Playwright html                   |
| D7  | 윈들리 Chrome 확장 = 필수, headed Chromium 강제 (UI ATC에 한해). 확장은 `lib/test-fixture.ts` 의 `chromium.launchPersistentContext` 로 로드 (MV3 service worker 등록 보장). userDataDir = `.playwright-userdata/` (gitignored, 로그인 세션 유지). |
| D8  | ATC 입력 = schema-only 선언, 실행 시 주입. **우선순위: CLI 인자 > fixture > prompt**    |
| D9  | Playwright 프로젝트 = 도메인별 다중 (`windly-collect` / `error-check` / `fix` / `upload` / `e2e`) |
| D10 | CI/CD = scope 외, **로컬 전용**                                                         |
| D11 | unhandled 에러 = 즉시 실패 + 리포트 'unhandled' 기록, **자동 복구 시도 X**              |
| D12 | 복구 자체 실패 = **1회만** 시도, 본 ATC도 실패 (재귀 복구 없음)                          |
| D13 | TC 간 값 전달 = GUI 큐 안에서만. 출력 쪽 = `outputs:` 선언 + spec 의 `emitOutput()` 호출. 입력 쪽 = `inputs.<name>.from: previous`. 같은 batch (= 한 번의 "전체 실행") 내 직전 TC 의 output 이 빈 칸에만 자동 채워짐. 사용자가 큐 뷰에서 직접 입력하면 항상 그 값이 우선. 단일 실행/스케줄 spawn 등 batch 가 아닌 경로에서는 자동 주입 X. |

상세 GWT는 `.hoyeon/specs/atc-framework/requirements.md` 참조.

---

## (d) 새 ATC 추가 절차

> **항상 시작 전 참고할 두 문서**:
> - **`CODE-MAP.md`** — 시나리오 ↔ 윈들리 4개 frontend 레포 (`windly_repo/{hub,windly,sesame,koco}-frontend-web`) 매핑. 어느 컴포넌트/디렉토리 봐야 하는지, 어느 host (`app.windly.cc` vs `global.windly.cc`) 에서 도는지, selector 우선순위 (role > label > text > CSS 마지막) 등.
> - **`shortcuts_index.md`** — `/Users/a1/windly 자동화/automation/` 레거시 코드베이스의 헬퍼·픽스처·패턴 카탈로그 (D1 의 "패턴만 차용" 참조용). MENU_MAP, navigation helpers, locator 정책 등이 이미 정리되어 있어 같은 문제를 다시 풀 필요 없음.

```
0. 참고 자료 확인:
   - CODE-MAP.md §1 cross-reference 표에서 이 시나리오가 어느 앱·디렉토리에 매칭되는지 1줄 확인
   - 신/구 (windly-frontend-web vs sesame, view3 vs view2) 둘 다면 사용자에게 어느 거인지 한 번 되묻기
   - 새 selector 가 필요하면 해당 컴포넌트 1회 read → user-perspective selector (role/text/label) 추출
   - shortcuts_index.md 에 비슷한 헬퍼/패턴이 있는지 grep — 있으면 그 패턴 참고 (코드는 직접 import 하지 말고, 우리 lib/windly-actions 에 그 패턴 적용)

1. /atc-new 호출 (또는 사용자 의도 듣고 직접):
   - 도메인 분류 → atcs/<domain>/<name>.atc.yml
   - 도메인 후보: collect, error-check, fix, upload, e2e (D9)
   - YAML 작성: title / inputs (schema only, D8) / outputs? / steps / expected
   - 각 step: { id, do (한국어 자연어), on_error?, on_recovery?, expect? }
   - **login / enter_workspace step 은 적지 않는다** — setup project 가 미리 처리 ((j) 참조)
   - 진입·검색·상세 진입 같은 공통 액션은 `lib/windly-actions.ts` 헬퍼 사용 ((k) 참조)
   - 큰 시나리오는 작은 ATC 들의 `composes` 컴포지션으로 ((l) 참조)
   - 뒤 TC 와 값(예: source_product_id) 을 이어 쓰고 싶으면 (D13):
     - 발급하는 TC: 최상위 `outputs:` 에 같은 이름으로 선언 + spec.ts 에서 `emitOutput('<name>', value)` 호출
     - 받는 TC: `inputs.<name>.from: previous` 만 추가하면 GUI 큐의 같은 batch 안 자동 주입
2. 대응 spec 작성: tests/<domain>/<name>.spec.ts
   - vertical slice exemplar (tests/collect/product-error-check.spec.ts) 패턴 그대로
   - StepHandlers 정의 — step.id ↔ Playwright 액션 매핑 (login/enter_workspace 핸들러 불필요)
   - runATC() 호출 → test.info().attach('atc-result', ...) 호출 (필수, 리포터가 이걸 읽음)
   - outputs 선언했으면 step 안에서 `emitOutput()` 호출 (lib/atc-output.ts) — runner 가 끝에서 한 번에 수확
3. 실행:
   npx playwright test --project=windly-<domain> tests/<domain>/<name>.spec.ts
   (npm run atc -- ... 는 spec.ts 만 매칭 가능 — atc.yml 직접 못 넘김)
```

ATC 파일 위치·확장자·스키마 규칙은 `.claude/rules/atc-file-layout.md` 참조 (C3, D3).

---

## (e) 새 복구 추가 절차

```
1. /recovery-new <id> 호출 (또는 직접):
   - recoveries/<id>.ts 작성
   - 시그니처: export async function recover(page: Page, ctx: RecoveryContext): Promise<void>
   - ctx 4 필드: error_key, page_url, last_step_id, screenshot_path
2. lib/errors.ts 의 KnownErrorKey 유니온에 '<id>' 추가
3. 해당 ATC step 의 on_error 배열에 '<id>' 등록
4. 자동 wiring 없음 — recovery-registry 가 파일명으로 매칭 (lazy import)
```

복구 파일 규칙: `.claude/rules/recovery-file-layout.md`. 핵심 제약:

- 단일 함수 export (1 file = 1 `recover`).
- **Nested `recover()` 호출 절대 금지** (C7).
- **Unmatched 에러를 catch-all로 자동 복구하지 마라** — 무조건 unhandled 리포트 (C8).
- 복구 자체 실패 시 throw → runner 가 1회 실패로 기록 (D12).

---

## (f) 사용 가능 스킬 (`.claude/skills/`)

모두 `disable-model-invocation: true` — **사용자가 명시 호출**할 때만 트리거.

- **/atc-new** — 자유양식 ATC 설명 → `atcs/<domain>/<name>.atc.yml` + `tests/<domain>/<name>.spec.ts` 스캐폴드.
- **/atc-run** — ATC 실행. 입력 주입 우선순위 = CLI 인자 > fixture > interactive prompt (D8).
- **/recovery-new** — `recoveries/<id>.ts` 스캐폴드 + `KnownErrorKey` 유니온 추가 가이드.
- **/atc-report** — 최신 또는 지정 runId 의 `.md` 리포트 출력. unhandled 섹션을 강조 표시.

---

## (g) 활성 훅 (`.claude/settings.json`)

| 훅 시점       | 매처                                  | 동작                                                                      |
|---------------|----------------------------------------|---------------------------------------------------------------------------|
| PostToolUse   | Edit / Write / MultiEdit on `*.ts`    | `npx tsc --noEmit` 실행 (비차단 경고, 타입 에러 즉시 알림 — R-A10.1)      |
| PreToolUse    | Edit / Write / MultiEdit on `.env*`   | 차단. 단 `.env.example`은 명시 예외 — Claude 편집 허용                    |
| PreToolUse    | Edit / Write / MultiEdit on lockfile  | `package-lock.json` 직접 편집 차단 (의존성은 `npm install`로만 — R-A10.3) |

---

## (h) 의존성 방향

```
atcs/*.atc.yml          (선언형 데이터, YAML)
        ↓ (loadATC)
tests/<domain>/*.spec   (StepHandlers 정의 — step.id ↔ Playwright 액션)
        ↓ (runATC, 'test' import는 lib/test-fixture)
lib/test-fixture        (chromium.launchPersistentContext + 확장 로드 + service worker 대기)
lib/runner              ← lib/atc-schema, lib/errors, lib/recovery-registry, lib/atc-loader
                              ↑
                        recoveries/<id>.ts (RecoveryContext만 의존)
        ↓ (test.info().attach('atc-result', ...))
reporters/atc-reporter  → reports/runs/{runId}/{runId}.md + .json
```

규칙:

- **단방향**: `lib/`는 `recoveries/`, `atcs/`, `tests/` 어느 것도 import 하지 않는다.
- **`recoveries/`는 ATC 프레임워크 핵심 (`atc-loader`, `runner`, `recovery-registry`, `atc-schema`)을 import 하지 않는다** (recovery 가 자기 자신을 트리거하는 순환 방지). 단, `lib/errors`의 `RecoveryContext`, `lib/logger`, `lib/tab-error-fix` 같은 windly UI/유틸 helper 모듈은 import 가능 — 공통 패턴을 재사용하기 위함.
- **`tests/`는 `atcs/`(YAML)을 데이터로만** 읽고, `lib/runner`를 통해서만 실행 (raw Playwright만 쓰는 경우 ATC 프레임워크 밖이므로 권장하지 않음).

---

## (i) 새 종류 unhandled 에러 발견 시 운영 워크플로우 (KG1)

unhandled 에러는 자동 복구 시도 없이 리포트에만 기록된다 (D11). 발견 후 절차:

1. `reports/runs/<runId>/<runId>.md` 의 **🚨 Unhandled 에러 요약** 섹션에서 `error_key`, `last_step_id`, `screenshot_path` 확인.
2. 이 에러가 **반복적**이라면 (스크린샷·타이밍 문제 아닌 진짜 새 케이스):
   - `/recovery-new <error_key>` 실행 → `recoveries/<error_key>.ts` 스캐폴드.
   - 실제 윈들리 자동화 코드로 본문 채우기 (Playwright 액션, 검증 포함).
   - `lib/errors.ts` 의 `KnownErrorKey` 유니온에 새 키 추가.
   - 영향받는 ATC step 의 `on_error` 배열에 `'<error_key>'` 등록.
3. 다시 `npm run atc -- <같은 ATC>` 실행 → unhandled가 사라지고 정상 복구 경로로 동작하는지 확인.
4. **일회성 환경 문제** (네트워크 일시 단절, 윈들리 서버 점검 등) 이면 recoveries 추가 없이 재실행만.

---

## (j) 인증 패턴 — setup project (REFACTOR §1)

모든 도메인 프로젝트(`windly-collect/error-check/fix/upload/e2e`)는 `dependencies: ['setup']` 으로 묶여 있어 ATC 가 시작되기 전 `tests/auth.setup.ts` 가 먼저 1회 실행된다.

```
tests/auth.setup.ts
  ├ loginIfNeeded(page)           ← .env 의 WINDLY_LOGIN_EMAIL/PASSWORD
  └ enterHaegudaeWorkspace(page)  ← 허브 화면이면 카드 클릭, 아니면 통과
```

- 첫 실행: 진짜 로그인 + 해구대 진입 → `.playwright-userdata/` 에 세션 박제.
- 이후 실행: `loginIfNeeded` 가 폼 미노출이면 fast-pass.
- `.playwright-userdata/` 가 지워지면 다음 setup 실행이 자동으로 다시 로그인.

**규칙**: 새 ATC YAML 에 `login` / `enter_workspace` step 을 적지 마라. 매 ATC 가 그 step 으로 시작하던 보일러플레이트는 setup project 로 통합됐다. spec.ts 에도 그 핸들러를 안 둔다.

`storageState` 파일(`.auth/user.json`) 은 의도적으로 사용 안 함 — `chromium.launchPersistentContext` (D7) 가 storageState 주입을 지원하지 않고 persistent userDataDir 자체가 동일 효과를 제공.

---

## (k) 공통 액션 — `lib/windly-actions.ts` (REFACTOR §2)

진입·검색·상세 진입 같은 spec 간 반복되는 동작은 `lib/windly-actions.ts` 의 헬퍼 함수로 추출돼 있다. 새 spec 작성 시 raw Playwright 셀렉터를 다시 적기 전에 먼저 여기를 확인.

| 함수                          | 동작                                                          |
|-------------------------------|---------------------------------------------------------------|
| `loginIfNeeded(page)`         | 로그인 폼 노출 시만 .env 자격증명으로 로그인 (setup 전용)     |
| `enterHaegudaeWorkspace(page)`| 허브 카드 화면이면 해외구매대행 진입 (setup 전용)             |
| `goToCollectImportMenu(page)` | 사이드바 "상품 수집" 메뉴 (`/view3/product-import`) 이동       |
| `goToCollectedProducts(page)` | 사이드바 "수집상품" 목록 (`/view2/interested-product`) 이동   |
| `goToRegisteredProducts(page)`| 사이드바 "등록상품" 목록 (`/view2/registered-product`) 이동   |
| `searchByProductCode(page, id)` | "상품 코드 검색" 모달 → ID 입력 → 검색 → 결과 카드 카운트 반환 |
| `openFirstSearchResult(page)` | 검색 결과 첫 카드 클릭하여 상세 진입 (0개면 throw)            |
| `clickFirstVisible(page, locators)` | 후보 locator 중 먼저 visible 한 것 클릭                |
| `extractProductId(url)`       | 티몰/타오바오 URL 의 `id=` query string 추출                  |

**규칙**: spec.ts 의 step handler 안에서 동일 동작을 raw Playwright 로 다시 짜고 있다면 — 그 함수가 windly-actions 에 이미 있는지 먼저 확인. 새 공통 패턴이 발견되면 windly-actions 에 추가하고 다른 spec 도 마이그레이션.

**참조**: `shortcuts_index.md` 에 레거시 `automation/` 코드베이스의 비슷한 헬퍼/픽스처들이 카탈로그되어 있음 (MENU_MAP, navigation helpers, locator 정책 등). 새 헬퍼 추가 전 거기서 비슷한 게 있는지 1회 grep — 같은 문제를 다시 풀 필요 없음 (단, 코드 직접 import X — 패턴만 차용 D1).

---

## (l) ATC 컴포지션 — `composes` 필드 (REFACTOR §3)

큰 시나리오 ATC 를 작은 조각 ATC 들의 조합으로 표현 가능. 작은 거 따로 돌리고 e2e 는 회귀.

### 컨벤션

- 조각 ATC = `_<name>.atc.yml` (언더스코어 prefix). 단독 실행도 가능.
- 완성된 시나리오 ATC = 일반 이름. 보통 `composes` 사용.
- 둘 다 같은 도메인 디렉토리 안 (`atcs/<domain>/`).

### 스키마

```yaml
title: 단건 상품 업로드 e2e
inputs:
  source_product_id:
    type: string
    example: '235442266'
composes:
  - ./_search-product.atc.yml
  - ./_open-product-detail.atc.yml
  - ./_trigger-upload.atc.yml
  - ./_verify-in-registered.atc.yml
steps:                  # 선택 — 부모 자체 step 도 추가 가능 (composes 펼침 뒤에 append)
  - id: extra_check
    do: 추가 검증
expected: 업로드 성공 + 등록상품 매칭. unhandled 0건.
```

### 펼침 규칙 (lib/atc-loader.ts)

- `composes` 의 child 들을 **순서대로** 재귀 로드 → 그 child.steps 들을 본 ATC 의 steps **앞에** prepend.
- 경로는 본 ATC 파일 기준 상대 (`./_x.atc.yml`).
- 순환 참조 = throw (체인 표시).
- **inputs 자동 병합 안 함** — 부모 ATC 가 명시 선언해야 함 (D8 일관성, 디버깅 용이성).
- 부모 spec.ts 는 펼쳐진 모든 step.id 의 handler 를 가져야 함 — 부모/조각 spec 이 동일 handler 모듈을 share 하는 게 권장 패턴 (e.g. `tests/upload/_handlers.ts`).

### 실행

```bash
# 조각 단독
npx playwright test tests/upload/_search-product.spec.ts

# composes 펼친 e2e
npm run atc -- atcs/upload/single-product.atc.yml --source_product_id=235442266
```

---

## (m) 백엔드 / 외부 의존성 일시 오류 retry + 버그 리포트 정책

ATC step 핸들러 안에서 **백엔드 응답이 retry 가능한 형태로 실패** (e.g. 윈들리 `WS1014` "다시 클릭해주세요" 토스트, 일시 race condition 등) 하면 **최대 3회 retry**. 3회 모두 실패하면 즉시 fail 로 종료하고 **버그 리포트 MD** 를 프로젝트 루트에 작성한다.

### Retry 적용 / 비적용

| 적용 OK (retry) | 적용 X (즉시 fail) |
|---|---|
| 백엔드 retry 가능 에러 코드 (예: WS1014) | 입력 validation 실패 (필드 누락 / 형식 오류) |
| 네트워크 timeout / connection reset | 권한 / 자원 없음 (403 / 404) |
| 일시 race / debounce 직후 미반영 | ATC 프레임워크 자체 에러 (handler missing 등) |

### Step 핸들러 패턴

```ts
const MAX_ATTEMPTS = 3;
for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
  const outcome = await tryOnce(page);
  if (outcome === 'success') return { ok: true };
  if (outcome === 'retryable') {
    logger.info(`[<step>] 시도 ${attempt}/${MAX_ATTEMPTS} → retry`);
    await page.waitForTimeout(1_000);   // throttle / debounce 여유
    continue;
  }
  return { ok: false, error_key: '...', message: '...' };   // non-retryable
}
return {
  ok: false, error_key: '...',
  message: '백엔드 N회 retry 실패. 버그 리포트 작성 권장.',
};
```

### 3회 실패 시 버그 리포트

- 파일: `bug-report-<area>-<short-id>.md` (프로젝트 루트). 예: `bug-report-delivery-agency-WS1014.md`.
- 톤: **개발자 (백엔드 + 프론트) 가 디버깅 시작할 수 있게** — 자동화 framing 최소화.
- 포함:
  1. 1줄 요약 + 영향 API/화면 + 우선순위
  2. 사용자 플로우 (재현 절차 — 화면 기준, 자동화 step ID 가 아니라)
  3. 백엔드 응답 (HTTP / payload / error code)
  4. 프론트 분기 코드 위치 (`src/...:line-line`)
  5. 가설 (개발자 단서)
  6. 요청 (단기 fix / 장기 정책)
  7. 마지막 줄에 ATC 자동 재현 경로 1줄

레퍼런스 예시: `bug-report-delivery-agency-WS1014.md`.

---

## 빠른 시작

```bash
# 1) 환경 변수
cp .env.example .env
vi .env   # WINDLY_BASE_URL, WINDLY_EXTENSION_PATH 등 채우기

# 2) Playwright 브라우저 (최초 1회)
npx playwright install chromium

# 3) 타입 체크
npm run typecheck

# 4) vertical slice 실행 (윈들리 로그인·확장 필요)
npm run atc -- atcs/collect/product-error-check.atc.yml \
  --url=https://item.taobao.com/item.htm?id=...
```

---

## requirements.md

프레임워크의 모든 결정·제약·요건은 `.hoyeon/specs/atc-framework/requirements.md` 에 정규화되어 있다. 새로운 결정을 내리기 전 항상 그 문서를 우선 참조하고, 결정이 추가/변경되면 그곳을 업데이트한 뒤 본 CLAUDE.md 의 (c) 표를 동기화한다.
