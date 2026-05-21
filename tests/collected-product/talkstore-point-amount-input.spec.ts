/**
 * 톡스토어 포인트 적립액 input 동작 검증.
 *
 * 대응 ATC: atcs/collect/talkstore-point-amount-input.atc.yml
 * TC 원본: Case No 1094 / 수집상품 › 톡스토어 › 업로드 설정 / P0
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
  openFirstCollectedProductStep,
  clickTabByLabelStep,
} from './_talkstore-handlers';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'collected-product', 'talkstore-point-amount-input.atc.yml');

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
  if (!elt) throw new Error('구매 시 포인트 토글 input 매칭 X');
  await elt.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  const current = await elt.evaluate((el) => (el as HTMLInputElement).checked);
  if (current === target) return;
  await elt.evaluate((el) => {
    const lab = el.closest('label');
    if (lab) (lab as HTMLLabelElement).click();
  });
  await page.waitForTimeout(800);
}

const enablePurchasePointStep: StepHandler = async (page) => {
  await setPurchasePointGranted(page, true);
  return { ok: true as const };
};

const disablePurchasePointStep: StepHandler = async (page) => {
  await setPurchasePointGranted(page, false);
  return { ok: true as const };
};

const inputPointAmountStep: StepHandler = async (page) => {
  // "포인트 적립액" 으로 시작하는 label 의 FieldWrapper 안 input.
  const fieldLabel = page.getByText(/^포인트\s*적립액/).first();
  try {
    await fieldLabel.waitFor({ state: 'visible', timeout: 10_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'point_amount_label_missing' as ErrorKey,
      message: '포인트 적립액 라벨 미노출',
    };
  }
  const fieldContainer = fieldLabel.locator('xpath=ancestor::div[.//input][1]');
  const input = fieldContainer.locator('input').first();
  if ((await input.count().catch(() => 0)) === 0) {
    return {
      ok: false as const,
      error_key: 'point_amount_input_not_found' as ErrorKey,
      message: '포인트 적립액 input 매칭 X',
    };
  }
  await input.fill('100');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(500);
  const value = (await input.inputValue().catch(() => '')) || '';
  // 입력값 그대로 또는 unit/clamping 거친 값. 빈 string 만 아니면 OK.
  if (!value || value === '0') {
    return {
      ok: false as const,
      error_key: 'point_amount_value_not_set' as ErrorKey,
      message: `포인트 적립액 input value 반영 X (${value})`,
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_first_collected_product: openFirstCollectedProductStep,
  click_upload_tab: clickTabByLabelStep(/^업로드\s*설정$/),
  enable_purchase_point: enablePurchasePointStep,
  input_point_amount: inputPointAmountStep,
  disable_purchase_point: disablePurchasePointStep,
};

test('톡스토어 포인트 적립액 input', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
