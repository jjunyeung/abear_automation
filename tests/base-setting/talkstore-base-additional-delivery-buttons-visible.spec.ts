/**
 * 톡스토어 추가 배송비 SegmentedButton 노출 검증.
 *
 * 대응 ATC: atcs/settings/talkstore-base-additional-delivery-buttons-visible.atc.yml
 * TC 원본: Case No 1025 (step 1) / 기본설정 › 톡스토어 › 추가 배송비 / P0
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

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'base-setting', 'talkstore-base-additional-delivery-buttons-visible.atc.yml');

const verifySegmentedButtonsStep: StepHandler = async (page) => {
  const possibleBtn = page.getByRole('button', { name: /^배송\s*가능$/ });
  const notPossibleBtn = page.getByRole('button', { name: /^배송\s*불가$/ });
  try {
    await possibleBtn.first().waitFor({ state: 'visible', timeout: 10_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'delivery_possible_button_missing' as ErrorKey,
      message: '배송 가능 버튼 미노출',
    };
  }
  if ((await notPossibleBtn.count().catch(() => 0)) === 0) {
    return {
      ok: false as const,
      error_key: 'delivery_not_possible_button_missing' as ErrorKey,
      message: '배송 불가 버튼 미노출',
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  goto_delivery_tab: gotoTalkstoreBaseSettingStep('DELIVERY_AND_AS'),
  verify_segmented_buttons: verifySegmentedButtonsStep,
};

test('톡스토어 추가 배송비 버튼 노출', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
