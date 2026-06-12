/**
 * AI 대표이미지 생성 모달 영역 P2 (9건) — 모달 구조 요소는 real 검증, 생성결과/state 의존은 noop.
 *
 * 대응 ATC : atcs/collected-product/p2-ai-대표이미지-생성-모달.atc.yml
 * 여는 경로: 수집상품 상세 → [이미지] 탭 → "AI 대표이미지 생성" 버튼 → 모달
 * 코드 출처: windly_repo/sesame/src/features/ProductDetail/ProductDetailTabs/ImageTab/CreateAiImage/
 *   - CreateAiImageButton.tsx: "AI 대표이미지 생성"
 *   - CreateImageModal Form.tsx: "상품명" / "기존 대표 이미지" / "내 상품을 위한 대표이미지 디자인" / "이미지 생성 (N회 남음)"
 *   - Header.tsx: "· 이미지 생성 버튼을 누르면 1회 차감돼요."  Footer.tsx: "취소" / "AI 생성 대표 이미지 추가"
 * 생성 결과/적용 버튼/초기 상태/disabled 는 AI·state 의존 → noop.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import {
  openFirstCollectedProductStep,
  clickTabByLabelStep,
} from './_talkstore-handlers';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'collected-product', 'p2-ai-대표이미지-생성-모달.atc.yml');

let detailOpen = false;
let modalOpen = false;

const ensureDetailStep: StepHandler = async (page, inputs) => {
  if (detailOpen) return { ok: true as const };
  const r = await openFirstCollectedProductStep(page, inputs);
  if (r.ok) detailOpen = true;
  return r;
};

/** 이미지 탭 → "AI 대표이미지 생성" 버튼 클릭 → 모달 노출 대기 (idempotent). */
const ensureModalStep: StepHandler = async (page, inputs) => {
  if (modalOpen) return { ok: true as const };
  const d = await ensureDetailStep(page, inputs);
  if (!d.ok) return d;
  const tab = await clickTabByLabelStep(/^이미지$/)(page, inputs);
  if (!tab.ok) return tab;
  const openBtn = page.getByRole('button', { name: 'AI 대표이미지 생성' }).first();
  try {
    await openBtn.waitFor({ state: 'visible', timeout: 10_000 });
  } catch {
    return { ok: false as const, error_key: 'ai_image_open_button_missing' as ErrorKey, message: '"AI 대표이미지 생성" 버튼 미노출' };
  }
  await openBtn.click();
  try {
    await page.getByText(/내 상품을 위한 대표이미지 디자인/).first().waitFor({ state: 'visible', timeout: 10_000 });
  } catch {
    return { ok: false as const, error_key: 'ai_image_modal_not_open' as ErrorKey, message: 'AI 대표이미지 모달 미노출' };
  }
  modalOpen = true;
  return { ok: true as const };
};

/** 모달 보장 후 텍스트 노출 검증 (body innerText 정규식 — 한글 텍스트 노드 매칭 안정). */
const verifyInModal = (re: RegExp, key: string): StepHandler => async (page, inputs) => {
  const e = await ensureModalStep(page, inputs);
  if (!e.ok) return e;
  let found = false;
  for (let i = 0; i < 5 && !found; i += 1) {
    found = await page.evaluate((src) => new RegExp(src).test(document.body.innerText), re.source);
    if (!found) await page.waitForTimeout(600);
  }
  if (!found) {
    return { ok: false as const, error_key: key as ErrorKey, message: `모달 내 미노출: ${re.source}` };
  }
  return { ok: true as const };
};

/** 사용량 소진(0회 남음) 상태에서 "이미지 생성" 버튼 비활성 확인. */
const verifyGenerateDisabledStep: StepHandler = async (page, inputs) => {
  const e = await ensureModalStep(page, inputs);
  if (!e.ok) return e;
  const btn = page.getByRole('button', { name: /이미지 생성 \(/ }).first();
  const disabled = await btn.isDisabled().catch(() => null);
  if (disabled !== true) {
    return { ok: false as const, error_key: 'ai_modal_generate_not_disabled' as ErrorKey, message: `소진 상태인데 생성 버튼 비활성 아님 (disabled=${disabled})` };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  'tc3699_상품명-노출': verifyInModal(/상품명/, 'ai_modal_product_name_missing'),
  'tc3700_잔여-사용량-노출': verifyInModal(/회 남음/, 'ai_modal_quota_missing'),
  'tc3701_프롬프트-입력-필드': verifyInModal(/내 상품을 위한 대표이미지 디자인/, 'ai_modal_prompt_missing'),
  'tc3702_이미지-생성하기-버튼': verifyInModal(/이미지 생성 \(/, 'ai_modal_generate_btn_missing'),
  'tc3703_기존-대표이미지-노출': verifyInModal(/기존 대표 이미지/, 'ai_modal_existing_image_missing'),
  'tc3704_ai-생성-이미지-영역-초기-상태': verifyInModal(/생성된 이미지가 여기에 나타나요/, 'ai_modal_result_placeholder_missing'),
  'tc3705_ai-생성-이미지-적용하기-버튼': verifyInModal(/AI 생성 대표 이미지 추가/, 'ai_modal_apply_btn_missing'),
  'tc3706_취소-버튼': verifyInModal(/취소/, 'ai_modal_cancel_missing'),
  'tc3708_사용량-소진-시-버튼-disabled': verifyGenerateDisabledStep,
};

test('AI 대표이미지 생성 모달 — 상품명/잔여사용량/프롬프트/기존이미지/취소 노출 (TC 3699~3708)', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  detailOpen = false;
  modalOpen = false;
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
