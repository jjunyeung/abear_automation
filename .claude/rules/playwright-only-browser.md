# 브라우저 자동화 = Playwright (ATC 프레임워크) 단독

이 프로젝트의 모든 브라우저 자동화는 본 프로젝트의 Playwright 기반 ATC 프레임워크로만 실행한다. `npm run atc -- atcs/<domain>/<name>.atc.yml [--input=value]` 또는 `npx playwright test --project=windly-<domain>` 가 유일한 진입점.

## 금지

- **chrome-devtools MCP** 사용 금지. 등록되어 있더라도 호출하지 마라.
- **chromux** (`@team-attention/chromux`) 직접 호출 금지. `npx chromux ...`, `npx @team-attention/chromux ...` 모두 X.
- **browser-explorer / browser-work** 등 chromux 기반 에이전트로 본 프로젝트 작업 위임 금지.
- Puppeteer / Selenium / WebDriver / cdp-chrome 등 다른 브라우저 자동화 라이브러리 추가 금지.
- 일회성 검증이라는 이유로 "잠깐만 chromux로" 도 금지 — 한 번 빠지면 계속 빠진다.
- ATC 프레임워크 밖에서 raw Playwright (`npx playwright test` 를 ATC 경로 거치지 않고 호출) 도 권장하지 않음. 새 ATC 를 만들어 거기서 검증.

## 대신

- 새 자동화가 필요하면:
  1. `atcs/<domain>/<name>.atc.yml` 작성 (`/atc-new` 또는 직접).
  2. `tests/<domain>/<name>.spec.ts` 의 StepHandlers 채우기 (vertical slice exemplar = `tests/collect/product-error-check.spec.ts` 참조).
  3. `npm run atc -- atcs/<domain>/<name>.atc.yml --<input>=<value>` 로 실행.
- 일회성 UI 탐색/디버깅이 필요해도 Playwright 의 `--debug` / `--ui` 모드를 활용:
  - `npx playwright test --project=windly-collect --debug tests/collect/<name>.spec.ts`
  - `npx playwright test --project=windly-collect --ui` (Playwright UI 모드)
- 셀렉터/플로우를 모를 때는 사용자에게 직접 물어보거나, 사용자가 직접 한 번 실행하며 셀렉터를 알려주는 수동 페어링이 chromux 우회보다 안전하다.
- 로그인 세션이 필요하면 Playwright 의 `storageState` 패턴으로 한 번 로그인한 후 재사용 (스크립트는 ATC 프레임워크 내부에 둔다).

## 위반 예시

```bash
# 잘못된 예
npx @team-attention/chromux show exp-bbff       # ✗ chromux 우회
npx chromux navigate https://app.windly.cc      # ✗ chromux 우회
```

```ts
// 잘못된 예: chromux MCP 또는 chrome-devtools MCP 호출
mcp__chrome_devtools__navigate({...});          // ✗
mcp__chromux__eval({...});                      // ✗
```

```
# 잘못된 에이전트 위임
Agent({ subagent_type: "hoyeon:browser-explorer", ... })   # ✗ 본 프로젝트 작업에는 사용 X
Agent({ subagent_type: "hoyeon:browser-work", ... })       # ✗ 같음
```

## 올바른 예

```bash
# 올바른 예: ATC 프레임워크 경유
npm run atc -- atcs/collect/tmall-single.atc.yml \
  --url=https://detail.tmall.com/item.htm?id=865028697626

# 디버깅이 필요할 때
npx playwright test --project=windly-collect --debug \
  tests/collect/tmall-single.spec.ts
```

```ts
// 올바른 예: tests/collect/<name>.spec.ts 안에서 Playwright API 사용
import { test } from '@playwright/test';
import { runATC } from '../../lib/runner';

test('...', async ({ page }) => {
  await page.goto('https://app.windly.cc');
  // ... StepHandlers 안에서 page 조작
});
```

## 근거 / 출처

- 본 프로젝트는 Playwright + 윈들리 Chrome 확장 로딩을 전제로 한 ATC 프레임워크 (CLAUDE.md (a)/(c) 참조).
- 외부 브라우저 도구는 (i) 윈들리 확장이 없는 일반 Chromium 으로 동작, (ii) 자격증명을 본 프로젝트 .env 와 별도 경로에 저장, (iii) ATC 리포트(reports/runs/<runId>) 와 동기화되지 않음 — 결과적으로 D6, D7, D11 의 일관성을 깨뜨린다.
- 일회성 검증이라도 ATC 로 작성하면 다음에 재실행/회귀 테스트가 가능하다 (vertical slice exemplar 의 의도).
