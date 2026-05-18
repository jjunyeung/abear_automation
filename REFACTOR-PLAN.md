# Windly ATC Framework — 리팩토링 작업 지시서

> **목적**: 일주일 사용 후 발견된 **입자성(granularity) 문제** 해결.
> ATC 8개 + spec 8개 + recovery 9개 자산은 **그대로 살림**. 갈아엎기 X, 좁게 추가만.
>
> **작성**: 2026-04-28 합의 (옵션 A/B/C 풀패키지 또는 단계별)
> **실행 위치**: 새 Claude Code 세션 in `/Users/a1/windly 자동화/`

---

## 0. 배경 — 왜 이 리팩토링인가

### 현재 자산
- `atcs/`: 8개 ATC YAML (collect 2 + error-check 1 + upload 5)
- `tests/`: 8개 spec.ts (1:1 매칭)
- `recoveries/`: 9개 fixer (`missing_image`, `name_too_long`, `tab_*` 7개)
- `lib/`: runner, atc-loader, recovery-registry, errors, atc-schema, config, logger
- `reporters/atc-reporter.ts`, `playwright.config.ts` (5 도메인 프로젝트)

### 진단된 문제 3가지

**1) login + 해구대 + 메뉴 이동이 매 ATC마다 반복**
- 모든 ATC가 `login → enter_workspace → open_<menu> → ...` 4 step으로 시작
- ATC 8개 = 진입 보일러플레이트 32 step
- login 자체 검증은 0번. login 실패하면 모든 ATC가 같이 망함

**2) 한 ATC가 너무 큰 시나리오를 한 번에 다룸**
- `single-product.atc.yml`: 로그인부터 등록 검증까지 9 step
- 한 군데 막히면 처음부터 다시. 디버그 사이클 길음
- "검색 모달만 다시" / "업로드만 재실행" 같은 부분 실행 어려움
- 사용자 멘탈 모델("작게 쪼개고 조합")이 표현 안 됨

**3) ATC 사이 step 공유 메커니즘 부재**
- ATC YAML 구조가 step을 다른 ATC에서 import 못 함
- 매번 복붙. DRY 위반

### 사용자 원문 (이 리팩토링의 진짜 동기)
> "내가 생각했던 작업이랑 실제로 하고있는 작업에 괴리감이 좀 있어
> 케이스를 좀더 나누면서 진행해야 하는데 지금 하고있는건 한번에 모든 플로우를 보는 느낌이랄까"

---

## 1. 작업 A — Playwright storageState로 로그인 1회만

**목표**: 모든 ATC에서 `login`, `enter_workspace` step 제거 가능하게.

**소요**: 30분

### 1.1 만들 파일

#### `tests/auth.setup.ts` (신규)
```typescript
import { test as setup, expect } from '@playwright/test';
import { join } from 'path';

const STORAGE = join(__dirname, '..', '.auth', 'user.json');

setup('login + enter workspace', async ({ page }) => {
  const email = process.env.WINDLY_LOGIN_EMAIL;
  const password = process.env.WINDLY_LOGIN_PASSWORD;
  if (!email || !password) throw new Error('WINDLY_LOGIN_EMAIL/PASSWORD env 미설정');

  // 1. 로그인 페이지 진입
  await page.goto('https://app.windly.cc/login');  // 실제 URL 확인 필요
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', password);
  await page.click('button[type=submit]');

  // 2. 워크스페이스 선택 (해구대) — 표시되면 클릭, 이미 진입돼 있으면 통과
  // (실제 selector는 기존 ATC들의 step을 보고 추출 — atcs/collect/tmall-single.atc.yml의
  //  enter_workspace step.do 참조)
  // 예: await page.locator('text=해구대').click().catch(() => {});

  // 3. 로그인 + 워크스페이스 진입 확인 (도메인이 app.windly.cc/{workspace}/... 형태)
  await expect(page).toHaveURL(/app\.windly\.cc/);

  // 4. storageState 저장
  await page.context().storageState({ path: STORAGE });
});
```

> **주의**: 위 selector(`input[type=email]` 등)는 **추정값**. 실제 selector는 다음 둘 중 하나로 정확히 잡아야 함:
> - 기존 ATC들의 `login` step.do 텍스트 + 실제 화면 매칭
> - 또는 `npx playwright codegen https://app.windly.cc/login`으로 한 번 클릭 기록 후 추출

### 1.2 수정 파일

#### `playwright.config.ts` (수정)
- `projects` 배열에 setup 프로젝트 추가 + 5 도메인 프로젝트에 `dependencies: ['setup']` + `storageState` 지정

```typescript
projects: [
  {
    name: 'setup',
    testMatch: /auth\.setup\.ts$/,
    use: {
      ...devices['Desktop Chrome'],
      channel: extensionPath ? undefined : 'chromium',
      launchOptions: extensionLaunchOptions,
    },
  },
  {
    name: 'windly-collect',
    testMatch: 'tests/collect/**/*.spec.ts',
    dependencies: ['setup'],         // ← 추가
    use: {
      ...devices['Desktop Chrome'],
      channel: extensionPath ? undefined : 'chromium',
      launchOptions: extensionLaunchOptions,
      storageState: '.auth/user.json',  // ← 추가
    },
  },
  // windly-error-check, windly-fix, windly-upload, windly-e2e 모두 동일하게 추가
],
```

#### `.gitignore` (수정)
- `.auth/` 추가 (세션 파일은 커밋 X)

### 1.3 검증
```bash
cd "/Users/a1/windly 자동화"
npx playwright test --project=setup     # setup만 1회 실행 → .auth/user.json 생성 확인
npx playwright test --project=windly-collect tests/collect/tmall-single.spec.ts
# → 로그인 step 없이 바로 수집 메뉴부터 시작되는지 확인
```

### 1.4 후속 — ATC들에서 보일러플레이트 step 제거
8개 ATC YAML + 8개 spec.ts에서 `login`, `enter_workspace` step 제거.
선택적으로 `open_<menu>` step도 lib/flows로 옮기면 더 줄음 (작업 B에서 처리).

---

## 2. 작업 B — 공통 step을 `lib/flows/`로 추출

**목표**: 진입·검색·상세 진입 같은 공통 동작을 helper 함수로. 새 ATC 짤 때 안 적어도 됨.

**소요**: 30분 ~ 1시간

### 2.1 만들 파일

#### `lib/flows/index.ts` (신규)
```typescript
export * from './enterCollectMenu';
export * from './enterRegisteredList';
export * from './searchProductByCode';
export * from './openProductDetail';
```

#### 각 flow 파일 (신규 4개)
각각 한 함수만 export:

```typescript
// lib/flows/enterCollectMenu.ts
import type { Page } from '@playwright/test';

export async function enterCollectMenu(page: Page): Promise<void> {
  // 좌측 사이드바 "상품 수집" 메뉴 클릭
  await page.locator('aside').getByText('상품 수집').click();
  await page.waitForLoadState('networkidle');
}
```

```typescript
// lib/flows/enterRegisteredList.ts
export async function enterRegisteredList(page: Page): Promise<void> {
  await page.locator('aside').getByText('등록상품').click();
  await page.waitForLoadState('networkidle');
}
```

```typescript
// lib/flows/searchProductByCode.ts
export async function searchProductByCode(page: Page, code: string): Promise<void> {
  // 검색 모달 열기 + 코드 입력 + 검색
  await page.click('[data-action=open-search]');
  await page.fill('[data-field=product-code]', code);
  await page.click('button:has-text("검색하기")');
  await page.waitForLoadState('networkidle');
}
```

```typescript
// lib/flows/openProductDetail.ts
export async function openProductDetail(page: Page): Promise<void> {
  // 검색 결과/목록의 첫 카드 클릭
  await page.locator('.product-card').first().click();
  await page.waitForLoadState('networkidle');
}
```

> **selector는 모두 추정값**. 기존 8개 ATC + spec.ts들의 step.do와 실제 코드를 보고 정확한 selector로 교체.
> 빠른 방법: 각 flow를 하나씩 spec에서 호출 → 실패하면 selector 보정 → 통과하면 다음.

### 2.2 ATC + spec 마이그레이션 패턴

기존:
```yaml
# atcs/upload/single-product.atc.yml
steps:
  - id: login
  - id: enter_workspace
  - id: open_collected_list      # 제거 → flow로
  - id: search_product           # 제거 → flow로
  - id: open_detail              # 제거 → flow로
  - id: trigger_upload           # 본질
  - id: wait_upload_complete     # 본질
  - id: open_registered_list     # 제거 → flow로
  - id: verify_in_registered     # 본질
```

변경:
```yaml
# atcs/upload/single-product.atc.yml
steps:
  - id: trigger_upload
    do: 검색·상세 진입 후 업로드 트리거 (전 마켓 또는 기본 설정 마켓)
  - id: wait_upload_complete
    do: 업로드 완료 대기 (최대 180초)
  - id: verify_in_registered
    do: 등록상품 페이지에서 source_product_id 검색 → 1건 이상 매칭 확인
```

```typescript
// tests/upload/single-product.spec.ts
import { test } from '@playwright/test';
import * as flows from '../../lib/flows';
// ...

test('단건 상품 업로드 후 등록상품 검증', async ({ page }) => {
  // 진입 — flow로 한 번에
  await flows.enterCollectMenu(page);
  await flows.searchProductByCode(page, inputs.source_product_id);
  await flows.openProductDetail(page);

  // 본질 — runner로
  const result = await runATC({ atc, page, inputs, handlers: { ... } });

  // 검증 — flow로
  await flows.enterRegisteredList(page);
  await flows.searchProductByCode(page, inputs.source_product_id);
  // 결과 확인
});
```

### 2.3 검증
- 8개 ATC 중 1개씩 마이그레이션 → 통과 확인 → 다음
- 마이그레이션 후 step 평균 9 → 4 (60% 감소)
- `npx tsc --noEmit` 통과

---

## 3. 작업 C — ATC 컴포지션 (큰 ATC = 작은 ATC들의 조합)

**목표**: `single-product`처럼 큰 시나리오를 작은 ATC들의 조합으로 표현. 작은 거 따로 돌리고 e2e는 회귀.

**소요**: 1~2시간

### 3.1 atc-schema.ts 확장 — `composes` 필드 추가

```typescript
// lib/atc-schema.ts
export const atcSchema = z.object({
  title: z.string(),
  inputs: z.record(z.string(), inputSchemaSchema).default({}),
  steps: z.array(stepSchema).optional(),       // composes 있으면 비울 수 있게
  composes: z.array(z.string()).optional(),    // ← 추가: ATC 파일 경로 목록
  expected: z.string().optional(),
}).refine(
  (atc) => (atc.steps && atc.steps.length > 0) || (atc.composes && atc.composes.length > 0),
  { message: 'steps 또는 composes 중 최소 하나는 있어야 함' }
);
```

### 3.2 atc-loader.ts 확장 — composes 자동 펼치기

```typescript
// lib/atc-loader.ts
export function loadATC(path: string): ATC {
  const raw = readFileSync(path, 'utf8');
  const obj = parse(raw);
  const result = atcSchema.safeParse(obj);
  if (!result.success) throw ...;

  const atc = result.data;

  // composes 펼치기
  if (atc.composes && atc.composes.length > 0) {
    const expandedSteps = [];
    for (const childPath of atc.composes) {
      const resolvedPath = resolve(dirname(path), childPath);
      const child = loadATC(resolvedPath);  // 재귀
      expandedSteps.push(...(child.steps ?? []));
    }
    return { ...atc, steps: [...expandedSteps, ...(atc.steps ?? [])] };
  }
  return atc;
}
```

### 3.3 예제 마이그레이션 — `single-product` 분해

작은 ATC 4개 + e2e 1개:

```yaml
# atcs/upload/_search-product.atc.yml  (언더스코어 = "조각" 컨벤션)
title: 상품 코드로 수집상품 검색
inputs:
  source_product_id:
    type: string
steps:
  - id: search_product
    do: 검색 모달 열고 source_product_id 입력 후 검색
expected: 검색 결과 1건 이상
```

```yaml
# atcs/upload/_open-product-detail.atc.yml
title: 검색 결과 첫 상품 상세 진입
inputs: {}
steps:
  - id: open_detail
    do: 첫 카드 클릭하여 상세 진입
```

```yaml
# atcs/upload/_trigger-upload.atc.yml
title: 상품 상세에서 업로드 트리거
inputs: {}
steps:
  - id: trigger_upload
    do: 업로드 버튼/아이콘 클릭. 모달이 뜨면 진행 옵션 확정
  - id: wait_upload_complete
    do: 업로드 완료 대기 (최대 180초)
```

```yaml
# atcs/upload/_verify-in-registered.atc.yml
title: 등록상품 목록에서 상품 코드 매칭 확인
inputs:
  source_product_id:
    type: string
steps:
  - id: verify_in_registered
    do: 등록상품 페이지에서 source_product_id 검색 → 1건 이상 확인
```

```yaml
# atcs/upload/single-product.atc.yml  (e2e — 위 4개의 컴포지션)
title: 단건 상품 업로드 e2e (검색 → 상세 → 업로드 → 등록 검증)
inputs:
  source_product_id:
    type: string
    example: '235442266'
composes:
  - ./_search-product.atc.yml
  - ./_open-product-detail.atc.yml
  - ./_trigger-upload.atc.yml
  - ./_verify-in-registered.atc.yml
expected: 업로드 성공 + 등록상품 매칭. unhandled 0건.
```

→ 작은 거 따로 돌릴 수 있음:
```bash
npx playwright test tests/upload/_search-product.spec.ts
```

→ e2e는 똑같이:
```bash
npm run atc -- atcs/upload/single-product.atc.yml --source_product_id=235442266
```

### 3.4 컨벤션 정립
- `_xxx.atc.yml` (언더스코어 prefix) = 컴포지션 조각, 단독 실행도 가능
- 일반 이름 = 완성된 시나리오, 보통 `composes` 사용
- 8개 ATC 모두 이 패턴으로 점진적 마이그레이션 가능 (한 번에 다 안 해도 됨)

### 3.5 검증
- `_search-product` 단독 실행 통과
- `single-product` (composes 사용) 실행 시 펼쳐진 step이 모두 실행되는지
- runner의 D4/D5/D11/D12 동작이 펼쳐진 step에서도 동일한지

---

## 4. CLAUDE.md 갱신

리팩토링 완료 후 `CLAUDE.md` 업데이트:

### 추가할 섹션
- **(j) 인증 패턴** — `auth.setup.ts` + storageState 설명. 새 ATC는 login step 안 적음
- **(k) 공통 flow 사용** — `lib/flows/` 함수 목록 + 사용 예
- **(l) ATC 컴포지션 컨벤션** — `_prefix` 의미, `composes` 사용법

### 수정할 섹션
- **(d) 새 ATC 추가 절차** — login/enter_workspace step 안 적음, flow 함수 호출, 큰 시나리오는 composes 권장

---

## 5. 실행 순서 권장

```
1. 작업 A 먼저 (30분)
   - tests/auth.setup.ts 작성 + selector 검증
   - playwright.config.ts에 setup project + storageState 추가
   - .gitignore에 .auth/ 추가
   - tmall-single.atc.yml의 login/enter_workspace step 제거 후 실행 → 통과 확인

2. 작업 A 후속 — 나머지 ATC 7개에서 login/enter_workspace 제거 (10분)

3. 작업 B (1시간)
   - lib/flows/ 4개 함수 작성
   - selector를 spec.ts에서 호출하면서 보정
   - 작은 ATC 1개 (registered-check) 먼저 마이그레이션 → 통과 → 나머지

4. 작업 C (1~2시간)
   - atc-schema.ts에 composes 필드 + refine
   - atc-loader.ts에 펼치기 로직 + 재귀
   - 단위 테스트 1개 (TODO: lib/__test__/atc-loader.test.ts) — composes 펼침 검증
   - single-product를 4개 조각 + e2e로 분해
   - 통과 확인 후 다른 큰 ATC 들 점진 분해

5. CLAUDE.md 업데이트 (15분)

6. 일주일 더 사용해보고 입자성 만족 여부 자가 판단
```

각 작업 완료 시점마다 한 번씩 멈춰서 사용자 확인 받는 게 안전.

---

## 6. 사용자가 직접 챙길 사항

- **selector 정확화**: storageState 작성 시 실제 윈들리 로그인 페이지의 input/button selector는 사용자만 알 수 있음. `npx playwright codegen https://app.windly.cc/login`으로 한 번 클릭 기록 후 Claude한테 줘서 정리시키는 게 가장 빠름.
- **WINDLY_LOGIN_EMAIL / WINDLY_LOGIN_PASSWORD**: `.env`에 이미 자리 있음. 채워두기.
- **첫 setup 실행 시**: 윈들리 확장 로드되어 headed Chromium이 뜸. 로그인 화면 + 해구대 선택 직접 한 번 보고 selector 점검.

---

## 7. 끝났을 때 검증

- [ ] `npx playwright test --project=setup` → `.auth/user.json` 생성
- [ ] `npx playwright test` (전체) → 8개 ATC 모두 통과 (단, vertical slice 데모는 의도적 throw라 제외)
- [ ] `npx tsc --noEmit` 통과
- [ ] 새로 짠 작은 ATC 1개 따로 실행 가능 (`npx playwright test tests/upload/_search-product.spec.ts`)
- [ ] `single-product.atc.yml`이 composes로 4개 조각을 펼쳐 9 step 실행되는지 결과 .md에서 확인
- [ ] 8개 ATC 평균 step 수: 9 → 4~5 (60% 감소 목표)

---

## 8. 안 할 것 (명시)

- **갈아엎기 X** — 일주일 자산 (8 ATC + 8 spec + 9 recovery + lib + reporter) 보존
- **DSL 폐기 X** — atcs/ YAML 구조 그대로. 새 필드(composes) 추가만
- **runner 다시 짜기 X** — D4/D5/D11/D12 동작 그대로
- **reporter 갈아엎기 X** — `.md/.json` 출력 그대로

---

## 9. 참고 — 이 결정의 기록 (요약)

원래 옵션 3가지 검토:
- **옵션 A (갈아엎기)**: 폐기. 일주일 자산 마이그레이션 비용 + 사용자 학습 곡선 다시.
- **옵션 B (그대로 유지)**: 폐기. "괴리감"은 그대로 남음.
- **옵션 C (좁게 단순화)**: **채택**. 입자성 문제만 좁게 해결. 위 작업 A/B/C가 그 구체화.

이 plan 자체가 옵션 C의 풀패키지. A/B만 먼저 하고 효과 보고 C 진행도 가능.

상세한 의사결정 흐름은 §10 히스토리 참조.

---

## 10. 전체 히스토리 (이 plan에 이르기까지)

### Phase 0 — 사용자 의도 (시작)

사용자(Windly 운영자)가 hoyeon `/guide` 호출. 원래 의도:

> "내가 테스트 자동화를 하고 있거든. 윈들리는 타오바오/티몰/라쿠텐에서 상품 수집 →
> 윈들리에서 가공 → 스마트스토어/쿠팡/톡스토어 등 마켓 업로드. 마켓에 못 올리는
> 상품은 수정 필요. 자동화 TC(ATC)를 자유양식으로 적으면 너가 그에 맞는 ATC 짜주고,
> 에러 나면 별도 복구 플로우 타고, 다시 ATC로 돌아와 결과 모두 적기.
> 예: '상품 수집 → 에러체크' ATC면 → 수집 → 상세 진입 → 에러체크 → (에러 시) 복구 →
> 재시도 → 결과: 수집:성공 / 상세이동:성공 / 에러체크:에러발생→복구로 해결 / 재시도:성공.
> Playwright로 하고싶음."

핵심 3가지 요구:
1. 자유양식 ATC → Claude가 코드로
2. 에러 발생 시 별도 복구 플로우로 분기 후 복귀
3. 단계별 결과 리포팅

### Phase 1 — `/guide` 추천

`/guide`가 Top 3 추천:
- 🥇 `/discuss` — 설계 토론
- 🥈 `/scaffold` — greenfield 프로젝트 세팅
- 🥉 `/specify` — 요구사항 인터뷰

사용자 후속 질문: "케이스가 N개 들어올 거면 1순위(/discuss) vs 2순위(/scaffold) 중 뭐가 적합?"
→ **`/scaffold` 채택** (인터뷰 + 박제 = 다음 ATC들 자동 패턴 따름)

### Phase 2 — `/scaffold` 5단계 (L0~L4)

#### L0 Mirror — Architecture-framed goal 합의
- IN scope: Playwright + ATC DSL + 복구 분기 + 리포터 + 가드레일 + vertical slice 1건
- NOT in scope: 실제 N개 ATC 콘텐츠, 윈들리 본체 수정, 마켓별 비즈니스 로직, CI/CD

#### L1 Environment scan
- Node v25.2.1, npm 11.6.2, no pnpm/yarn/bun, no Docker, macOS arm64
- **결정적 발견**: `/Users/a1/automation`에 기존 Playwright 풀세팅 (`windly-api-automation`)
  - playwright.config (multi-project + runId + Chrome 확장 로드)
  - reporters/summary-reporter.js (.md + .csv + .json 다중 출력)
  - 232개 audit_*.json/png/ts 산출물
- 기존 자산을 **참조 자료로** 활용 결정 (D1)

#### L2 Architecture interview — 12개 결정 (D1~D12)
| ID | 결정 |
|----|------|
| D1 | 기존 `/Users/a1/automation` 패턴만 차용, 코드는 새로 |
| D2 | 패키지 매니저 = npm |
| D3 | ATC DSL = YAML + 구조적 step (느슨, Claude가 정규화) |
| D4 | 복구 후 재개 = 실패 step부터 (작성자 override 가능) |
| D5 | 복구 등록 = `recoveries/<id>.ts` + ATC step의 `on_error` 명시 |
| D6 | 리포트 = `reports/runs/{runId}/.md + .json + html` |
| D7 | 윈들리 Chrome 확장 = 필수, headed Chromium 강제 |
| D8 | ATC 입력 = schema only 선언, 실행 시 주입 (CLI > fixture > prompt) |
| D9 | Playwright 프로젝트 = 도메인별 다중 (collect/error-check/fix/upload/e2e) |
| D10 | CI/CD = scope 외, 로컬 전용 |
| D11 | unhandled 에러 = 즉시 실패 + 'unhandled' 리포트, 자동 복구 X |
| D12 | 복구 자체 실패 = 1회만, 본 ATC도 실패 |

활성 확장: Type Contracts (zod). 비활성: Data Layer / Docker / Runtime Patterns.

8개 제약(C1~C8) + 3개 알려진 갭(KG1~KG3, 특히 KG2 = ctx 4 필드 = error_key/page_url/last_step_id/screenshot_path).

#### L3 Harness — 5개 결정 (D_H1~D_H5)
- D_H1: CLAUDE.md에 도메인(타오바오/티몰/라쿠텐, 윈들리, 마켓 5종+, 용어집) 박제
- D_H2: 솔로 프로젝트, 자유 (한국어)
- D_H3: 4 rules → `.claude/rules/{typescript-strict, npm-only, atc-file-layout, recovery-file-layout}.md`
- D_H4: 4 skills → `/atc-new`, `/atc-run`, `/recovery-new`, `/atc-report` (모두 disable-model-invocation)
- D_H5: 3 hooks → PostToolUse tsc, PreToolUse block .env*, block package-lock.json

#### L4 Requirements — R-A1~R-A10, GWT 27 sub-requirements
모든 sub-req에 given/when/then 명시. requirements.md = `.hoyeon/specs/atc-framework/requirements.md`.

### Phase 3 — `/execute` 10 task 5 라운드 병렬

Inline planning (블루프린트 스킵). plan.json → 10 tasks + 27 verify entries. **Agent dispatch + Standard verify**.

| 라운드 | Task | 산출물 |
|---|---|---|
| 1 | T1 | npm + tsconfig + 9 dirs + 7 deps |
| 2 (4 병렬) | T2 | lib/atc-schema.ts (zod v4) + lib/errors.ts |
|  | T5 | .claude/rules/ 4 파일 |
|  | T6 | .claude/skills/ 4 SKILL.md + 3 validate.sh |
|  | T7 | .claude/settings.json + 3 hooks |
| 3 (2 병렬) | T3 | lib/{config,logger,atc-loader,recovery-registry,runner}.ts |
|  | T4 | playwright.config.ts (5 도메인) + reporters/atc-reporter.ts |
| 4 (2 병렬) | T8 | vertical slice (atc.yml + recovery.ts + spec.ts) |
|  | T9 | CLAUDE.md (9 섹션) + .env.example + README.md |
| 5 | T10 | 최종 검증 (tsc PASS, 35/35 파일, 1 test discovered) |

verify 결과: 27/27 sub_req PASS (gates 1+2). Status: **✅ COMPLETE**.

산출 후 사용자에게 5건 안내:
1. `npx playwright install chromium`
2. `.env`에 `WINDLY_EXTENSION_PATH` 설정
3. (선택) 자격증명
4. vertical slice의 TODO/데모 throw는 사용자가 채워야 진짜 동작
5. 새 세션에서 .claude/settings.json 활성화

### Phase 4 — 사용자 후속 의문 (scaffold 직후)

> "뭘 하라고? 그냥 이제 내가 자연어로 주면 되는 거 아니야?"

답: 진짜 필수는 2개(브라우저 install + 확장 경로)뿐. 나머지는 첫 ATC 짤 때 처리.

> "근데 실행은 여기서 해 아니면 windly 자동화 폴더에 가서 해?"

답: **거기서 해라**. CLAUDE.md 자동 로드 + 훅 활성화 + 스킬 사용 가능.

> "이건 일회성 UI 검증이라 selector가 아직 ATC에 없으니..."

(사용자가 "내가 자연어로 하면 바로 ATC로 만들어주는 거 아니냐"고 정정)
답 정정: 맞음. Claude가 selector 포함 다 짬. vertical slice TODO는 더미였음.

> "그럼 내가 어떻게 줘야 만든다는 거야?"

답: 자연어 한 줄 ("타오바오 상품 수집해서 에러체크하는 ATC 만들어")이면 Claude가 도메인 분류 + 윈들리 페이지 탐색 + selector 추출 + .yml + .spec.ts + (필요 시) recovery + 실행까지 자동.

### Phase 5 — 일주일 사용 (4/29 ~ 5/6)

windly 자동화 폴더에서 실제 사용. 일주일 후 자산:
- ATC 8개 (collect 2 + error-check 1 + upload 5)
- Spec 8개 (1:1 매칭)
- Recovery 9개 (`missing_image` + `name_too_long` + `tab_*` 7개)

### Phase 6 — 회의감 발생

> "원래 테스트 자동화 이렇게 하는 거지? 왤케 ㅈㄴ 돌아가는 거 같냐"

답: 솔직히 일반 Playwright 자동화는 훨씬 단순함 (`npm init playwright` + 직접 spec.ts). 이게 무거운 건 사용자 요구 3가지(자유양식 DSL + 자동복구 + 단계별 리포트) 때문. 트레이드오프: 작은 규모면 오버엔지니어링, 큰 규모면 정당화.

> "아 그냥 뭐랄까 나는 유저 플로우가 하나 있으면 단계별로 나눠서 — '상품 수집에 들어간다 > 들어가지면 > 성공 / URL 수집 버튼 누른다 > URL 모달 나온다 > 성공' 이런식으로 하나하나 하면서 전체 플로우를 만들고 싶은데 지금은 뭔가 그게 아닌 거 같아서"

답: Playwright `test.step()` 빌트인이 정확히 그 패턴. 우리가 만든 거 99% 오버엔지니어링.

> "아니 근데 상품을 올리려면 상품 수정이 필요하긴 해서 알아서 해주긴 해야 해 아니면 이건 내 손을 타버리잖아"

답: 자동복구 필요 인정. 다만 작은 헬퍼(`withAutoFix`, 50줄)면 충분. YAML DSL 불필요.

> "아니 무슨 에러가 있을 줄 몰라 그래서 내가 탭 하나하나 들어가서 에러를 찾으라고 알려주는 거야 그게 자동복구로 된다고?"

답: "탭 순회 + 발견 시 fixer 매칭"은 그냥 for 루프 + fixers 맵으로 됨. 모르는 에러는 어떤 프레임워크도 자동으로 못 고침 — 한 번 사람이 알려주면 그 후부터 영구 자동.

> "지금 하고 있는 작업이 있는데 이건 다 못 쓰는 거지?"

→ 확인 결과: **이미 ATC 8 + spec 8 + recovery 9 자산 존재**. 갈아엎기는 1~2시간 작업 + 마이그레이션 위험.

> "내가 생각했던 작업이랑 실제로 하고있는 작업에 괴리감이 좀 있어. 케이스를 좀더 나누면서 진행해야 하는데 지금 하고있는 건 한번에 모든 플로우를 보는 느낌이랄까."

→ **이 한 마디가 진짜 진단의 시작**.

### Phase 7 — 진단

실제 ATC 4개(`tmall-single`, `single-product`, `top-product-market-popups`, `registered-check`) 본 뒤 패턴 발견:
- 모든 ATC가 `login → enter_workspace → open_<menu> → ...` 4 step으로 시작
- 한 ATC가 9 step씩 (single-product = 로그인부터 등록 검증까지 한방)
- ATC 사이 step 공유 메커니즘 없음 → 매번 복붙

### Phase 8 — 옵션 평가
- A (갈아엎기): 1~2시간 + 자산 마이그레이션 위험. 폐기.
- B (그대로): 괴리감 그대로. 폐기.
- C (좁게 추가): 작업 A(storageState) + B(lib/flows) + C(composes). **채택**.

### Phase 9 — 이 plan 작성 (현재)

위 §1~9가 옵션 C의 구체화. 새 세션에서 이 파일 보고 실행.

---

## 11. 새 세션 Claude를 위한 한 줄

> 사용자(Windly 자동화 운영자)가 일주일 ATC 작성 후 "케이스가 너무 크고 보일러플레이트 반복"이라는 입자성 문제를 호소함. 일주일 자산(8 ATC + 8 spec + 9 recovery + lib/runner + reporter) 보존하면서 §1~3 작업으로 좁게 해결. 갈아엎기 금지. 사용자가 선호하는 워크플로우 = "작은 단위로 쪼개고 조합". 이 plan은 그 워크플로우가 가능하도록 인프라만 좁게 추가.
