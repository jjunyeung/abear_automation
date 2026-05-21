/**
 * 톡스토어 카테고리 Dropdown 노출 검증.
 *
 * 대응 ATC: atcs/collect/talkstore-category-visible.atc.yml
 * TC 원본: Case No 1085 / 수집상품 › 톡스토어 › 기본정보 / P0
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
  openFirstCollectedProductStep,
  clickTabByLabelStep,
} from './_talkstore-handlers';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'collected-product', 'talkstore-category-visible.atc.yml');

const verifyTalkstoreCategoryLabelStep: StepHandler = async (page) => {
  const label = page.getByText(/^톡스토어\s*카테고리$/).first();
  try {
    await label.waitFor({ state: 'visible', timeout: 10_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'talkstore_category_label_missing' as ErrorKey,
      message: '톡스토어 카테고리 라벨 미노출',
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_first_collected_product: openFirstCollectedProductStep,
  click_info_tab: clickTabByLabelStep(/^기본\s*정보$/),
  verify_talkstore_category_label: verifyTalkstoreCategoryLabelStep,
};

test('톡스토어 카테고리 Dropdown 노출', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
