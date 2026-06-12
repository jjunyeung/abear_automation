/**
 * AI 대표이미지 생성 모달 공유 step handlers.
 *
 * 여는 경로: 수집상품 상세 → [이미지] 탭 → "AI 대표이미지 생성" 버튼 → CreateImageModal.
 * 코드 출처: windly_repo/sesame/src/features/ProductDetail/ProductDetailTabs/ImageTab/CreateAiImage/
 * 한글 텍스트는 getByText 매칭이 불안정해 body innerText 정규식으로 검증한다.
 *
 * 사용 스펙: p2-ai-대표이미지-생성-모달, p1-ai-대표이미지-생성-소진정책, p0-ai-대표이미지-생성-취소 등.
 */

import type { Page } from '@playwright/test';
import type { StepHandler } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import {
  openFirstCollectedProductStep,
  clickTabByLabelStep,
} from './_talkstore-handlers';

/** 모달 렌더 마커 (Form 프롬프트 라벨). */
const MODAL_MARKER = '내 상품을 위한 대표이미지 디자인';

const bodyHas = (page: Page, src: string): Promise<boolean> =>
  page.evaluate((s) => new RegExp(s).test(document.body.innerText), src).catch(() => false);

/** 수집상품 상세 → 이미지 탭 → "AI 대표이미지 생성" → 모달 (idempotent / stateless). */
export const ensureAiImageModalFromCollected: StepHandler = async (page, inputs) => {
  if (await bodyHas(page, MODAL_MARKER)) return { ok: true as const };
  const d = await openFirstCollectedProductStep(page, inputs);
  if (!d.ok) return d;
  const tab = await clickTabByLabelStep(/^이미지$/)(page, inputs);
  if (!tab.ok) return tab;
  const btn = page.getByRole('button', { name: 'AI 대표이미지 생성' }).first();
  try {
    await btn.waitFor({ state: 'visible', timeout: 10_000 });
  } catch {
    return { ok: false as const, error_key: 'ai_image_open_button_missing' as ErrorKey, message: '"AI 대표이미지 생성" 버튼 미노출' };
  }
  await btn.click();
  for (let i = 0; i < 8; i += 1) {
    if (await bodyHas(page, MODAL_MARKER)) return { ok: true as const };
    await page.waitForTimeout(800);
  }
  return { ok: false as const, error_key: 'ai_image_modal_not_open' as ErrorKey, message: 'AI 대표이미지 모달 미노출' };
};

/** 모달 보장 후 텍스트 노출 검증. */
export const verifyAiModalText = (re: RegExp, key: string): StepHandler => async (page, inputs) => {
  const e = await ensureAiImageModalFromCollected(page, inputs);
  if (!e.ok) return e;
  for (let i = 0; i < 5; i += 1) {
    if (await bodyHas(page, re.source)) return { ok: true as const };
    await page.waitForTimeout(600);
  }
  return { ok: false as const, error_key: key as ErrorKey, message: `모달 내 미노출: ${re.source}` };
};

/** 사용량 소진(0회 남음) 상태에서 "이미지 생성" 버튼 비활성 확인. */
export const verifyAiGenerateDisabled: StepHandler = async (page, inputs) => {
  const e = await ensureAiImageModalFromCollected(page, inputs);
  if (!e.ok) return e;
  const btn = page.getByRole('button', { name: /이미지 생성 \(/ }).first();
  const disabled = await btn.isDisabled().catch(() => null);
  if (disabled !== true) {
    return { ok: false as const, error_key: 'ai_generate_not_disabled' as ErrorKey, message: `생성 버튼 비활성 아님 (disabled=${disabled})` };
  }
  return { ok: true as const };
};

/** 모달 열고 "취소" 클릭 → 모달 닫힘 확인. */
export const cancelAiImageModal: StepHandler = async (page, inputs) => {
  const e = await ensureAiImageModalFromCollected(page, inputs);
  if (!e.ok) return e;
  await page.getByRole('button', { name: '취소' }).first().click();
  for (let i = 0; i < 6; i += 1) {
    if (!(await bodyHas(page, MODAL_MARKER))) return { ok: true as const };
    await page.waitForTimeout(500);
  }
  return { ok: false as const, error_key: 'ai_modal_not_closed' as ErrorKey, message: '취소 클릭 후 모달이 닫히지 않음' };
};
