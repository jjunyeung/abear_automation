/**
 * 수집상품 일괄 → 카테고리/태그 + 상품명 변경 모달 노출 검증.
 *
 * 대응 ATC : atcs/collected-product/bulk-edit-modals-display.atc.yml
 * TC 원본  : Case No 1098, 1100-1104 / P0 (모달 노출 위주)
 *
 * Modal 출처 (sesame):
 *   - ProductBulkChangeModal: title="카테고리/태그 일괄 변경"
 *   - TitleBulkChangeModal: title="상품명 변경"
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { goToCollectedProducts } from '../../lib/windly-actions';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'collected-product',
  'bulk-edit-modals-display.atc.yml',
);

type CaseKind = 'category_tag' | 'title_change';
interface Case {
  tcNo: number;
  kind: CaseKind;
  modalTitle: string;
}

const CASES: Case[] = [
  { tcNo: 1098, kind: 'category_tag', modalTitle: '카테고리/태그 일괄 변경' },
  { tcNo: 1100, kind: 'title_change', modalTitle: '상품명 변경' },
];

const gotoCollectedProductsStep: StepHandler = async (page) => {
  await goToCollectedProducts(page);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
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
      error_key: 'no_product_card' as ErrorKey,
      message: '수집상품 카드 체크박스 미발견',
    };
  }
  await page.waitForTimeout(500);
  return { ok: true as const };
};

const openBulkModalStep: StepHandler = async (page, inputs) => {
  const kind = inputs['kind'] as CaseKind;
  if (kind === 'category_tag') {
    // EditIcon (sesame/src/public/icons/edit.svg) path d 시그니처 = "M14.06 9.02L14.98 9.94"
    // 일괄 도구 영역의 enabled secondary onlyIcon button 중 매칭.
    const editBtn = page.locator('button:not([disabled]):has(svg path[d^="M14.06 9.02"])').first();
    try {
      await editBtn.waitFor({ state: 'visible', timeout: 8_000 });
    } catch {
      return {
        ok: false as const,
        error_key: 'category_tag_button_not_found' as ErrorKey,
        message: 'EditIcon (카테고리&태그 변경) 버튼 미발견 — 마켓 미연결로 disabled 가능성',
      };
    }
    await editBtn.scrollIntoViewIfNeeded();
    await editBtn.click();
    await page.waitForTimeout(800);
    return { ok: true as const };
  }
  if (kind === 'title_change') {
    // ... More 메뉴 → 상품명 변경 클릭.
    const moreBtn = page.locator('button:not([disabled]):has(svg path[d^="M5 10C3.9 10"])').first();
    try {
      await moreBtn.waitFor({ state: 'visible', timeout: 8_000 });
    } catch {
      return {
        ok: false as const,
        error_key: 'more_button_not_found' as ErrorKey,
        message: 'More 버튼 미발견',
      };
    }
    await moreBtn.click();
    await page.waitForTimeout(500);
    const item = page.getByText('상품명 변경', { exact: true }).first();
    try {
      await item.waitFor({ state: 'visible', timeout: 5_000 });
    } catch {
      return {
        ok: false as const,
        error_key: 'title_menu_not_visible' as ErrorKey,
        message: 'More 메뉴에 상품명 변경 항목 미노출',
      };
    }
    await item.click();
    await page.waitForTimeout(800);
    return { ok: true as const };
  }
  return {
    ok: false as const,
    error_key: 'unknown_kind' as ErrorKey,
    message: `Unknown CaseKind: ${kind}`,
  };
};

const verifyModalOpenedStep: StepHandler = async (page, inputs) => {
  const expectedTitle = inputs['modal_title'] as string;
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (!bodyText.includes(expectedTitle)) {
    return {
      ok: false as const,
      error_key: 'modal_title_missing' as ErrorKey,
      message: `body 텍스트에 모달 title "${expectedTitle}" 없음`,
    };
  }
  return { ok: true as const };
};

const closeModalStep: StepHandler = async (page) => {
  // 취소 버튼 또는 X 닫기 버튼. 취소 먼저 시도.
  const cancel = page.getByRole('button', { name: '취소', exact: true }).first();
  if (await cancel.isVisible().catch(() => false)) {
    await cancel.click();
    await page.waitForTimeout(600);
    return { ok: true as const };
  }
  // 닫기 svg 또는 X — 메모리에 close.svg 시그니처 없음. Escape 대체.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
  return { ok: true as const };
};

const handlers: StepHandlers = {
  goto_collected_products: gotoCollectedProductsStep,
  select_first_card: selectFirstCardStep,
  open_bulk_modal: openBulkModalStep,
  verify_modal_opened: verifyModalOpenedStep,
  close_modal: closeModalStep,
};

for (const c of CASES) {
  test(`#${c.tcNo} 수집상품 일괄 → ${c.modalTitle} 모달 노출+닫기`, async ({ page }) => {
    test.setTimeout(2 * 60_000);
    const atc = loadATC(ATC_PATH);
    const result = await runATC({
      atc,
      page,
      inputs: { kind: c.kind, modal_title: c.modalTitle },
      handlers,
    });
    await test.info().attach('atc-result', {
      body: JSON.stringify(result),
      contentType: 'application/json',
    });
    expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
  });
}
