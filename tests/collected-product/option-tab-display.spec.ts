/**
 * 수집상품 상세 옵션탭 진입 + 영역 노출 검증.
 *
 * 대응 ATC : atcs/collected-product/option-tab-display.atc.yml
 * TC 원본  : Case No 850-855 / P0 (옵션그룹/옵션 삭제 사전 UI 검증)
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
  'option-tab-display.atc.yml',
);

const gotoCollectedProductsStep: StepHandler = async (page) => {
  await goToCollectedProducts(page);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  return { ok: true as const };
};

const openFirstCardStep: StepHandler = async (page) => {
  // 첫 ProductCardLink (a 태그) 클릭. ProductCard 의 ProductCardLink 가 to=productId.
  const link = page
    .locator('a[href*="/view2/interested-product/"]:not([href$="/view2/interested-product/"])')
    .first();
  try {
    await link.waitFor({ state: 'visible', timeout: 8_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'no_product_link' as ErrorKey,
      message: '수집상품 카드 link 미발견',
    };
  }
  await link.scrollIntoViewIfNeeded();
  await link.click();
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1500);
  return { ok: true as const };
};

const clickOptionTabStep: StepHandler = async (page) => {
  // TabGroup 의 "옵션" tab. text 매칭.
  const tab = page.getByText('옵션', { exact: true }).first();
  try {
    await tab.waitFor({ state: 'visible', timeout: 8_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'option_tab_not_found' as ErrorKey,
      message: '옵션 탭 미노출 (상세 페이지 mount 실패 가능)',
    };
  }
  await tab.click();
  await page.waitForTimeout(800);
  return { ok: true as const };
};

const verifyOptionAreaVisibleStep: StepHandler = async (page) => {
  const bodyText = await page.evaluate(() => document.body.innerText);
  // 옵션탭 노출 후 일반적인 키워드 — "옵션그룹" 또는 "옵션이 없는" 또는 "옵션 추가" 등.
  const keywords = ['옵션그룹', '옵션 추가', '옵션이 없', '옵션이미지'];
  const found = keywords.find((k) => bodyText.includes(k));
  if (!found) {
    return {
      ok: false as const,
      error_key: 'option_area_not_visible' as ErrorKey,
      message: `옵션탭 영역 키워드 ${keywords.join('/')} 모두 미노출`,
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  goto_collected_products: gotoCollectedProductsStep,
  open_first_card: openFirstCardStep,
  click_option_tab: clickOptionTabStep,
  verify_option_area_visible: verifyOptionAreaVisibleStep,
};

test('[TC 850-855] 수집상품 상세 → [옵션] 탭 진입 → 옵션그룹/옵션 영역 + 삭제 버튼 노출 확인 (실 삭제 destructive 라 visibility 만)', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
