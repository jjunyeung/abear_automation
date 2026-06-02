/**
 * 로그인 페이지 OAuth 버튼 존재 검증 (strict, R8 raid #1).
 *
 * 정책 (결정 10):
 *   - 실 OAuth 인증 트리거 X (캡차/2FA 위험).
 *   - hub.windly.cc/accounts/login 페이지의 4개 진입점 visibility 만 검증:
 *     이메일 input + 네이버 SocialButton + 구글 SocialButton + 회원가입 링크.
 *
 * Fresh project (setup 의존 X):
 *   - spec 시작 시 context.clearCookies() 로 강제 fresh.
 *   - spec 종료 시 loginIfNeeded 호출로 세션 복구 → 다음 spec 영향 최소화.
 *
 * Selector 출처:
 *   windly_repo/hub-frontend-web/src/features/Account/Login/Form/index.tsx
 *   - "간편 로그인" DividerWithText (line 39)
 *   - SocialButton (svg only, NAVER → bg #03c75a / GOOGLE → border #e9eaed)
 *   - "회원가입하기!" Link (line 51)
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';
import { loginIfNeeded } from '../../lib/windly-actions';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'windly-shell', 'oauth-login-page.atc.yml');
const LOGIN_URL = 'https://hub.windly.cc/accounts/login';

let entered = false;

const enterLoginPageFresh: StepHandler = async (page) => {
  if (entered) return { ok: true as const };
  await page.context().clearCookies();
  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => undefined);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  if (!page.url().includes('/accounts/login')) {
    return {
      ok: false as const,
      error_key: 'login_page_not_reached' as ErrorKey,
      message: `cookies clear 후에도 로그인 페이지 진입 실패. 현재 URL: ${page.url()}`,
    };
  }
  entered = true;
  return { ok: true as const };
};

const verifyEmailLoginButton: StepHandler = async (page) => {
  const e = await enterLoginPageFresh(page, {});
  if (!e.ok) return e;
  const emailInput = page
    .getByPlaceholder(/아이디.*이메일|이메일|email/i)
    .or(page.locator('input[type="email"]'))
    .or(page.locator('input[name="email"]'))
    .first();
  const pwdInput = page
    .getByPlaceholder(/비밀번호|password/i)
    .or(page.locator('input[type="password"]'))
    .first();
  try {
    await emailInput.waitFor({ state: 'visible', timeout: 10_000 });
    await pwdInput.waitFor({ state: 'visible', timeout: 5_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'email_login_inputs_missing' as ErrorKey,
      message: '이메일/비밀번호 input 미감지',
    };
  }
  logger.info('[oauth-login] tc6 email login inputs visible');
  return { ok: true as const };
};

const verifyNaverButton: StepHandler = async (page) => {
  const e = await enterLoginPageFresh(page, {});
  if (!e.ok) return e;
  const easyLoginLabel = page.getByText('간편 로그인').first();
  try {
    await easyLoginLabel.waitFor({ state: 'visible', timeout: 10_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'easy_login_anchor_missing' as ErrorKey,
      message: '"간편 로그인" 앵커 텍스트 미감지',
    };
  }
  // 네이버 SocialButton: background-color #03c75a + svg 자식.
  // Material/styled-components 의 computed style 검증으로 매치.
  const naverFound = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.some((b) => {
      const bg = getComputedStyle(b).backgroundColor;
      // #03c75a = rgb(3, 199, 90)
      return bg === 'rgb(3, 199, 90)' && b.querySelector('svg') !== null;
    });
  });
  if (!naverFound) {
    return {
      ok: false as const,
      error_key: 'naver_social_button_missing' as ErrorKey,
      message: '네이버 SocialButton (bg #03c75a + svg) 미감지',
    };
  }
  logger.info('[oauth-login] tc8 naver social button visible');
  return { ok: true as const };
};

const verifyGoogleButton: StepHandler = async (page) => {
  const e = await enterLoginPageFresh(page, {});
  if (!e.ok) return e;
  // 구글 SocialButton: background white + border #e9eaed + svg 자식.
  const googleFound = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.some((b) => {
      const style = getComputedStyle(b);
      const bg = style.backgroundColor;
      const border = style.borderColor;
      // bg white = rgb(255, 255, 255), border #e9eaed = rgb(233, 234, 237)
      return bg === 'rgb(255, 255, 255)' && border === 'rgb(233, 234, 237)' && b.querySelector('svg') !== null;
    });
  });
  if (!googleFound) {
    return {
      ok: false as const,
      error_key: 'google_social_button_missing' as ErrorKey,
      message: '구글 SocialButton (white bg + #e9eaed border + svg) 미감지',
    };
  }
  logger.info('[oauth-login] tc11 google social button visible');
  return { ok: true as const };
};

const verifyRegisterLink: StepHandler = async (page) => {
  const e = await enterLoginPageFresh(page, {});
  if (!e.ok) return e;
  const registerLink = page.getByRole('link', { name: /회원가입하기/ }).first();
  try {
    await registerLink.waitFor({ state: 'visible', timeout: 10_000 });
    const href = await registerLink.getAttribute('href');
    if (!href || !href.includes('/accounts/register')) {
      return {
        ok: false as const,
        error_key: 'register_link_href_wrong' as ErrorKey,
        message: `회원가입 링크 href = ${href} (기대: /accounts/register 포함)`,
      };
    }
  } catch {
    return {
      ok: false as const,
      error_key: 'register_link_missing' as ErrorKey,
      message: '"회원가입하기!" 링크 미감지',
    };
  }
  logger.info('[oauth-login] tc7 register link visible + href OK');
  return { ok: true as const };
};

const handlers: StepHandlers = {
  tc6_login_email_button: verifyEmailLoginButton,
  tc8_login_naver_button: verifyNaverButton,
  tc11_login_google_button: verifyGoogleButton,
  tc7_login_register_link: verifyRegisterLink,
};

test('로그인 페이지 OAuth 버튼 strict 검증 (R8 raid #1)', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  entered = false;
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  // 종료 직전: 세션 복구 (다음 test/setup 영향 최소화).
  // clearCookies 했지만 .playwright-userdata 의 localStorage 등은 살아있을 수 있어
  // loginIfNeeded 가 idempotent 하게 다시 로그인 시도.
  try {
    await loginIfNeeded(page);
    logger.info('[oauth-login] 세션 복구 완료');
  } catch (err) {
    logger.warn(`[oauth-login] 세션 복구 실패 — 다음 setup 이 처리: ${String(err)}`);
  }

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
