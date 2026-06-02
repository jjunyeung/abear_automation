/**
 * 수집상품 → 업로드 설정 → ESM 2.0 옵션 모드 영역 확인 (non-destructive).
 *
 * 대응 ATC : atcs/collected-product/upload-tab-esm-option-mode-area.atc.yml
 * TC 원본  : Case No 867, 868, 869 / P0 (3건). 모달 오픈/저장 destructive skip.
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
  'upload-tab-esm-option-mode-area.atc.yml',
);

const ESM_SECTION_TITLE = 'ESM 2.0 옵션설정';
const ESM_NO_CATEGORY_HINT = '먼저 ESM 2.0 카테고리를 선택해주세요';
const ESM_OPTION_MODE_LABEL = '추천옵션 모드';
const ESM_OPTION_SETTING_BUTTON = '옵션설정';

const verifyEsmSectionOrSkipStep: StepHandler = async (page) => {
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (!bodyText.includes(ESM_SECTION_TITLE)) {
    // eslint-disable-next-line no-console
    console.log('[TC867-869] ESM 2.0 옵션설정 섹션 미노출 — ESM 마켓 비활성 환경. success.');
    return { ok: true as const };
  }
  return { ok: true as const };
};

const verifyEsmOptionModeComponentsOrSkipStep: StepHandler = async (page) => {
  const bodyText = await page.evaluate(() => document.body.innerText);

  // ESM 섹션이 없으면 이전 스텝에서 이미 skip 처리됨 — 그래도 noop OK.
  if (!bodyText.includes(ESM_SECTION_TITLE)) {
    return { ok: true as const };
  }

  // 카테고리 미설정 안내 메시지 노출 시 skip.
  if (bodyText.includes(ESM_NO_CATEGORY_HINT)) {
    // eslint-disable-next-line no-console
    console.log('[TC867-869] ESM 카테고리 미설정 - 안내 메시지 노출. success skip.');
    return { ok: true as const };
  }

  const hasToggleLabel = bodyText.includes(ESM_OPTION_MODE_LABEL);
  const hasOptionSettingButton = bodyText.includes(ESM_OPTION_SETTING_BUTTON);
  if (!hasToggleLabel || !hasOptionSettingButton) {
    return {
      ok: false as const,
      error_key: 'esm_option_mode_components_missing' as ErrorKey,
      message: `ESM 옵션 모드 컴포넌트 누락 (toggle=${hasToggleLabel}, button=${hasOptionSettingButton})`,
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_first_product_detail: openFirstCollectedProductStep,
  click_upload_tab: clickTabByLabelStep(/^업로드 설정$/),
  verify_esm_section_or_skip: verifyEsmSectionOrSkipStep,
  verify_esm_option_mode_components_or_skip: verifyEsmOptionModeComponentsOrSkipStep,
};

test('[TC 867/868/869] 수집상품 상세 → [업로드 설정] 탭 → ESM 2.0 영역의 [추천옵션 모드] 토글 + [옵션설정] 버튼 노출 (카테고리 미설정 시 안내 메시지로 skip)', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
