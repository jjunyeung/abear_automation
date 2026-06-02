/**
 * 회원가입 페이지 OAuth 버튼 존재 검증 (strict, R9 raid #2).
 *
 * 정책 (결정 10):
 *   - 실 회원가입 X. 회원가입 페이지의 4개 진입점 strict visibility 검증만.
 *
 * Fresh project (setup 의존 X) — oauth-* glob 으로 windly-oauth-check-fresh 에 포함.
 *
 * Selector 출처:
 *   windly_repo/hub-frontend-web/src/features/Account/Register/Form/index.tsx
 *   - "윈들리에 무료로 가입하고..." 앵커 텍스트
 *   - SocialButton NAVER (svg+bg #03c75a) / GOOGLE (svg+border #e9eaed)
 *   - "이메일로 회원가입" Button (RegisterEmailForm 초기 collapsed)
 *   - "로그인하기" Link → /accounts/login
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';
import { loginIfNeeded } from '../../lib/windly-actions';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'windly-shell', 'oauth-register-page.atc.yml');
const REGISTER_URL = 'https://hub.windly.cc/accounts/register';

let entered = false;

const enterRegisterPageFresh: StepHandler = async (page) => {
  if (entered) return { ok: true as const };
  await page.context().clearCookies();
  await page.goto(REGISTER_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => undefined);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  if (!page.url().includes('/accounts/register')) {
    return {
      ok: false as const,
      error_key: 'register_page_not_reached' as ErrorKey,
      message: `cookies clear 후에도 회원가입 페이지 진입 실패. 현재 URL: ${page.url()}`,
    };
  }
  entered = true;
  return { ok: true as const };
};

const verifyEmailRegisterButton: StepHandler = async (page) => {
  const e = await enterRegisterPageFresh(page, {});
  if (!e.ok) return e;
  // 윈들리 안내 텍스트 (anchor)
  const intro = page.getByText(/윈들리에 무료로 가입/).first();
  try {
    await intro.waitFor({ state: 'visible', timeout: 10_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'register_intro_text_missing' as ErrorKey,
      message: '윈들리 안내 텍스트 미감지',
    };
  }
  // "이메일로 회원가입" 버튼 (collapsed form 초기 상태)
  const emailBtn = page.getByRole('button', { name: /이메일로\s*회원가입/ }).first();
  try {
    await emailBtn.waitFor({ state: 'visible', timeout: 10_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'email_register_button_missing' as ErrorKey,
      message: '"이메일로 회원가입" 버튼 미감지',
    };
  }
  logger.info('[oauth-register] tc1 email register button visible');
  return { ok: true as const };
};

const verifyNaverSocialButton: StepHandler = async (page) => {
  const e = await enterRegisterPageFresh(page, {});
  if (!e.ok) return e;
  const naverFound = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.some((b) => {
      const bg = getComputedStyle(b).backgroundColor;
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
  logger.info('[oauth-register] tc2 naver social button visible');
  return { ok: true as const };
};

const verifyGoogleSocialButton: StepHandler = async (page) => {
  const e = await enterRegisterPageFresh(page, {});
  if (!e.ok) return e;
  const googleFound = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.some((b) => {
      const style = getComputedStyle(b);
      const bg = style.backgroundColor;
      const border = style.borderColor;
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
  logger.info('[oauth-register] tc4 google social button visible');
  return { ok: true as const };
};

const verifyLoginLink: StepHandler = async (page) => {
  const e = await enterRegisterPageFresh(page, {});
  if (!e.ok) return e;
  const loginLink = page.getByRole('link', { name: /로그인하기/ }).first();
  try {
    await loginLink.waitFor({ state: 'visible', timeout: 10_000 });
    const href = await loginLink.getAttribute('href');
    if (!href || !href.includes('/accounts/login')) {
      return {
        ok: false as const,
        error_key: 'login_link_href_wrong' as ErrorKey,
        message: `로그인 링크 href = ${href} (기대: /accounts/login 포함)`,
      };
    }
  } catch {
    return {
      ok: false as const,
      error_key: 'login_link_missing' as ErrorKey,
      message: '"로그인하기" 링크 미감지',
    };
  }
  logger.info('[oauth-register] login link visible + href OK');
  return { ok: true as const };
};

const handlers: StepHandlers = {
  tc1_register_email_button: verifyEmailRegisterButton,
  tc2_register_naver_button: verifyNaverSocialButton,
  tc4_register_google_button: verifyGoogleSocialButton,
  register_login_link: verifyLoginLink,
};

test('회원가입 페이지 OAuth 버튼 strict 검증 (R9 raid #2)', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  entered = false;
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  try {
    await loginIfNeeded(page);
    logger.info('[oauth-register] 세션 복구 완료');
  } catch (err) {
    logger.warn(`[oauth-register] 세션 복구 실패 — 다음 setup 이 처리: ${String(err)}`);
  }

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
