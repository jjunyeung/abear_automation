/**
 * Playwright test fixture — Manifest V3 확장 로딩을 위한 persistent context.
 *
 * 배경:
 *   Playwright 기본 fixture (`@playwright/test` 의 `test.page`) 는
 *   `chromium.launch()` 기반의 비-persistent context 를 쓴다. 그 모드에서는
 *   MV3 확장의 service worker 가 제대로 등록되지 않아, 확장이 로드되더라도
 *   웹 페이지에서 `chrome.runtime.sendMessage(extensionId, ...)` 핸드셰이크가
 *   실패한다. 결과: 윈들리 앱이 "윈들리 확장 프로그램이 활성화되지 않았습니다"
 *   페이지 에러를 반복 throw 하고 URL 수집 등 확장 의존 액션이 silently 실패.
 *
 * 해결:
 *   `chromium.launchPersistentContext(userDataDir, {...})` 로 persistent
 *   context 를 띄우고, MV3 service worker 등록을 명시적으로 대기한다.
 *
 * Persistent dir 전략:
 *   - 기본: 프로젝트 루트의 `.playwright-userdata/` (gitignore 됨)
 *   - 환경 변수 `WINDLY_USER_DATA_DIR` 로 override 가능
 *   - 디렉토리가 유지되므로 첫 실행에서 로그인하면 이후 실행에서도 세션 유지
 *
 * D7 갱신:
 *   기존 D7 = "확장 = launchOptions args 로 로드" → 갱신 후 = "확장 = persistent
 *   context 로 로드, fixture 가 service worker 등록까지 보장". `playwright.config.ts`
 *   의 `launchOptions` 는 비활성화 (fixture 가 brower 생성을 전담).
 *
 * 주의:
 *   - persistent context 는 `userDataDir` 에 lock 을 잡아서 병렬 실행과 충돌.
 *     `playwright.config.ts` 의 `fullyParallel: false` + `workers: 1` 설정이
 *     필수 전제 (D9 노트 참조).
 *   - `headless: false` 강제 — 확장은 headless 모드 미지원.
 *   - `WINDLY_EXTENSION_PATH` 미설정 시 확장 없이 일반 persistent context 로
 *     실행 (UI ATC 는 실패할 수 있음).
 */

import { test as base, chromium, type BrowserContext, type Page } from '@playwright/test';
import { existsSync, mkdirSync, readlinkSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';

const extensionPath = process.env['WINDLY_EXTENSION_PATH']?.trim() ?? '';
const userDataDir =
  process.env['WINDLY_USER_DATA_DIR']?.trim() ??
  join(process.cwd(), '.playwright-userdata');

/**
 * Service worker 등록 대기. MV3 확장은 첫 페이지 로드 시 비동기로 service worker
 * 가 register 되므로, persistent context 생성 직후에는 0개일 수 있다.
 * 5초 안에 1개 이상 등록되면 정상.
 */
async function waitForExtensionServiceWorker(
  context: BrowserContext,
  timeoutMs = 5_000,
): Promise<string | null> {
  const existing = context.serviceWorkers();
  if (existing.length > 0) {
    return extractExtensionId(existing[0].url());
  }
  try {
    const sw = await Promise.race([
      context.waitForEvent('serviceworker', { timeout: timeoutMs }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), timeoutMs),
      ),
    ]);
    return extractExtensionId(sw.url());
  } catch {
    return null;
  }
}

function extractExtensionId(swUrl: string): string {
  // chrome-extension://<id>/service-worker.js
  const m = swUrl.match(/chrome-extension:\/\/([^/]+)\//);
  return m ? m[1] : swUrl;
}

/**
 * `WINDLY_EXTENSION_PATH` 사전 검증 (재발방지).
 *
 * Chromium 의 `--load-extension=<path>` 가 invalid path 를 받으면 launch 가 silently
 * hang → context setup 60s timeout (원인 추적이 매우 어려움). 미리 validate 해서
 * 명확한 에러로 빠르게 fail 시킴.
 *
 * 검증: path 가 존재하고 디렉토리이고 manifest.json 이 안에 있어야 함.
 */
function validateExtensionPath(path: string): void {
  if (path.length === 0) return; // 미설정 = 확장 없이 실행 (이미 분기 처리됨)
  if (!existsSync(path)) {
    throw new Error(
      `[ATC] WINDLY_EXTENSION_PATH 가 가리키는 경로가 존재하지 않습니다: ${path}\n` +
        `  → .env 의 WINDLY_EXTENSION_PATH 를 윈들리 확장 manifest.json 이 있는 디렉토리로 갱신하세요.\n` +
        `  → 빈 값으로 두면 확장 없이 실행 (UI ATC 는 실패할 수 있음).`,
    );
  }
  const st = statSync(path);
  if (!st.isDirectory()) {
    throw new Error(
      `[ATC] WINDLY_EXTENSION_PATH 가 디렉토리가 아닙니다: ${path}`,
    );
  }
  if (!existsSync(join(path, 'manifest.json'))) {
    throw new Error(
      `[ATC] WINDLY_EXTENSION_PATH 안에 manifest.json 이 없습니다: ${path}\n` +
        `  → 윈들리 확장 디렉토리 (manifest.json 포함) 의 절대 경로를 가리켜야 합니다.`,
    );
  }
}

/**
 * Stale Singleton* lock 파일 정리 (재발방지).
 *
 * Chromium 의 SingletonLock 은 symlink target = "<host>-<pid>" 형식. 정상 종료 시
 * unlink 되지만 비정상 종료 (Ctrl-C / IDE kill / 크래시) 시 stale 로 남으면 다음
 * launchPersistentContext 가 영원히 lock 대기 → context setup timeout (60s).
 *
 * 처리:
 *   1) SingletonLock 없음 = 정상, return.
 *   2) SingletonLock 있음 + symlink 의 PID 살아있음 = 진짜 동시 실행 → throw 명확 메시지.
 *   3) SingletonLock 있음 + PID 죽음 = stale → Singleton* 모두 unlink.
 *
 * 안전성: workers:1 + fullyParallel:false 라 우리 framework 안에서는 동시성 없음.
 * 외부 (다른 터미널 ATC) 와의 충돌만 #2 가 잡음.
 */
function cleanupStaleSingletonLocks(dir: string): void {
  const lockPath = join(dir, 'SingletonLock');
  let target: string;
  try {
    target = readlinkSync(lockPath);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return; // lock 자체가 없음 = 정상
    throw e;
  }

  // symlink target 형식: "<host>-<pid>" 또는 일부 OS 에서는 단순 "<pid>".
  const pidStr = target.split('-').pop() ?? '';
  const pid = parseInt(pidStr, 10);
  if (Number.isInteger(pid) && pid > 0) {
    try {
      process.kill(pid, 0); // signal 0 = 죽이지 않고 살아있는지만 probe
      throw new Error(
        `[ATC] 다른 chromium (pid=${pid}) 가 ${dir} 를 사용 중입니다. ` +
          `다른 터미널에서 ATC 실행 중인지 확인하고 종료 후 재실행하세요.`,
      );
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      if (code !== 'ESRCH' && code !== 'EPERM') throw e;
      // ESRCH = pid 없음 (stale), EPERM = 다른 사용자 — 둘 다 우리는 정리 진행
    }
  }

  // stale 정리
  for (const name of ['SingletonLock', 'SingletonCookie', 'SingletonSocket']) {
    try {
      unlinkSync(join(dir, name));
    } catch {
      // 이미 없으면 무시
    }
  }
  console.log('[ATC] stale Singleton* lock 정리 완료');
}

interface AtcFixtures {
  context: BrowserContext;
  page: Page;
  extensionId: string | null;
}

/**
 * 확장 로드용 launch args 빌더. extensionPath 가 비어 있으면 빈 배열.
 * `--disable-extensions-except` 로 다른 확장 차단 (재현성).
 */
/**
 * ATC 실행 윈도우 사이즈 — 사용자 강제 (.claude/rules/playwright-window-size.md).
 * viewport + Chrome --window-size 둘 다 동일 값으로 강제. 변경 금지.
 */
const ATC_WINDOW_WIDTH = 1800;
const ATC_WINDOW_HEIGHT = 1280;

function buildExtensionArgs(): string[] {
  // 모든 ATC 실행은 1800x1280 윈도우로 강제 (사용자 룰).
  const winSizeArgs = [`--window-size=${ATC_WINDOW_WIDTH},${ATC_WINDOW_HEIGHT}`];
  if (extensionPath.length === 0) return winSizeArgs;
  return [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
    '--no-sandbox',
    '--disable-blink-features=AutomationControlled',
    ...winSizeArgs,
  ];
}

export const test = base.extend<AtcFixtures>({
  context: async ({}, use, testInfo) => {
    // 확장 경로 사전 검증 — invalid path 면 chromium launch hang 대신 즉시 throw.
    validateExtensionPath(extensionPath);

    if (extensionPath.length > 0) {
      // userDataDir 가 없으면 만든다. lock 충돌 방지 위해 워커별로 분리해도 좋지만
      // workers: 1 + fullyParallel: false 라 단일 디렉토리 OK.
      mkdirSync(userDataDir, { recursive: true });
      // 비정상 종료로 남은 stale Singleton* lock 자동 정리 (재발방지).
      cleanupStaleSingletonLocks(userDataDir);
      console.log(`[ATC] persistent userDataDir: ${userDataDir}`);
      console.log(`[ATC] 윈들리 확장 로드: ${extensionPath}`);
    } else {
      console.log('[ATC] WINDLY_EXTENSION_PATH 미설정 — 확장 없이 실행');
    }

    // 기본 = headed (D7: MV3 확장은 headed 강제). 사용자가 GUI 또는 CLI 에서
    // `--headless` 를 명시 (= scripts/atc.mjs 가 WINDLY_HEADLESS=1 export)
    // 한 경우에만 headless 시도. 윈들리 확장은 headless 에서 service worker
    // 등록을 못 할 가능성이 높으므로 UI 확장에 의존하는 ATC 는 실패할 수
    // 있음 — 사용자가 명시 선택한 경우에만 책임지고 시도한다.
    const headlessMode = process.env['WINDLY_HEADLESS'] === '1';
    if (headlessMode && extensionPath.length > 0) {
      console.warn(
        '[ATC] WINDLY_HEADLESS=1 + 윈들리 확장 동시 사용 — MV3 service worker' +
          ' 등록이 실패할 수 있음. 확장 의존 ATC 는 실패할 가능성 있음.',
      );
    }
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: headlessMode,
      // 사용자 강제: 모든 ATC 실행 viewport = 1800x1280 (.claude/rules/playwright-window-size.md).
      viewport: { width: ATC_WINDOW_WIDTH, height: ATC_WINDOW_HEIGHT },
      // baseURL 은 playwright.config.ts 의 use.baseURL 이 자동 적용되지 않으므로
      // testInfo.project.use 에서 가져와 적용.
      baseURL: (testInfo.project.use.baseURL as string | undefined) ?? undefined,
      args: buildExtensionArgs(),
    });

    // 확장 service worker 등록 확인.
    if (extensionPath.length > 0) {
      const extId = await waitForExtensionServiceWorker(context, 8_000);
      if (extId !== null) {
        console.log(`[ATC] 확장 service worker 등록됨 — extensionId: ${extId}`);
      } else {
        console.warn(
          '[ATC] 확장 service worker 등록 실패 — windly 앱이 확장을 인식 못할 수 있음',
        );
      }
    }

    // Tracing 은 Playwright 의 test runner 가 use.trace 기반으로 자동 적용한다
    // (override 한 context 에도 wrapping 적용됨). 여기서 수동으로 start/stop 하면
    // "Tracing has been already started" 에러 발생.

    await use(context);

    await context.close();
  },

  page: async ({ context }, use, testInfo) => {
    // launchPersistentContext 는 about:blank 페이지를 자동 생성. 그것을 재사용.
    const page = context.pages()[0] ?? (await context.newPage());

    await use(page);

    // 실패 시 스크린샷 — playwright.config 의 screenshot 옵션을 수동 실현.
    const failed = testInfo.status !== testInfo.expectedStatus;
    const screenshotMode = testInfo.project.use.screenshot;
    if (failed && (screenshotMode === 'only-on-failure' || screenshotMode === 'on')) {
      try {
        const screenshotPath = testInfo.outputPath('test-failed-1.png');
        await page.screenshot({ path: screenshotPath, fullPage: false });
        await testInfo.attach('screenshot', {
          path: screenshotPath,
          contentType: 'image/png',
        });
      } catch {
        // 페이지가 이미 닫혔거나 unreachable — 무시.
      }
    }
  },

  extensionId: async ({ context }, use) => {
    if (extensionPath.length === 0) {
      await use(null);
      return;
    }
    const id = await waitForExtensionServiceWorker(context, 0);
    await use(id);
  },
});

export { expect } from '@playwright/test';
