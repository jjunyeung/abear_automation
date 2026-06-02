/**
 * 수집상품 상세 → 기본 정보 탭 → AI 상품명 추천 + AI 상품 리스크 진단 버튼 노출.
 *
 * 대응 ATC : atcs/collected-product/info-tab-ai-buttons-visible.atc.yml
 * TC 원본  : Case No 1083 + 943-947 / P0 (6건). 실제 클릭은 destructive skip.
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
  'info-tab-ai-buttons-visible.atc.yml',
);

const AI_NAME_BUTTON = 'AI 상품명 추천';
const AI_RISK_BUTTON = 'AI 상품 리스크 진단';

const verifyAiProductNameButtonVisibleStep: StepHandler = async (page) => {
  const visible = await page
    .getByRole('button', { name: AI_NAME_BUTTON, exact: true })
    .first()
    .isVisible()
    .catch(() => false);
  if (!visible) {
    return {
      ok: false as const,
      error_key: 'ai_product_name_button_missing' as ErrorKey,
      message: `${AI_NAME_BUTTON} 버튼 미노출 — InfoTab TitleButtonGroup 미렌더링`,
    };
  }
  return { ok: true as const };
};

const verifyAiRiskCheckButtonVisibleStep: StepHandler = async (page) => {
  const visible = await page
    .getByRole('button', { name: AI_RISK_BUTTON, exact: true })
    .first()
    .isVisible()
    .catch(() => false);
  if (!visible) {
    return {
      ok: false as const,
      error_key: 'ai_risk_check_button_missing' as ErrorKey,
      message: `${AI_RISK_BUTTON} 버튼 미노출 — AiProductRisk 미렌더링`,
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_first_product_detail: openFirstCollectedProductStep,
  click_info_tab: clickTabByLabelStep(/^기본 정보$/),
  verify_ai_product_name_button_visible: verifyAiProductNameButtonVisibleStep,
  verify_ai_risk_check_button_visible: verifyAiRiskCheckButtonVisibleStep,
};

test('[TC 1083, 943-947] 수집상품 상세 → [기본 정보] 탭 → TitleButtonGroup 의 [AI 상품명 추천] + [AI 상품 리스크 진단] 두 버튼 노출 (실 클릭 destructive 라 visibility 만)', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
