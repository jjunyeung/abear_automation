/**
 * Tosstoss 신청서 양식 복사 검증.
 *
 * 대응 ATC : atcs/settings/da-form-copy.atc.yml
 * TC 원본  : Case No 1396 / 배송대행지 › 신청서 작성 › 복사 버튼 선택 / P0
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
  goToTosstossApplicationStep,
  addManualFormStep,
  fillInputByPlaceholder,
} from './_da-application-handlers';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'delivery-agency', 'da-form-copy.atc.yml');

const copyFormStep: StepHandler = async (page) => {
  // 복사 버튼 활성 조건: form value 중 1개 이상 채워져야 함 (isCopyDisabled = all empty).
  // 여러 필드 채워서 확실히 + blur (Tab) 로 state 반영.
  for (const [re, val] of [
    [/단가를\s*입력해주세요/, '100'],
    [/색상을\s*입력해\s*주세요/, 'Red'],
    [/사이즈를\s*입력해\s*주세요/, 'M'],
  ] as const) {
    const r = await fillInputByPlaceholder(page, re, val);
    if (!r.ok) {
      return { ok: false as const, error_key: 'precondition_fill_failed' as ErrorKey, message: `${re.source}: ${r.reason}` };
    }
  }
  await page.keyboard.press('Tab');
  await page.waitForTimeout(800);

  // 상품 복제 button: icon-only, Tooltip content="상품 복제" (aria-label 안 매핑됨).
  // "상품 #1" 헤더의 ancestor row 안 첫 button (svg only) = 복사. 두 번째 = 삭제.
  const titleText = page.getByText(/^상품\s*#1$/).first();
  await titleText.waitFor({ state: 'visible', timeout: 5_000 });
  const headerRow = titleText.locator('xpath=ancestor::*[self::div][1]');
  const copyBtn = headerRow.locator('button').first();
  if ((await copyBtn.count().catch(() => 0)) === 0) {
    return {
      ok: false as const,
      error_key: 'copy_button_missing' as ErrorKey,
      message: '상품 #1 헤더 row 안 button 매칭 0건',
    };
  }
  await copyBtn.click();
  await page.waitForTimeout(500);

  // 상품 #1 + 상품 #2 가시.
  const prod1 = page.getByText(/^상품\s*#1$/).first();
  const prod2 = page.getByText(/^상품\s*#2$/).first();
  try {
    await prod1.waitFor({ state: 'visible', timeout: 5_000 });
    await prod2.waitFor({ state: 'visible', timeout: 5_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'form_not_duplicated' as ErrorKey,
      message: '복사 후 상품 #2 미노출',
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_tosstoss_application: goToTosstossApplicationStep,
  add_manual_form: addManualFormStep,
  copy_form: copyFormStep,
};

test('토스토스 신청서 양식 복사', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
