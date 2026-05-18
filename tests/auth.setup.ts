/**
 * Auth setup — Playwright "setup project" 패턴 (REFACTOR §1).
 *
 * 목적:
 *   기존 8개 ATC 가 매번 `login → enter_workspace` 4 step 으로 시작하던 것을
 *   1회 검증으로 통합한다. 모든 도메인 프로젝트(`windly-collect/error-check/fix/upload/e2e`)는
 *   `dependencies: ['setup']` 로 본 spec 이 먼저 통과한 뒤에만 실행된다.
 *
 * Persistent context 와의 관계 (D7 호환):
 *   `lib/test-fixture.ts` 가 `chromium.launchPersistentContext(.playwright-userdata, ...)`
 *   를 쓰므로 로그인 cookies/localStorage 는 디스크에 자동 보존된다. 일반적으로 쓰는
 *   `storageState` 파일을 추가로 만들 필요가 없다 — persistent context 는 storageState
 *   주입을 지원하지 않기 때문에 만들어도 사용처가 없음 (REFACTOR §1.1 selector 추정값
 *   기반의 별도 setup 보다 fixture 재사용이 안전).
 *
 *   따라서 본 spec 의 효과는:
 *     1) 첫 실행: 진짜 로그인 + 해구대 진입 → userDataDir 에 세션 박제.
 *     2) 이후 실행: loginIfNeeded 가 폼이 안 보이면 fast-pass → 해구대 진입도 idempotent.
 *
 *   `.playwright-userdata/` 가 지워지면 다음 setup 실행에서 자동으로 다시 로그인.
 *
 * 실패 정책:
 *   - WINDLY_LOGIN_EMAIL/PASSWORD 미설정 → throw (도메인 프로젝트 모두 skip 됨)
 *   - 로그인 실패 → throw (자격증명 잘못 / 윈들리 점검 등)
 *   - 해구대 진입 실패 → 통과 (이미 워크스페이스 안일 수 있음 — enterHaegudaeWorkspace 가 idempotent)
 */

import { test as setup } from '../lib/test-fixture';
import {
  enterHaegudaeWorkspace,
  loginIfNeeded,
} from '../lib/windly-actions';

setup('윈들리 로그인 + 해구대 워크스페이스 진입', async ({ page }) => {
  setup.setTimeout(2 * 60_000);

  const result = await loginIfNeeded(page);
  if (result === 'no_credentials') {
    throw new Error(
      '[auth.setup] WINDLY_LOGIN_EMAIL / WINDLY_LOGIN_PASSWORD env 가 미설정. .env 채우고 다시 실행.',
    );
  }
  if (result === 'login_failed') {
    throw new Error(
      `[auth.setup] 로그인 실패. 현재 URL: ${page.url()}. 자격증명/윈들리 상태 확인.`,
    );
  }

  await enterHaegudaeWorkspace(page);

  // 워크스페이스 진입 직후 첫 페이지 로드 안정화.
  await page
    .waitForLoadState('domcontentloaded', { timeout: 30_000 })
    .catch(() => undefined);

  console.log(`[auth.setup] 로그인 + 해구대 진입 완료. 현재 URL: ${page.url()}`);
});
