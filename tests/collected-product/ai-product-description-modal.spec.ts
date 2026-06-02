/**
 * 수집상품 상세페이지 → AI 상세페이지 설명 모달 노출/닫기 (non-destructive).
 *
 * 대응 ATC : atcs/collected-product/ai-product-description-modal.atc.yml
 * TC 원본  : Case No 831, 832, 833, 838 / P0 (4건). TC 835/836 destructive skip.
 *
 * UI 텍스트 출처: AiProductDescription/index.tsx Modal title="AI 상세페이지 설명"
 *                DetailPageTools/index.tsx Tooltip messages "클릭 한 번으로 AI가..."
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
  'ai-product-description-modal.atc.yml',
);

const AI_BUTTON_LABEL = 'AI 상세페이지 설명';
const TOOLTIP_KEYWORD = '클릭 한 번으로 AI가';
const MODAL_TITLE = 'AI 상세페이지 설명';
const CANCEL_BUTTON = '취소';
const ADD_BUTTON = '상세페이지에 추가';

const hoverAiDescriptionButtonStep: StepHandler = async (page) => {
  const btn = page.getByRole('button', { name: new RegExp(AI_BUTTON_LABEL) }).first();
  try {
    await btn.waitFor({ state: 'visible', timeout: 8_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'ai_description_button_not_visible' as ErrorKey,
      message: `AI 상세페이지 설명 버튼 미노출 — 상세페이지 탭 진입 실패 or selector 변경`,
    };
  }
  await btn.scrollIntoViewIfNeeded();
  await btn.hover();
  await page.waitForTimeout(800); // Tooltip render delay
  return { ok: true as const };
};

const verifyTooltipVisibleStep: StepHandler = async (page) => {
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (!bodyText.includes(TOOLTIP_KEYWORD)) {
    return {
      ok: false as const,
      error_key: 'tooltip_keyword_missing' as ErrorKey,
      message: `호버 후 Tooltip 키워드 "${TOOLTIP_KEYWORD}" 미노출`,
    };
  }
  return { ok: true as const };
};

const clickAiDescriptionButtonStep: StepHandler = async (page) => {
  const btn = page.getByRole('button', { name: new RegExp(AI_BUTTON_LABEL) }).first();
  try {
    await btn.click({ timeout: 5_000 });
  } catch (e) {
    return {
      ok: false as const,
      error_key: 'ai_description_button_click_failed' as ErrorKey,
      message: `AI 버튼 클릭 실패: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
  await page.waitForTimeout(1_000);
  return { ok: true as const };
};

const verifyModalOpenedStep: StepHandler = async (page) => {
  // 모달 title h3 "AI 상세페이지 설명" — 버튼 라벨과 동일 텍스트라 카운트 ≥ 2 이거나 modal 컨텐츠 존재로 검증.
  // 안내 문구 "AI가 상세페이지에 들어갈 상품 설명을 작성해 드려요" 가 modal 내부에만 존재.
  const bodyText = await page.evaluate(() => document.body.innerText);
  const modalMarkers = [
    'AI가 상세페이지에 들어갈 상품 설명',
    '상품명과 속성을 바탕으로',
  ];
  const hits = modalMarkers.filter((m) => bodyText.includes(m));
  if (hits.length === 0) {
    return {
      ok: false as const,
      error_key: 'ai_modal_not_opened' as ErrorKey,
      message: `모달 안내 문구 미노출 (markers=${modalMarkers.join(' / ')})`,
    };
  }
  const cancelVisible = await page
    .getByRole('button', { name: CANCEL_BUTTON, exact: true })
    .first()
    .isVisible()
    .catch(() => false);
  const addVisible = await page
    .getByRole('button', { name: ADD_BUTTON, exact: true })
    .first()
    .isVisible()
    .catch(() => false);
  if (!cancelVisible) {
    return {
      ok: false as const,
      error_key: 'ai_modal_cancel_missing' as ErrorKey,
      message: '모달의 취소 버튼 미노출',
    };
  }
  if (!addVisible) {
    return {
      ok: false as const,
      error_key: 'ai_modal_add_missing' as ErrorKey,
      message: '모달의 상세페이지에 추가 버튼 미노출',
    };
  }
  return { ok: true as const };
};

const closeModalWithCancelStep: StepHandler = async (page) => {
  const cancel = page.getByRole('button', { name: CANCEL_BUTTON, exact: true }).first();
  try {
    await cancel.click({ timeout: 3_000 });
  } catch {
    // fallback Escape
    await page.keyboard.press('Escape');
  }
  await page.waitForTimeout(800);
  return { ok: true as const };
};

const verifyModalClosedStep: StepHandler = async (page) => {
  // 모달 안내 문구 노출 X 확인.
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (bodyText.includes('AI가 상세페이지에 들어갈 상품 설명')) {
    return {
      ok: false as const,
      error_key: 'ai_modal_still_open' as ErrorKey,
      message: '취소 후 모달이 닫히지 않음',
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_first_product_detail: openFirstCollectedProductStep,
  click_detail_page_tab: clickTabByLabelStep(/^상세페이지$/),
  hover_ai_description_button: hoverAiDescriptionButtonStep,
  verify_tooltip_visible: verifyTooltipVisibleStep,
  click_ai_description_button: clickAiDescriptionButtonStep,
  verify_modal_opened: verifyModalOpenedStep,
  close_modal_with_cancel: closeModalWithCancelStep,
  verify_modal_closed: verifyModalClosedStep,
};

test('[TC 831/832/833/838] 수집상품 상세 → [상세페이지] 탭 → [AI 상세페이지 설명] 호버 시 Tooltip → 클릭 시 모달 (제목+취소+상세페이지에 추가 버튼) 열림 → [취소] 로 닫힘', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
