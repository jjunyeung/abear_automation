/**
 * 기본설정 톡스토어 구매 포인트 토글 ON 시 필드 노출 검증.
 *
 * 대응 ATC: atcs/settings/talkstore-base-purchase-point-fields-visible.atc.yml
 * TC 원본: Case No 1048, 1049, 1050, 1051, 1052, 1057 / 기본설정 › 톡스토어 › 리뷰 포인트 / P0
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
import {
  gotoTalkstoreBaseSettingStep,
} from './_talkstore-base-handlers';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'base-setting', 'talkstore-base-purchase-point-fields-visible.atc.yml');

async function setPurchasePointGranted(page: import('@playwright/test').Page, target: boolean): Promise<void> {
  const handle = await page.evaluateHandle(() => {
    const labels = Array.from(document.querySelectorAll('label'));
    for (const lab of labels) {
      if (lab.textContent?.includes('구매 시 포인트 지급')) {
        const inp = lab.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
        if (inp) return inp;
      }
    }
    return null;
  });
  const elt = handle.asElement();
  if (!elt) throw new Error('구매 포인트 토글 input 매칭 X');
  await elt.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  const current = await elt.evaluate((el) => (el as HTMLInputElement).checked);
  if (current === target) return;
  await elt.evaluate((el) => {
    const lab = el.closest('label');
    if (lab) (lab as HTMLLabelElement).click();
  });
  await page.waitForTimeout(1_000);
}

const enablePurchasePointStep: StepHandler = async (page) => {
  await setPurchasePointGranted(page, true);
  return { ok: true as const };
};

const disablePurchasePointStep: StepHandler = async (page) => {
  await setPurchasePointGranted(page, false);
  return { ok: true as const };
};

const verifyUnitDropdownVisibleStep: StepHandler = async (page) => {
  // Dropdown label "포인트 적립 단위(원/%)" 노출.
  const label = page.getByText(/포인트\s*적립\s*단위/).first();
  try {
    await label.waitFor({ state: 'visible', timeout: 5_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'unit_dropdown_label_missing' as ErrorKey,
      message: '포인트 적립 단위 라벨 미노출',
    };
  }
  return { ok: true as const };
};

const verifyAmountInputVisibleStep: StepHandler = async (page) => {
  const label = page.getByText(/포인트\s*적립액/).first();
  try {
    await label.waitFor({ state: 'visible', timeout: 5_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'amount_input_label_missing' as ErrorKey,
      message: '포인트 적립액 라벨 미노출',
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  goto_review_point_tab: gotoTalkstoreBaseSettingStep('REVIEW_POINT'),
  enable_purchase_point: enablePurchasePointStep,
  verify_unit_dropdown_visible: verifyUnitDropdownVisibleStep,
  verify_amount_input_visible: verifyAmountInputVisibleStep,
  disable_purchase_point: disablePurchasePointStep,
};

test('구매 포인트 토글 ON 시 필드 노출', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
