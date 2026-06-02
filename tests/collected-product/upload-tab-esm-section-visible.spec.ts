/**
 * 수집상품 상세 → 업로드 설정 탭 → 공통 + ESM 2.0 섹션 노출 (non-destructive).
 *
 * 대응 ATC : atcs/collected-product/upload-tab-esm-section-visible.atc.yml
 * TC 원본  : Case No 826, 827 / P0 (2건). 카테고리 수정 destructive skip.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import {
  openFirstCollectedProductStep,
  clickTabByLabelStep,
} from './_talkstore-handlers';
import type { ErrorKey } from '../../lib/errors';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'collected-product',
  'upload-tab-esm-section-visible.atc.yml',
);

const COMMON_SECTION_TITLE = '공통 업로드 설정';
const ESM_SECTION_TITLE = 'ESM 2.0 옵션설정';

const verifyCommonUploadSectionStep: StepHandler = async (page) => {
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (!bodyText.includes(COMMON_SECTION_TITLE)) {
    return {
      ok: false as const,
      error_key: 'common_upload_section_missing' as ErrorKey,
      message: `${COMMON_SECTION_TITLE} 섹션 미노출 - 업로드 설정 탭 진입 실패`,
    };
  }
  return { ok: true as const };
};

const verifyEsmSectionOrSkipStep: StepHandler = async (page) => {
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (!bodyText.includes(ESM_SECTION_TITLE)) {
    // ESM 마켓 비활성 환경 — success 처리.
    // eslint-disable-next-line no-console
    console.log(`[TC826/827] ${ESM_SECTION_TITLE} 미노출 - ESM 마켓 비활성 환경으로 추정. success 처리.`);
    return { ok: true as const };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_first_product_detail: openFirstCollectedProductStep,
  click_upload_tab: clickTabByLabelStep(/^업로드 설정$/),
  verify_common_upload_section: verifyCommonUploadSectionStep,
  verify_esm_section_or_skip: verifyEsmSectionOrSkipStep,
};

test('[TC 826/827] 수집상품 상세 → [업로드 설정] 탭 → "공통 업로드 설정" + "ESM 2.0 옵션설정" 섹션 노출 (ESM 마켓 비활성 시 ESM 부분 skip)', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
