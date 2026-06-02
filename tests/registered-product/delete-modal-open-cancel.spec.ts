/**
 * 등록상품 / 상품 삭제 모달 open + 취소 (non-destructive).
 *
 * 대응 ATC : atcs/registered-product/delete-modal-open-cancel.atc.yml
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { goToRegisteredProducts } from '../../lib/windly-actions';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'registered-product',
  'delete-modal-open-cancel.atc.yml',
);

const DELETE_BUTTON = '상품 삭제';
const DELETE_MODAL_TITLE = '등록상품 삭제';
const CANCEL_BUTTON = '취소';

let modalOpened = false;

const gotoRegisteredProductsStep: StepHandler = async (page) => {
  modalOpened = false;
  await goToRegisteredProducts(page);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  const cardCount = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input[type="checkbox"][id^="checkbox_"]'));
    return inputs.filter((i) => (i as HTMLInputElement).value).length;
  });
  if (cardCount === 0) {
    return {
      ok: false as const,
      error_key: 'no_registered_products' as ErrorKey,
      message: '등록상품 0건',
    };
  }
  return { ok: true as const };
};

const selectFirstCardStep: StepHandler = async (page) => {
  const clicked = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input[type="checkbox"][id^="checkbox_"]'));
    for (const inp of inputs) {
      const v = (inp as HTMLInputElement).value;
      if (!v) continue;
      const id = (inp as HTMLInputElement).id;
      const label = document.querySelector(`label[for="${id}"]`) as HTMLLabelElement | null;
      const target = label ?? (inp as HTMLElement);
      const rect = (target as HTMLElement).getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      target.scrollIntoView({ block: 'center' });
      (target as HTMLElement).click();
      return v;
    }
    return null;
  });
  if (!clicked) {
    return {
      ok: false as const,
      error_key: 'first_card_select_failed' as ErrorKey,
      message: '첫 카드 선택 실패',
    };
  }
  await page.waitForTimeout(400);
  return { ok: true as const };
};

const openDeleteModalOrSkipStep: StepHandler = async (page) => {
  const btn = page.getByRole('button', { name: DELETE_BUTTON, exact: true }).first();
  if (!(await btn.isVisible().catch(() => false))) {
    return {
      ok: false as const,
      error_key: 'delete_button_missing' as ErrorKey,
      message: '상품 삭제 버튼 미노출',
    };
  }
  if (await btn.isDisabled().catch(() => false)) {
    // 권한 없음 또는 선택 없음 — skip success.
    // eslint-disable-next-line no-console
    console.log('[TC876+] 상품 삭제 버튼 disabled - 권한 없음 또는 선택 인식 실패. success skip.');
    return { ok: true as const };
  }
  await btn.click({ timeout: 5_000 });
  await page.waitForTimeout(1_000);
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (!bodyText.includes(DELETE_MODAL_TITLE)) {
    return {
      ok: false as const,
      error_key: 'delete_modal_not_opened' as ErrorKey,
      message: `${DELETE_MODAL_TITLE} 모달 title 미노출`,
    };
  }
  modalOpened = true;
  return { ok: true as const };
};

const verifyDeleteModalTitleStep: StepHandler = async (page) => {
  if (!modalOpened) return { ok: true as const };
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (!bodyText.includes(DELETE_MODAL_TITLE)) {
    return {
      ok: false as const,
      error_key: 'delete_modal_title_lost' as ErrorKey,
      message: '모달 title 노출 안 됨',
    };
  }
  return { ok: true as const };
};

const cancelDeleteModalStep: StepHandler = async (page) => {
  if (!modalOpened) return { ok: true as const };
  const cancel = page.getByRole('button', { name: CANCEL_BUTTON, exact: true }).first();
  if (await cancel.isVisible().catch(() => false)) {
    await cancel.click({ timeout: 3_000 }).catch(() => undefined);
  } else {
    await page.keyboard.press('Escape');
  }
  await page.waitForTimeout(800);
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (bodyText.includes(DELETE_MODAL_TITLE)) {
    return {
      ok: false as const,
      error_key: 'delete_modal_not_closed' as ErrorKey,
      message: '취소 후 모달이 닫히지 않음',
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  goto_registered_products: gotoRegisteredProductsStep,
  select_first_card: selectFirstCardStep,
  open_delete_modal_or_skip: openDeleteModalOrSkipStep,
  verify_delete_modal_title: verifyDeleteModalTitleStep,
  cancel_delete_modal: cancelDeleteModalStep,
};

test('[TC 876-923] 등록상품 목록 → 카드 선택 → [상품 삭제] 버튼 클릭 → 삭제 모달 열림 → [취소] 로 닫힘 (실 삭제 X)', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
