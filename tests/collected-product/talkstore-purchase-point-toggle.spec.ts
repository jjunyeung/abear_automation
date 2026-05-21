/**
 * 톡스토어 구매 시 포인트 지급 토글 동작 검증.
 *
 * 대응 ATC: atcs/collect/talkstore-purchase-point-toggle.atc.yml
 * TC 원본: Case No 1091 / 수집상품 › 톡스토어 › 업로드 설정 / P0
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
  toggleByLabelStep,
} from './_talkstore-handlers';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'collected-product', 'talkstore-purchase-point-toggle.atc.yml');

const handlers: StepHandlers = {
  open_first_collected_product: openFirstCollectedProductStep,
  click_upload_tab: clickTabByLabelStep(/^업로드\s*설정$/),
  toggle_purchase_point: toggleByLabelStep('구매 시 포인트 지급', 'purchase_point'),
};

test('톡스토어 구매 시 포인트 지급 토글', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
