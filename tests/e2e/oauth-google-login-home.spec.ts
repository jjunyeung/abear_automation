/**
 * I2. OAuth 구글 로그인 → 홈 진입 (e2e)
 *
 * 대응 ATC: atcs/e2e/oauth-google-login-home.atc.yml
 *
 * 전제: .playwright-userdata/ 의 persistent userDataDir 에 구글 세션 저장됨.
 * 자동화로는 새 구글 자격증명 입력 불가 (봇 차단) — 세션 박제 방식만.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import {
  runATC,
  type StepHandler,
  type StepHandlers,
} from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'e2e',
  'oauth-google-login-home.atc.yml',
);

const APP = 'https://app.windly.cc';

const logoutIfLoggedInStep: StepHandler = async (page) => {
  await page.goto(APP, { waitUntil: 'domcontentloaded' }).catch(() => undefined);
  await page.waitForTimeout(2_000);
  // 사용자 메뉴 / 로그아웃 버튼 탐색.
  const logoutBtn = page.getByRole('button', { name: /로그아웃/ }).first();
  if ((await logoutBtn.count()) === 0) {
    // 사용자 아바타/메뉴 토글이 있을 수 있음. 일단 통과 — 이미 로그아웃 상태로 간주.
    logger.info('[logout_if_logged_in] 로그아웃 버튼 없음 — 이미 로그아웃 또는 다른 진입점');
    return { ok: true as const };
  }
  await logoutBtn.click({ timeout: 5_000 }).catch(() => undefined);
  await page.waitForTimeout(2_000);
  return { ok: true as const };
};

const openLoginPageStep: StepHandler = async (page) => {
  await page.goto(`${APP}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2_000);
  return { ok: true as const };
};

const clickGoogleOauthStep: StepHandler = async (page) => {
  const candidates = [
    page.getByRole('button', { name: /구글로?\s*로그인|Google.*로그인|Sign.*Google/i }),
    page.locator('button:has(img[alt*="Google"])'),
    page.locator('button:has(img[src*="google"])'),
  ];
  for (const c of candidates) {
    if ((await c.count()) > 0 && (await c.first().isVisible().catch(() => false))) {
      await c.first().click({ timeout: 5_000 });
      await page.waitForTimeout(3_000);
      return { ok: true as const };
    }
  }
  return {
    ok: false as const,
    error_key: 'google_oauth_btn_not_found' as ErrorKey,
    message: '구글 OAuth 버튼 미발견',
  };
};

const waitBackToHomeStep: StepHandler = async (page) => {
  const start = Date.now();
  while (Date.now() - start < 60_000) {
    const url = page.url();
    if (/app\.windly\.cc\/(view2|view3)/.test(url) || url.endsWith('app.windly.cc/')) {
      logger.info(`[wait_back_to_home] 홈 도달: ${url}`);
      return { ok: true as const };
    }
    await page.waitForTimeout(2_000);
  }
  return {
    ok: false as const,
    error_key: 'home_not_reached' as ErrorKey,
    message: `60초 안에 홈 도달 실패. 현재 URL=${page.url()}`,
  };
};

const handlers: StepHandlers = {
  logout_if_logged_in: logoutIfLoggedInStep,
  open_login_page: openLoginPageStep,
  click_google_oauth: clickGoogleOauthStep,
  wait_back_to_home: waitBackToHomeStep,
};

test('OAuth 구글 로그인 → 홈 진입 (e2e)', async ({ page }) => {
  test.setTimeout(5 * 60_000);

  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
