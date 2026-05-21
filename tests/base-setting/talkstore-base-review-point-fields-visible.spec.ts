/**
 * 리뷰 포인트 토글 ON 시 필드 노출 검증.
 *
 * 대응 ATC: atcs/settings/talkstore-base-review-point-fields-visible.atc.yml
 * TC 원본: Case No 1059, 1060, 1061 / 기본설정 › 톡스토어 › 리뷰 포인트 / P0
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

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'base-setting', 'talkstore-base-review-point-fields-visible.atc.yml');

async function setReviewPointGranted(page: import('@playwright/test').Page, target: boolean): Promise<void> {
  const handle = await page.evaluateHandle(() => {
    const labels = Array.from(document.querySelectorAll('label'));
    for (const lab of labels) {
      if (lab.textContent?.includes('리뷰 시 포인트 지급')) {
        const inp = lab.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
        if (inp) return inp;
      }
    }
    return null;
  });
  const elt = handle.asElement();
  if (!elt) throw new Error('리뷰 포인트 토글 input 매칭 X');
  await elt.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  const current = await elt.evaluate((el) => (el as HTMLInputElement).checked);
  if (current === target) return;
  await elt.evaluate((el) => {
    const lab = el.closest('label');
    if (lab) (lab as HTMLLabelElement).click();
  });
  await page.waitForTimeout(1_000);
}

const enableReviewPointStep: StepHandler = async (page) => {
  await setReviewPointGranted(page, true);
  return { ok: true as const };
};

const disableReviewPointStep: StepHandler = async (page) => {
  await setReviewPointGranted(page, false);
  return { ok: true as const };
};

const verifyTextReviewVisibleStep: StepHandler = async (page) => {
  const label = page.getByText(/^텍스트\s*리뷰$/).first();
  try {
    await label.waitFor({ state: 'visible', timeout: 5_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'text_review_label_missing' as ErrorKey,
      message: '텍스트 리뷰 라벨 미노출',
    };
  }
  return { ok: true as const };
};

const verifyPhotoReviewVisibleStep: StepHandler = async (page) => {
  const label = page.getByText(/^포토\s*리뷰$/).first();
  try {
    await label.waitFor({ state: 'visible', timeout: 5_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'photo_review_label_missing' as ErrorKey,
      message: '포토 리뷰 라벨 미노출',
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  goto_review_point_tab: gotoTalkstoreBaseSettingStep('REVIEW_POINT'),
  enable_review_point: enableReviewPointStep,
  verify_text_review_visible: verifyTextReviewVisibleStep,
  verify_photo_review_visible: verifyPhotoReviewVisibleStep,
  disable_review_point: disableReviewPointStep,
};

test('리뷰 포인트 토글 ON 시 필드 노출', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
