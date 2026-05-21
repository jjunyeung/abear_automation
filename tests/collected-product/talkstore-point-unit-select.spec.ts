/**
 * 톡스토어 포인트 적립 단위 (원/%) SegmentedButton 동작 검증.
 *
 * 대응 ATC: atcs/collect/talkstore-point-unit-select.atc.yml
 * TC 원본: Case No 1092 / 수집상품 › 톡스토어 › 업로드 설정 / P0
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

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'collected-product', 'talkstore-point-unit-select.atc.yml');

/** 라벨 텍스트 substring 으로 토글 input 검출, 목표 state 강제. */
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
  try {
    await setPurchasePointGranted(page, true);
    return { ok: true as const };
  } catch (e) {
    return {
      ok: false as const,
      error_key: 'enable_purchase_point_failed' as ErrorKey,
      message: e instanceof Error ? e.message : String(e),
    };
  }
};

const disablePurchasePointStep: StepHandler = async (page) => {
  try {
    await setPurchasePointGranted(page, false);
    return { ok: true as const };
  } catch (e) {
    return {
      ok: false as const,
      error_key: 'disable_purchase_point_failed' as ErrorKey,
      message: e instanceof Error ? e.message : String(e),
    };
  }
};

/** 원 / % 버튼 두 개 노출 + 양쪽 클릭 검증. */
const verifyAndToggleUnitStep: StepHandler = async (page) => {
  // SegmentedButtonField label = "포인트 적립 단위 (원/%)" — 그 안 button 텍스트 = "원" / "%"
  // 같은 label 의 ancestor field 안에서 button[text="원"] 과 button[text="%"] 찾기.
  const fieldLabel = page.getByText(/^포인트\s*적립\s*단위/).first();
  try {
    await fieldLabel.waitFor({ state: 'visible', timeout: 10_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'point_unit_field_label_missing' as ErrorKey,
      message: '포인트 적립 단위 라벨 미노출 (토글 ON 안 됨?)',
    };
  }
  // field group container — label 의 ancestor.
  const fieldContainer = fieldLabel.locator('xpath=ancestor::div[.//button][1]');
  const buttons = fieldContainer.locator('button');
  const cnt = await buttons.count().catch(() => 0);
  if (cnt < 2) {
    return {
      ok: false as const,
      error_key: 'point_unit_buttons_missing' as ErrorKey,
      message: `포인트 적립 단위 button 갯수 부족 (${cnt})`,
    };
  }
  // "원" 클릭 → 800ms → "%" 클릭. 클릭 자체가 throw 안 하면 PASS.
  const wonBtn = fieldContainer.getByRole('button', { name: /^원$/ });
  const percentBtn = fieldContainer.getByRole('button', { name: /^%$/ });
  if ((await wonBtn.count().catch(() => 0)) === 0 || (await percentBtn.count().catch(() => 0)) === 0) {
    return {
      ok: false as const,
      error_key: 'point_unit_buttons_not_matched' as ErrorKey,
      message: '원/% 버튼 매칭 X',
    };
  }
  await wonBtn.click({ trial: false });
  await page.waitForTimeout(400);
  await percentBtn.click({ trial: false });
  await page.waitForTimeout(400);
  await wonBtn.click({ trial: false });
  await page.waitForTimeout(400);
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_first_collected_product: openFirstCollectedProductStep,
  click_upload_tab: clickTabByLabelStep(/^업로드\s*설정$/),
  enable_purchase_point: enablePurchasePointStep,
  verify_and_toggle_unit: verifyAndToggleUnitStep,
  disable_purchase_point: disablePurchasePointStep,
};

test('톡스토어 포인트 적립 단위 동작', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
