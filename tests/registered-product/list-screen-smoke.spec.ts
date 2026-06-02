/**
 * 등록상품 목록 화면 smoke + 다중선택 + 수정 업로드 모달 노출.
 *
 * 대응 ATC : atcs/registered-product/list-screen-smoke.atc.yml
 * TC 원본  : Case No 3566, 3569, 3570, 3572, 3573 / P0 (5건). 실제 업로드 destructive skip.
 *
 * 수집상품 list-screen-smoke 의 등록상품 버전. CheckBox / Modal 구조 동일.
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
  'list-screen-smoke.atc.yml',
);

const EDIT_UPLOAD_BUTTON = '수정 업로드';
const MODAL_TITLE = '수정 업로드';
const CANCEL_BUTTON = '취소';

const gotoRegisteredProductsStep: StepHandler = async (page) => {
  await goToRegisteredProducts(page);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  // 카드 존재 확인 — input[id^="checkbox_"][value!=""] 1개 이상.
  const cardCount = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input[type="checkbox"][id^="checkbox_"]'));
    return inputs.filter((i) => (i as HTMLInputElement).value).length;
  });
  if (cardCount === 0) {
    return {
      ok: false as const,
      error_key: 'no_registered_products' as ErrorKey,
      message: '등록상품 목록에 카드 0건',
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
      message: '첫 카드 체크박스 클릭 실패',
    };
  }
  await page.waitForTimeout(400);
  return { ok: true as const };
};

const selectSecondCardStep: StepHandler = async (page) => {
  // 첫 카드 다음에 두 번째 카드의 체크박스 click.
  const result = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input[type="checkbox"][id^="checkbox_"]')) as HTMLInputElement[];
    const cards = inputs.filter((i) => i.value);
    if (cards.length < 2) return { ok: false, count: cards.length };
    const second = cards[1];
    const label = document.querySelector(`label[for="${second.id}"]`) as HTMLLabelElement | null;
    const target = (label ?? second) as HTMLElement;
    target.scrollIntoView({ block: 'center' });
    target.click();
    return { ok: true, count: cards.length };
  });
  if (!result.ok) {
    return {
      ok: false as const,
      error_key: 'second_card_select_failed' as ErrorKey,
      message: `두 번째 카드 선택 실패 - 카드 개수 ${result.count}`,
    };
  }
  await page.waitForTimeout(400);

  // 선택된 체크박스 개수 ≥ 2 검증.
  const checkedCount = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input[type="checkbox"][id^="checkbox_"]')) as HTMLInputElement[];
    return inputs.filter((i) => i.value && i.checked).length;
  });
  if (checkedCount < 2) {
    return {
      ok: false as const,
      error_key: 'multi_select_not_reflected' as ErrorKey,
      message: `다중 선택 후 checked 개수 ${checkedCount} (≥2 기대)`,
    };
  }
  return { ok: true as const };
};

const verifyEditUploadButtonEnabledStep: StepHandler = async (page) => {
  // 2개 선택 후 수정 업로드 버튼이 enabled 여야 함.
  const btn = page.getByRole('button', { name: EDIT_UPLOAD_BUTTON, exact: true }).first();
  try {
    await btn.waitFor({ state: 'visible', timeout: 5_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'edit_upload_button_missing' as ErrorKey,
      message: `${EDIT_UPLOAD_BUTTON} 버튼 미노출`,
    };
  }
  const isDisabled = await btn.isDisabled().catch(() => false);
  if (isDisabled) {
    return {
      ok: false as const,
      error_key: 'edit_upload_button_disabled' as ErrorKey,
      message: `${EDIT_UPLOAD_BUTTON} 버튼이 disabled - 선택 인식 실패 or 권한 문제`,
    };
  }
  return { ok: true as const };
};

const openEditUploadModalStep: StepHandler = async (page) => {
  const btn = page.getByRole('button', { name: EDIT_UPLOAD_BUTTON, exact: true }).first();
  try {
    await btn.click({ timeout: 5_000 });
  } catch (e) {
    return {
      ok: false as const,
      error_key: 'edit_upload_button_click_failed' as ErrorKey,
      message: `${EDIT_UPLOAD_BUTTON} 버튼 클릭 실패: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
  await page.waitForTimeout(1_500);
  return { ok: true as const };
};

const verifyModalTitleVisibleStep: StepHandler = async (page) => {
  // 모달 제목 h3 "수정 업로드". 버튼 텍스트도 동일이라 body innerText 로 검증.
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (!bodyText.includes(MODAL_TITLE)) {
    return {
      ok: false as const,
      error_key: 'edit_upload_modal_not_opened' as ErrorKey,
      message: `모달 title "${MODAL_TITLE}" 미노출 - BulkEditModal 미오픈 or toast 만 노출 (확장 미로딩?)`,
    };
  }
  // 모달 안 사용 가이드 링크 또는 ProgressHeader 검증.
  const hasGuide = bodyText.includes('사용 가이드');
  if (!hasGuide) {
    return {
      ok: false as const,
      error_key: 'edit_upload_modal_content_missing' as ErrorKey,
      message: `모달 사용 가이드 링크 미노출 — 모달이 아닌 toast 또는 다른 영역일 수 있음`,
    };
  }
  return { ok: true as const };
};

const closeModalStep: StepHandler = async (page) => {
  // Modal 의 leftButton (취소 또는 닫기). closeOnClickOutside=true 라 외부 클릭도 가능.
  const cancelBtn = page.getByRole('button', { name: CANCEL_BUTTON, exact: true }).first();
  let clicked = false;
  try {
    if (await cancelBtn.isVisible().catch(() => false)) {
      await cancelBtn.click({ timeout: 3_000 });
      clicked = true;
    }
  } catch {
    // fallback below
  }
  if (!clicked) {
    // fallback — Escape
    await page.keyboard.press('Escape');
  }
  await page.waitForTimeout(800);
  return { ok: true as const };
};

const handlers: StepHandlers = {
  goto_registered_products: gotoRegisteredProductsStep,
  select_first_card: selectFirstCardStep,
  select_second_card: selectSecondCardStep,
  verify_edit_upload_button_enabled: verifyEditUploadButtonEnabledStep,
  open_edit_upload_modal: openEditUploadModalStep,
  verify_modal_title_visible: verifyModalTitleVisibleStep,
  close_modal: closeModalStep,
};

test('[TC 3566/3569/3570/3572/3573] 등록상품 목록 진입 → 개별/다중 카드 선택 → [수정 업로드] 클릭 → BulkEditModal 열림 → 닫기', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
