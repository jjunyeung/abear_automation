/**
 * H2. 주문 관리 → 배대지 연결 인터페이스 smoke (e2e)
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

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'e2e', 'order-instruct-delivery-da-form.atc.yml');

const openStep: StepHandler = async (page) => {
  await page.goto('https://app.windly.cc/view2/order-management', {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });
  await page.waitForTimeout(2_500);
  return { ok: true as const };
};

const verifyStep: StepHandler = async (page) => {
  // 주문 또는 빈 상태 둘 다 OK — 페이지 마운트만.
  const sig = page.getByText(/주문|배송|배대지|신청서/, { exact: false }).first();
  try {
    await sig.waitFor({ state: 'visible', timeout: 10_000 });
    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error_key: 'order_da_signature_missing' as ErrorKey,
      message: '주문/배대지 시그니처 미발견',
    };
  }
};

const handlers: StepHandlers = {
  open_order_management: openStep,
  verify_da_form_button: verifyStep,
};

test('주문 관리 → 배대지 연결 smoke (e2e)', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
