/**
 * H1. 주문 관리 페이지 진입 (e2e)
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

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'e2e', 'order-sync-list-detail.atc.yml');

const openStep: StepHandler = async (page) => {
  await page.goto('https://app.windly.cc/view2/order-management', {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });
  return { ok: true as const };
};

const waitLoadingStep: StepHandler = async (page) => {
  await page.waitForTimeout(3_000);
  return { ok: true as const };
};

const verifyStep: StepHandler = async (page) => {
  const sig = page.getByText(/주문\s*동기화|주문이\s*없|주문\s*관리/, { exact: false }).first();
  try {
    await sig.waitFor({ state: 'visible', timeout: 10_000 });
    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error_key: 'order_mgmt_signature_missing' as ErrorKey,
      message: '주문 관리 페이지 시그니처 미발견',
    };
  }
};

const handlers: StepHandlers = {
  open_order_management: openStep,
  wait_loading_finished: waitLoadingStep,
  verify_order_or_empty: verifyStep,
};

test('주문 관리 페이지 마운트 smoke (e2e)', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
