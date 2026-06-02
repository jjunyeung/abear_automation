/**
 * 네이버 OAuth 실 로그인 검증 (strict, R9 raid #3).
 *
 * 결정 10 — "그냥 로그인만 되는지 확인". 자격증명 입력 → 콜백 URL 도달이면 success.
 *
 * .env 필요: NAVER_TEST_EMAIL / NAVER_TEST_PASSWORD (값은 atc-decisions-form.md 참고).
 * Fresh project (setup 의존 X) — windly-oauth-check-fresh 에 포함.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';
import { loginIfNeeded, loginViaNaver } from '../../lib/windly-actions';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'windly-shell', 'oauth-login-naver.atc.yml');

const verifyNaverLogin: StepHandler = async (page) => {
  await page.context().clearCookies();
  const result = await loginViaNaver(page);
  switch (result) {
    case 'logged_in':
      logger.info(`[oauth-naver] 콜백 URL 도달: ${page.url()}`);
      return { ok: true as const };
    case 'no_credentials':
      return {
        ok: false as const,
        error_key: 'naver_credentials_missing' as ErrorKey,
        message: 'NAVER_TEST_EMAIL / NAVER_TEST_PASSWORD env 미설정. .env 또는 CLI env 로 주입 필요.',
      };
    case 'oauth_blocked':
      return {
        ok: false as const,
        error_key: 'naver_oauth_blocked' as ErrorKey,
        message: `네이버 봇 검사/2FA/기기등록 prompt 차단. 현재 URL: ${page.url()}. 재시도 또는 1회 수동 로그인 후 박제 필요.`,
      };
    case 'callback_failed':
      return {
        ok: false as const,
        error_key: 'naver_callback_failed' as ErrorKey,
        message: `네이버 로그인 후 windly.cc 콜백 미도달. 현재 URL: ${page.url()}`,
      };
  }
};

const handlers: StepHandlers = {
  tc9_naver_login_flow: verifyNaverLogin,
};

test('네이버 OAuth 실 로그인 검증 (R9 raid #3)', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  // 세션 복구 — naver 로그인 성공/실패 무관, 다음 setup 이 깨끗하게 진입할 수 있도록.
  try {
    await loginIfNeeded(page);
    logger.info('[oauth-naver] 세션 복구 완료');
  } catch (err) {
    logger.warn(`[oauth-naver] 세션 복구 실패: ${String(err)}`);
  }

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
