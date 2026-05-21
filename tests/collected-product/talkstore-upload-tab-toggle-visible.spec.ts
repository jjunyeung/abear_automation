/**
 * 수집상품 톡스토어 토글 노출 검증.
 *
 * 대응 ATC: atcs/collect/talkstore-upload-tab-toggle-visible.atc.yml
 * TC 원본: Case No 1078, 1090 / 수집상품 › 톡스토어 › 업로드 설정 / P0
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import {
  runATC,
  type StepHandlers,
} from '../../lib/runner';
import {
  openFirstCollectedProductStep,
  clickTabByLabelStep,
  waitForUploadingMarketTogglesStep,
  verifyTalkstoreToggleVisibleStep,
} from './_talkstore-handlers';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'collected-product', 'talkstore-upload-tab-toggle-visible.atc.yml');

const handlers: StepHandlers = {
  open_first_collected_product: openFirstCollectedProductStep,
  click_upload_tab: clickTabByLabelStep(/^업로드\s*설정$/),
  wait_for_market_toggles: waitForUploadingMarketTogglesStep,
  verify_talkstore_toggle_visible: verifyTalkstoreToggleVisibleStep,
};

test('수집상품 톡스토어 토글 노출', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
