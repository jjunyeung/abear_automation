/**
 * H3. 취소/교환/반품 페이지 smoke (e2e)
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

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'e2e', 'order-cancel-exchange-return.atc.yml');

const openStep: StepHandler = async (page) => {
  // 정확한 URL 모를 때 사이드바에서 클릭 시도.
  const candidates = [
    'https://app.windly.cc/view2/cancel-exchange-return',
    'https://app.windly.cc/view2/cer-management',
    'https://app.windly.cc/view2/order-cancel',
  ];
  for (const url of candidates) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15_000 });
      await page.waitForTimeout(2_000);
      const body = await page.evaluate(() => document.body.innerText.slice(0, 200));
      if (/취소|교환|반품/.test(body)) return { ok: true as const };
    } catch { /* try next */ }
  }
  // 사이드바에서 텍스트 매칭.
  const sidebarLink = page.getByRole('link', { name: /취소.*교환.*반품|반품/ }).first();
  if ((await sidebarLink.count()) > 0) {
    await sidebarLink.click().catch(() => undefined);
    await page.waitForTimeout(3_000);
    return { ok: true as const };
  }
  return {
    ok: false as const,
    error_key: 'cer_page_not_found' as ErrorKey,
    message: '취소/교환/반품 페이지 URL/링크 미발견',
  };
};

const verifyStep: StepHandler = async (page) => {
  const sig = page.getByText(/취소|교환|반품/, { exact: false }).first();
  try {
    await sig.waitFor({ state: 'visible', timeout: 10_000 });
    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error_key: 'cer_signature_missing' as ErrorKey,
      message: '취소/교환/반품 페이지 시그니처 미발견',
    };
  }
};

const handlers: StepHandlers = {
  open_cancel_exchange_return: openStep,
  verify_page_mounted: verifyStep,
};

test('취소/교환/반품 페이지 smoke (e2e)', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
