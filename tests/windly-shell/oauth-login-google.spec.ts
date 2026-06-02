/**
 * 구글 OAuth 실 로그인 검증 (strict, R9 raid #4).
 *
 * 결정 10 — "그냥 로그인만 되는지 확인". 자격증명 입력 → 콜백 URL 도달이면 success.
 *
 * .env 필요: GOOGLE_TEST_EMAIL / GOOGLE_TEST_PASSWORD.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';
import { loginIfNeeded, loginViaGoogle } from '../../lib/windly-actions';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'windly-shell', 'oauth-login-google.atc.yml');

const verifyGoogleLogin: StepHandler = async (page) => {
  await page.context().clearCookies();
  const result = await loginViaGoogle(page);
  switch (result) {
    case 'logged_in':
      logger.info(`[oauth-google] 콜백 URL 도달: ${page.url()}`);
      return { ok: true as const };
    case 'no_credentials':
      return {
        ok: false as const,
        error_key: 'google_credentials_missing' as ErrorKey,
        message: 'GOOGLE_TEST_EMAIL / GOOGLE_TEST_PASSWORD env 미설정. .env 또는 CLI env 로 주입 필요.',
      };
    case 'oauth_blocked':
      return {
        ok: false as const,
        error_key: 'google_oauth_blocked' as ErrorKey,
        message: `구글 자동화 차단 (challenge / 2FA / 봇 검사 등). 현재 URL: ${page.url()}.`,
      };
    case 'callback_failed':
      return {
        ok: false as const,
        error_key: 'google_callback_failed' as ErrorKey,
        message: `구글 로그인 후 windly.cc 콜백 미도달. 현재 URL: ${page.url()}`,
      };
  }
};

const handlers: StepHandlers = {
  tc12_google_login_flow: verifyGoogleLogin,
};

test('구글 OAuth 실 로그인 검증 (R9 raid #4)', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  try {
    await loginIfNeeded(page);
    logger.info('[oauth-google] 세션 복구 완료');
  } catch (err) {
    logger.warn(`[oauth-google] 세션 복구 실패: ${String(err)}`);
  }

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
