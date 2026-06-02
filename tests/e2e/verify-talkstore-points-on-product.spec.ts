/**
 * B9. 톡스토어 포인트 베이스세팅 토글 동작 (e2e)
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandlers } from '../../lib/runner';
import {
  gotoTalkstoreBaseSettingStep,
  toggleByLabelStep,
} from '../base-setting/_talkstore-base-handlers';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'e2e', 'verify-talkstore-points-on-product.atc.yml');

const handlers: StepHandlers = {
  goto_review_point_tab: gotoTalkstoreBaseSettingStep('REVIEW_POINT'),
  toggle_purchase_point: toggleByLabelStep('구매 시 포인트 지급', 'purchase_point'),
  toggle_review_point: toggleByLabelStep('리뷰 시 포인트 지급', 'review_point'),
};

test('톡스토어 포인트 베이스세팅 토글 동작 (e2e)', async ({ page }) => {
  test.setTimeout(5 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
