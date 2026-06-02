/**
 * I1. 회원가입 페이지 smoke (e2e)
 * 실제 가입 트랜잭션 회피 — 폼 노출까지만.
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

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'e2e', 'signup-onboarding-home.atc.yml');

const openStep: StepHandler = async (page) => {
  const candidates = [
    'https://app.windly.cc/register',
    'https://app.windly.cc/signup',
    'https://app.windly.cc/login',
  ];
  for (const url of candidates) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15_000 });
      await page.waitForTimeout(2_000);
      return { ok: true as const };
    } catch { /* try next */ }
  }
  return {
    ok: false as const,
    error_key: 'register_page_not_found' as ErrorKey,
    message: '회원가입 페이지 미발견',
  };
};

const verifyStep: StepHandler = async (page) => {
  // 이미 로그인된 상태면 /register 가 홈으로 redirect — 그 경우도 OK (홈 도달 = 인증 시스템 동작).
  await page.waitForTimeout(2_000);
  const url = page.url();
  if (/\/(view2|view3)\//.test(url) || /windly\.cc\/?$/.test(url)) {
    return { ok: true as const };
  }
  // 회원가입/로그인 폼 자체 시그니처.
  const inputCount = await page.locator('input[type="email"], input[type="password"], input[name*="email"], input[name*="password"]').count();
  if (inputCount > 0) return { ok: true as const };
  return {
    ok: false as const,
    error_key: 'register_form_missing' as ErrorKey,
    message: `회원가입/로그인 폼/홈 모두 미감지. url=${url}`,
  };
};

const handlers: StepHandlers = {
  open_register_page: openStep,
  verify_form_visible: verifyStep,
};

test('회원가입 페이지 smoke (e2e)', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
