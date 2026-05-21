/**
 * 기본설정 톡스토어 리뷰 포인트 지급 토글 검증.
 *
 * 대응 ATC: atcs/settings/talkstore-base-review-point-toggle.atc.yml
 * TC 원본: Case No 1064, 1065 / 기본설정 › 톡스토어 › 리뷰 포인트 / P0
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import {
  runATC,
  type StepHandlers,
} from '../../lib/runner';
import {
  gotoTalkstoreBaseSettingStep,
  toggleByLabelStep,
} from './_talkstore-base-handlers';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'base-setting', 'talkstore-base-review-point-toggle.atc.yml');

const handlers: StepHandlers = {
  goto_review_point_tab: gotoTalkstoreBaseSettingStep('REVIEW_POINT'),
  toggle_review_point: toggleByLabelStep('리뷰 시 포인트 지급', 'review_point'),
};

test('기본설정 톡스토어 리뷰 포인트 지급 토글', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
