/**
 * 수집상품 목록 화면 진입 + 다중 선택 + 일괄 메뉴 노출 검증.
 *
 * 대응 ATC : atcs/collected-product/list-screen-smoke.atc.yml
 * TC 원본  : Case No 3536, 3541, 3542, 3545 / P0
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
  'list-screen-smoke.atc.yml',
);

const gotoCollectedProductsStep: StepHandler = async (page) => {
  await goToCollectedProducts(page);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  // 카드 존재 확인 — input[id^="checkbox_"][value!=""] 1개 이상.
  const cardCount = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input[type="checkbox"][id^="checkbox_"]'));
    return inputs.filter((i) => (i as HTMLInputElement).value).length;
  });
  if (cardCount === 0) {
    return {
      ok: false as const,
      error_key: 'no_cards_in_list' as ErrorKey,
      message: '수집상품 목록에 카드 0건',
    };
  }
  return { ok: true as const };
};

const selectTwoCardsStep: StepHandler = async (page) => {
  const selected = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input[type="checkbox"][id^="checkbox_"]'));
    const picked: string[] = [];
    for (const inp of inputs) {
      if (picked.length >= 2) break;
      const v = (inp as HTMLInputElement).value;
      if (!v) continue;
      const id = (inp as HTMLInputElement).id;
      const label = document.querySelector(`label[for="${id}"]`) as HTMLLabelElement | null;
      const target = label ?? (inp as HTMLElement);
      const rect = (target as HTMLElement).getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      target.scrollIntoView({ block: 'center' });
      (target as HTMLElement).click();
      picked.push(v);
    }
    return picked;
  });
  if (selected.length < 2) {
    return {
      ok: false as const,
      error_key: 'multi_select_failed' as ErrorKey,
      message: `2개 선택 시도했으나 ${selected.length}개만 선택됨`,
    };
  }
  await page.waitForTimeout(500);
  return { ok: true as const };
};

const verifyBulkApplyMenuVisibleStep: StepHandler = async (page) => {
  // More 버튼 클릭 → 메뉴 노출 → 항목 매칭.
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
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (!bodyText.includes('기본 설정값 적용')) {
    return {
      ok: false as const,
      error_key: 'apply_menu_not_visible' as ErrorKey,
      message: 'More 메뉴 노출됐으나 "기본 설정값 적용" 항목 미노출',
    };
  }
  // 메뉴 닫기 — Escape.
  await page.keyboard.press('Escape');
  return { ok: true as const };
};

const handlers: StepHandlers = {
  goto_collected_products: gotoCollectedProductsStep,
  select_two_cards: selectTwoCardsStep,
  verify_bulk_apply_menu_visible: verifyBulkApplyMenuVisibleStep,
};

test('[TC 3536/3541/3542/3545] 수집상품 목록 진입 → 카드 2개 다중 선택 → 더보기(...) 메뉴에 [기본 설정값 적용] 항목 노출 확인', async ({ page }) => {
  test.setTimeout(90_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
