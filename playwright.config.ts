/**
 * Playwright configuration for the Windly ATC framework.
 *
 * Fulfills R-A2.1:
 *   given: an ATC spec executes via this Playwright config
 *   when:  the run completes
 *   then:  a per-run report (md + json) is emitted under reports/runs/<runId>
 *          by the custom reporter (`reporters/atc-reporter.ts`), and the
 *          config registers the five domain projects (collect / error-check /
 *          fix / upload / e2e). Browser launch (with the Windly Chrome
 *          extension) is delegated to `lib/test-fixture.ts` so that MV3
 *          extension service workers are properly registered.
 *
 * Design notes (D6/D7/D9):
 *   - runId pattern `result_YYYY-MM-DD_HH-MM-SS` comes from `lib/config.ts`
 *     (`buildRunId()`), so it stays in one place and matches the reporter.
 *   - **D7 갱신**: 확장 로딩은 더 이상 여기 `launchOptions` 가 아니라 `lib/test-fixture.ts`
 *     의 `chromium.launchPersistentContext` 가 담당. MV3 service worker 가 정상
 *     등록되려면 persistent context 가 필수이기 때문 (Playwright 비-persistent
 *     모드에서는 service worker 가 register 되지 않음).
 *   - `fullyParallel: false` + `workers: 1` — persistent context 는 userDataDir
 *     에 lock 을 잡으므로 병렬 실행 시 충돌. 또한 윈들리 확장이 단일 브라우저
 *     프로필에 바인딩됨.
 *   - `retries: 0` because retry is the responsibility of the recovery flows
 *     defined in `recoveries/<error_key>.ts` (D12 — single attempt).
 *   - `use.trace` / `use.screenshot` 는 fixture 가 직접 읽어서 적용한다
 *     (Playwright 기본 fixture 우회로 인해 자동 주입 안됨).
 */

import 'dotenv/config';
import { defineConfig } from '@playwright/test';
import { buildRunId } from './lib/config';

const runId = process.env['WINDLY_RUN_ID']?.trim() || buildRunId();
const runDir = `reports/runs/${runId}`;

const extensionPath = process.env['WINDLY_EXTENSION_PATH']?.trim() ?? '';
if (extensionPath) {
  console.log('[ATC] 윈들리 확장 경로:', extensionPath);
} else {
  console.log(
    '[ATC] WINDLY_EXTENSION_PATH 미설정 — 확장 없이 실행 (UI ATC 는 실패할 수 있음)',
  );
}

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // ATC 는 순차 실행 — persistent context 의 userDataDir lock + 확장의 단일 프로필.
  fullyParallel: false,
  workers: 1,
  forbidOnly: false,
  // 재시도는 복구 플로우(recoveries/<key>.ts) 가 담당 (D12 — single attempt).
  retries: 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: `${runDir}/html`, open: 'never' }],
    [
      './reporters/atc-reporter.ts',
      {
        outputDir: runDir,
        runId,
      },
    ],
  ],
  use: {
    baseURL: process.env['WINDLY_BASE_URL'] ?? 'https://app-api.windly.cc',
    // 아래 옵션은 lib/test-fixture.ts 에서 testInfo.project.use 로 읽어 직접 적용한다.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off', // persistent context + Playwright video 는 호환성 이슈 많음 — 비활성.
  },
  projects: [
    // setup project: 모든 도메인 프로젝트의 dependency.
    // 첫 실행에서만 진짜 로그인 + 해구대 진입 → persistent userDataDir 에 세션 박제.
    // 이후 실행은 loginIfNeeded 가 fast-pass. 자세한 설명은 tests/auth.setup.ts 헤더 주석.
    //
    // storageState 옵션은 의도적으로 사용 안 함 — chromium.launchPersistentContext (lib/test-fixture)
    // 가 이미 디스크 기반 세션이고 storageState 주입을 지원하지 않기 때문.
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts$/,
    },
    {
      name: 'windly-collect',
      testMatch: 'tests/collect/**/*.spec.ts',
      dependencies: ['setup'],
    },
    {
      name: 'windly-error-check',
      testMatch: 'tests/error-check/**/*.spec.ts',
      dependencies: ['setup'],
    },
    {
      name: 'windly-fix',
      testMatch: 'tests/fix/**/*.spec.ts',
      dependencies: ['setup'],
    },
    {
      name: 'windly-upload',
      testMatch: 'tests/upload/**/*.spec.ts',
      dependencies: ['setup'],
    },
    {
      name: 'windly-e2e',
      testMatch: 'tests/e2e/**/*.spec.ts',
      // SyncResultBanner / 주문 상태변경 등 setup 이 백엔드 sync 를 미리 처리하면 검증
      // 윈도우가 사라지는 spec 들은 별도 project (windly-e2e-fresh) 에서 setup 없이 단독 실행.
      testIgnore: [
        'tests/e2e/order-management-sync-banner.spec.ts',
        'tests/e2e/order-management-change-status.spec.ts',
        'tests/e2e/order-management-shipping-drawer-open.spec.ts',
        'tests/e2e/order-management-instruct-to-delivering.spec.ts',
      ],
      dependencies: ['setup'],
    },
    // 'fresh' = setup 없이 spec 이 직접 loginIfNeeded + enterHaegudaeWorkspace 를 호출해
    // 진입 첫 페이지가 곧장 본 spec 의 대상이 되는 project. 매번 setup 이 hub/main 페이지를
    // 미리 열면 백엔드가 sync 를 처리해버려 SyncResultBanner 가 안 뜨는 케이스 회피용.
    {
      name: 'windly-e2e-fresh',
      testMatch: [
        'tests/e2e/order-management-sync-banner.spec.ts',
        'tests/e2e/order-management-change-status.spec.ts',
        'tests/e2e/order-management-shipping-drawer-open.spec.ts',
        'tests/e2e/order-management-instruct-to-delivering.spec.ts',
      ],
    },
  ],
});
