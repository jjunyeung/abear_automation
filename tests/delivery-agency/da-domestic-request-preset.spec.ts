/**
 * Tosstoss 도메스틱 요청사항 프리셋 옵션 검증.
 * 대응 ATC: atcs/settings/da-domestic-request-preset.atc.yml
 * TC 원본: Case No 1409 / 배송대행지 › 신청서 작성 / P0
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
} from './_da-application-handlers';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'delivery-agency', 'da-domestic-request-preset.atc.yml');

const selectPresetOptionStep: StepHandler = async (page) => {
  // Receiver dropdown default SelectedBox 텍스트 = "(선택사항) 직접입력" (isFreeText default true).
  // 클릭으로 dropdown 펼침.
  const selectedBox = page.getByText(/\(선택사항\)\s*직접입력/).first();
  await selectedBox.waitFor({ state: 'visible', timeout: 5_000 });
  await selectedBox.click();
  await page.waitForTimeout(500);

  // 옵션 펼친 후 "배송 전 연락 바랍니다." 매칭.
  const opt = page.getByText(/배송\s*전\s*연락\s*바랍니다/).filter({ visible: true }).first();
  if ((await opt.count().catch(() => 0)) === 0) {
    return { ok: false as const, error_key: 'preset_option_missing' as ErrorKey, message: '배송 전 연락 옵션 미노출' };
  }
  await opt.click({ force: true });
  await page.waitForTimeout(500);

  // SelectedBox 안 텍스트 = "배송 전 연락 바랍니다." 가시 (option list 사라진 후에도 SelectedBox 에 남아있음).
  const selectedText = page.getByText(/배송\s*전\s*연락\s*바랍니다/).first();
  const visible = await selectedText.isVisible().catch(() => false);
  if (!visible) {
    return { ok: false as const, error_key: 'preset_not_selected' as ErrorKey, message: '선택 후 SelectedBox 텍스트 미노출' };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_tosstoss_application: goToTosstossApplicationStep,
  add_manual_form: addManualFormStep,
  select_preset_option: selectPresetOptionStep,
};

test('토스토스 도메스틱 요청사항 프리셋', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
