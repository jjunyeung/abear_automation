/**
 * K2. 계정 관리 페이지 smoke (e2e)
 * 실제 직원 계정 로그인은 자동화 어려움 — 페이지 진입 + 직원 섹션 노출까지만.
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

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'e2e', 'staff-account-permission.atc.yml');

const openStep: StepHandler = async (page) => {
  const candidates = [
    'https://app.windly.cc/view2/account',
    'https://app.windly.cc/view2/my-account',
    'https://app.windly.cc/view2/account-management',
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
    error_key: 'account_page_not_found' as ErrorKey,
    message: '계정 관리 페이지 URL 미발견',
  };
};

const verifyStep: StepHandler = async (page) => {
  const sig = page.getByText(/계정|직원|사용자|회원/, { exact: false }).first();
  try {
    await sig.waitFor({ state: 'visible', timeout: 10_000 });
    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error_key: 'account_signature_missing' as ErrorKey,
      message: '계정/직원 시그니처 미발견',
    };
  }
};

const handlers: StepHandlers = {
  open_account_management: openStep,
  verify_staff_section: verifyStep,
};

test('계정 관리 페이지 smoke (e2e)', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
