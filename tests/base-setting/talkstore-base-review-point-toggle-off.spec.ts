/**
 * 기본설정 톡스토어 리뷰 포인트 — 리뷰 지급 토글 OFF 검증.
 *
 * 대응 ATC : atcs/base-setting/talkstore-base-review-point-toggle-off.atc.yml
 * TC 원본  : Case No 1063 / P0
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import {
  gotoTalkstoreBaseSettingStep,
  toggleOffByLabelStep,
} from './_talkstore-base-handlers';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'base-setting',
  'talkstore-base-review-point-toggle-off.atc.yml',
);

const verifyReviewFieldsHiddenStep: StepHandler = async (page) => {
  const labels = ['텍스트 리뷰', '포토 리뷰'];
  for (const lab of labels) {
    const cnt = await page.getByText(lab, { exact: true }).count();
    if (cnt > 0) {
      return {
        ok: false as const,
        error_key: 'review_field_still_visible' as ErrorKey,
        message: `토글 OFF 후 "${lab}" 가 여전히 노출됨`,
      };
    }
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  goto_review_point_tab: gotoTalkstoreBaseSettingStep('REVIEW_POINT'),
  toggle_off_review_point: toggleOffByLabelStep('리뷰 시 포인트 지급 여부 설정', 'review_toggle_off'),
  verify_review_fields_hidden: verifyReviewFieldsHiddenStep,
};

test('[TC 1063] 기본설정 → 톡스토어 → [리뷰 포인트] 탭 → "포인트 지급" 토글 OFF → 적립액/적립율 필드 숨김 확인 → 토글 ON 으로 원복', async ({ page }) => {
  test.setTimeout(90_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
