/**
 * Tosstoss 신청서 주문관리 불러오기 모달 검증.
 *
 * 대응 ATC : atcs/settings/da-load-from-orders.atc.yml
 * TC 원본  : Case No 1380 / 배송대행지 › 신청서 작성 › 주문관리에서 불러오기 / P0
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
import { goToTosstossApplicationStep } from './_da-application-handlers';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'delivery-agency', 'da-load-from-orders.atc.yml');

const clickLoadFromOrdersStep: StepHandler = async (page) => {
  const btn = page.getByRole('button', { name: /주문관리에서\s*불러오기/ }).first();
  try {
    await btn.waitFor({ state: 'visible', timeout: 10_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'load_button_missing' as ErrorKey,
      message: '"주문관리에서 불러오기" 버튼 미노출',
    };
  }
  await btn.click();
  return { ok: true as const };
};

const verifyModalOpenStep: StepHandler = async (page) => {
  const title = page.getByText(/주문관리에서\s*상품\s*정보\s*불러오기/).first();
  try {
    await title.waitFor({ state: 'visible', timeout: 5_000 });
    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error_key: 'load_modal_not_open' as ErrorKey,
      message: '모달 title "주문관리에서 상품 정보 불러오기" 미노출',
    };
  }
};

const handlers: StepHandlers = {
  open_tosstoss_application: goToTosstossApplicationStep,
  click_load_from_orders: clickLoadFromOrdersStep,
  verify_modal_open: verifyModalOpenStep,
};

test('토스토스 주문관리 불러오기 모달', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
