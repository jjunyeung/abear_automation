/**
 * P0 주문관리 / 배대지 신청서 작성 — skeleton ATC 의 3 TC.
 *
 * 검증 정책: 모두 신청서 작성 destructive. 주문관리 페이지 진입만 verified.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'order-mgmt', 'p0-주문관리-배대지-신청서-작성.atc.yml');
const URL = 'https://app.windly.cc/view3/order-management?orderStatus=ACCEPT';

let entered = false;

const enter: StepHandler = async (page) => {
  if (entered) return { ok: true as const };
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1_000);
  const body = await page.evaluate(() => document.body.innerText);
  if (!body.includes('주문 관리')) {
    return {
      ok: false as const,
      error_key: 'order_mgmt_missing' as ErrorKey,
      message: '주문 관리 페이지 미진입',
    };
  }
  entered = true;
  return { ok: true as const };
};

const noopAfter = (label: string, reason: string): StepHandler => async (page) => {
  const e = await enter(page, {});
  if (!e.ok) return e;
  logger.info(`[order-da-p0] ${label}: ${reason} — skip`);
  return { ok: true as const };
};

const handlers: StepHandlers = {
  tc1533: noopAfter('TC1533', '주문관리에서 신청서 작성 — destructive flow'),
  tc1534: noopAfter('TC1534', '퀵스타 신청서 작성 — destructive'),
  tc1535: noopAfter('TC1535', '토스토스 신청서 작성 — destructive'),
};

test('P0 주문관리 / 배대지 신청서 작성 — 페이지 진입 + 신청서 destructive skip', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  entered = false;
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
