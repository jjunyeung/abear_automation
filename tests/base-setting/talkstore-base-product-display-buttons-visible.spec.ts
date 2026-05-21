/**
 * 톡스토어 상품 노출 및 판매 SegmentedButton 노출 검증.
 *
 * 대응 ATC: atcs/settings/talkstore-base-product-display-buttons-visible.atc.yml
 * TC 원본: Case No 1070, 1071 (버튼 노출 부분) / 기본설정 › 톡스토어 › 상품 노출 및 판매 / P0
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

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'base-setting', 'talkstore-base-product-display-buttons-visible.atc.yml');

const verifyDisplaySegmentedButtonsStep: StepHandler = async (page) => {
  const stateLabel = page.getByText(/^전시\s*상태$/).first();
  const nextLabel = page.getByText(/^다음\s*노출$/).first();
  try {
    await stateLabel.waitFor({ state: 'visible', timeout: 10_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'display_state_label_missing' as ErrorKey,
      message: '전시 상태 라벨 미노출',
    };
  }
  if ((await nextLabel.count().catch(() => 0)) === 0) {
    return {
      ok: false as const,
      error_key: 'next_display_label_missing' as ErrorKey,
      message: '다음 노출 라벨 미노출',
    };
  }
  // 노출/미노출 버튼 — 각각 두 군데 = 총 4개. 최소 2개 (노출), 2개 (미노출) 노출되어야 함.
  const showBtns = page.getByRole('button', { name: /^노출$/ });
  const hideBtns = page.getByRole('button', { name: /^미노출$/ });
  const showCnt = await showBtns.count().catch(() => 0);
  const hideCnt = await hideBtns.count().catch(() => 0);
  if (showCnt < 2 || hideCnt < 2) {
    return {
      ok: false as const,
      error_key: 'display_buttons_count_mismatch' as ErrorKey,
      message: `노출 ${showCnt} / 미노출 ${hideCnt} 버튼 갯수 부족 (각각 2개 이상 기대)`,
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  goto_product_setting_tab: gotoTalkstoreBaseSettingStep('PRODUCT_SETTING'),
  verify_display_segmented_buttons: verifyDisplaySegmentedButtonsStep,
};

test('톡스토어 상품 노출 및 판매 버튼 노출', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
