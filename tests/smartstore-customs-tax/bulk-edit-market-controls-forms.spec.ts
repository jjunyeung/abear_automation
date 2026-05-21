/**
 * step1 마켓 선택 패턴에 따라 step2 form 활성/비활성 변화 검증.
 *
 * 대응 ATC : atcs/upload/bulk-edit-market-controls-forms.atc.yml
 * TC 원본  : Case No 3601 / 등록상품 › 수정 업로드 › 선택 마켓 기반 활성 제어 / P0
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
  openRegisteredListStep,
  selectFirstProductStep,
  modalNextButton,
  modalCancelButton,
  STEP2_FORM_LABEL_RE,
} from './_bulk-edit-handlers';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'smartstore-customs-tax',
  'bulk-edit-market-controls-forms.atc.yml',
);

// round 간 공유할 D1 카운트.
let D1 = -1;

const round1OpenWithAllStep: StepHandler = async (page) => {
  // 수정 업로드 버튼 클릭
  const btn = page.getByRole('button', { name: /^수정\s*업로드$/ }).first();
  await btn.waitFor({ state: 'visible', timeout: 5_000 });
  await btn.click();

  // step1 banner 대기
  await page.locator('.banner').first().waitFor({ state: 'visible', timeout: 10_000 });

  // 전체 선택 클릭
  const all = page.locator('.checkbox-all-container label[for^="checkbox_"]').first();
  await all.click();
  await page.waitForTimeout(300);

  // 다음
  const next = modalNextButton(page);
  await next.click();
  await page.getByText(STEP2_FORM_LABEL_RE).first().waitFor({ state: 'visible', timeout: 10_000 });
  return { ok: true as const };
};

const round1CountDisabledStep: StepHandler = async (page) => {
  D1 = await page.locator('input[type="radio"]:disabled').count();
  // 취소로 모달 닫기 (step2 cancelButtonText='이전' 이므로 step1 으로 돌아감 → 한 번 더 클릭).
  // 가장 단순: step2 의 이전 버튼 클릭 → step1 → 취소 클릭.
  const back = page.getByRole('button', { name: /^이전$/ }).first();
  await back.click();
  await page.locator('.banner').first().waitFor({ state: 'visible', timeout: 5_000 });
  const cancel = modalCancelButton(page);
  await cancel.click();
  await page.locator('.banner').first().waitFor({ state: 'hidden', timeout: 5_000 });
  return { ok: true as const };
};

const round2OpenWithoutSsStep: StepHandler = async (page) => {
  const btn = page.getByRole('button', { name: /^수정\s*업로드$/ }).first();
  await btn.click();
  await page.locator('.banner').first().waitFor({ state: 'visible', timeout: 10_000 });

  const nonSmartStore = page
    .locator('label[for^="checkbox_"]')
    .filter({ hasText: /(쿠팡|11번가|톡스토어|롯데온|위메프|인터파크|에스엠|G마켓|옥션)/ })
    .first();
  await nonSmartStore.click();
  await page.waitForTimeout(300);

  const next = modalNextButton(page);
  await next.click();
  await page.getByText(STEP2_FORM_LABEL_RE).first().waitFor({ state: 'visible', timeout: 10_000 });
  return { ok: true as const };
};

const round2CountAndCompareStep: StepHandler = async (page) => {
  const D2 = await page.locator('input[type="radio"]:disabled').count();
  if (D1 < 0) {
    return {
      ok: false as const,
      error_key: 'd1_not_measured' as ErrorKey,
      message: 'round1 D1 미측정 — step 순서 오류',
    };
  }
  if (D2 <= D1) {
    return {
      ok: false as const,
      error_key: 'no_disable_change' as ErrorKey,
      message: `D1=${D1} (전체 선택), D2=${D2} (스스 제외) — 기대 D2 > D1`,
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_registered_list: openRegisteredListStep,
  select_first_product: selectFirstProductStep,
  round1_open_with_all: round1OpenWithAllStep,
  round1_count_disabled: round1CountDisabledStep,
  round2_open_without_ss: round2OpenWithoutSsStep,
  round2_count_and_compare: round2CountAndCompareStep,
};

test('step1 마켓 패턴 따라 step2 form 활성/비활성 변화', async ({ page }) => {
  test.setTimeout(5 * 60_000);

  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
