/**
 * 재고 (옵션별 재고량) base setting 변경 → bulk-apply → 첫 상품 판매가 탭 SalesPriceTable 매치 검증.
 *
 * 대응 ATC: atcs/e2e/verify-stock-on-product.atc.yml
 *
 * 패턴: tests/e2e/verify-delivery-fee-on-product.spec.ts 와 동일.
 *
 * Selector 출처:
 *   - windly base setting (.../BaseSetting/Common/StockLimitTab/Stock/index.tsx):
 *       <FormField title="재고">
 *         <Dropdown ... selected={useDefaultStocks ('ON'/'OFF')} />
 *         <TextField unit="개" value={formatNumberField(defaultStocks)} />  ← 우리가 변경할 input
 *       </FormField>
 *       (단일 input 이라 label 없이도 "재고" FormField scope 의 첫 input 으로 매치 가능)
 *   - 상품 detail (sesame/.../SalesPriceTable/SalesPriceTableRow/SalesPriceTableRow.tsx):
 *       row 마다 NumberFieldTableCell 마지막 = stocks (재고 컬럼).
 *       div-based custom table 이라 row 식별 어려움 → input[value="<expectedNew>"] count ≥1 로 단순 검증.
 *
 * 구매 제한 (maxPurchasePerPerson) 은 sesame UI 에 노출 안 되어 별도 ATC 미작성. 메시지로 알림.
 */

import { join } from 'path';
import type { Locator, Page } from '@playwright/test';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'e2e',
  'verify-stock-on-product.atc.yml',
);

const STOCK_URL =
  'https://app.windly.cc/view3/base-setting?setting=COMMON&category=STOCK_LIMIT';

let snapshotStock: number | null = null;

// ─────────────────────────────────────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────────────────────────────────────

function parseNumeric(raw: string): number {
  const cleaned = raw.replace(/,/g, '').trim();
  if (cleaned === '') return NaN;
  return parseFloat(cleaned);
}

// ─────────────────────────────────────────────────────────────────────────────
// Step handlers
// ─────────────────────────────────────────────────────────────────────────────

const bumpAndSnapshotStockStep: StepHandler = async (page, _inputs) => {
  await page.goto(STOCK_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForTimeout(1_500);

  // useDefaultStocks Dropdown 을 ON ('설정한 재고량 적용') 으로 강제 변경.
  // OFF ('소싱몰의 실제 재고량 적용') 면 base setting 의 defaultStocks 가 옵션 재고에 반영 안 됨 → 검증 불가.
  const offText = page.getByText('소싱몰의 실제 재고량 적용', { exact: true });
  if (
    (await offText.count()) > 0 &&
    (await offText.first().isVisible().catch(() => false))
  ) {
    logger.info('[verify-stock] useDefaultStocks=OFF 감지 — ON 으로 변경');
    await offText.first().click();
    await page.waitForTimeout(500);
    // dropdown popup 의 "설정한 재고량 적용" 옵션. last() = popup 항목 (trigger 와 구분).
    await page.getByText('설정한 재고량 적용', { exact: true }).last().click();
    await page.waitForTimeout(1_000);
  }

  // "옵션별 재고량" Text 의 ancestor 중 input 보유 wrapper. TextField (defaultStocks) input 을 last() 로 잡음.
  const stockScope = page
    .getByText('옵션별 재고량', { exact: true })
    .locator('xpath=./ancestor::*[descendant::input][1]');
  const stockInput = stockScope.locator('input').last();

  let currentRaw = '';
  try {
    await stockInput.waitFor({ state: 'visible', timeout: 30_000 });
    const start = Date.now();
    while (Date.now() - start < 10_000) {
      currentRaw = await stockInput.inputValue().catch(() => '');
      if (currentRaw.trim() !== '') break;
      await page.waitForTimeout(300);
    }
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return {
      ok: false as const,
      error_key: 'stock_input_not_found' as ErrorKey,
      message: `재고 input 미로드: ${err}`,
    };
  }

  const current = parseNumeric(currentRaw);
  if (!Number.isFinite(current)) {
    return {
      ok: false as const,
      error_key: 'stock_input_unreadable' as ErrorKey,
      message: `재고 input 현재값 파싱 실패: "${currentRaw}"`,
    };
  }

  // DefaultStocksOption: min 1, max 10000, unit 1.
  const next = current >= 10_000 ? current - 1 : current + 1;
  const newClamped = Math.min(10_000, Math.max(1, Math.round(next)));

  logger.info(`[verify-stock] 옵션별 재고량: ${current} → ${newClamped}`);
  await stockInput.click();
  await stockInput.fill('');
  await stockInput.fill(String(newClamped));
  await page.waitForTimeout(800);
  await stockInput.press('Tab');

  let after = '';
  const start = Date.now();
  while (Date.now() - start < 8_000) {
    await page.waitForTimeout(400);
    after = await stockInput.inputValue().catch(() => '');
    const parsed = parseNumeric(after);
    if (Number.isFinite(parsed) && Math.abs(parsed - newClamped) < 0.5) break;
  }
  const finalParsed = parseNumeric(after);
  if (!Number.isFinite(finalParsed) || Math.abs(finalParsed - newClamped) >= 0.5) {
    return {
      ok: false as const,
      error_key: 'stock_save_not_reflected' as ErrorKey,
      message: `재고 저장 후 input 미반영. expected=${newClamped}, actual="${after}"`,
    };
  }

  snapshotStock = newClamped;
  logger.info(`[verify-stock] snapshot: ${snapshotStock}`);
  return { ok: true as const };
};

const openCollectedListStep: StepHandler = async (page, _inputs) => {
  await page
    .goto('https://global.windly.cc/view2/interested-product', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    })
    .catch(async () => {
      await page.goto('https://app.windly.cc/view2/interested-product', {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
    });
  await page.waitForTimeout(1_500);

  const cards = page.locator('a[href*="/view2/interested-product/"]');
  try {
    await cards.first().waitFor({ state: 'visible', timeout: 15_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'collected_list_empty' as ErrorKey,
      message: '수집상품 목록에 카드 0개',
    };
  }
  return { ok: true as const };
};

const applyBaseSettingToFirstStep: StepHandler = async (page, _inputs) => {
  const cards = page.locator('a[href*="/view2/interested-product/"]');
  if ((await cards.count()) < 1) {
    return {
      ok: false as const,
      error_key: 'no_collected_card' as ErrorKey,
      message: '수집상품 카드 0개',
    };
  }

  const firstCard = cards.first();
  const checkbox = firstCard.locator('input[type="checkbox"]').first();
  if (!(await checkbox.isChecked().catch(() => false))) {
    const label = firstCard.locator('label[for^="checkbox_"]').first();
    await label.scrollIntoViewIfNeeded();
    await label.click();
    await page.waitForTimeout(500);
  }

  const targetItem = page.getByText('기본 설정값 적용', { exact: true });
  if (!(await targetItem.first().isVisible().catch(() => false))) {
    const moreBtn = page
      .locator('button:not([disabled])')
      .filter({ has: page.locator('svg path[d^="M5 10C3.9 10"]') })
      .first();
    try {
      await moreBtn.waitFor({ state: 'visible', timeout: 5_000 });
    } catch {
      return {
        ok: false as const,
        error_key: 'more_button_not_found' as ErrorKey,
        message: 'More 버튼 미발견',
      };
    }
    await moreBtn.click();
    try {
      await targetItem.first().waitFor({ state: 'visible', timeout: 3_000 });
    } catch {
      return {
        ok: false as const,
        error_key: 'bulk_menu_not_openable' as ErrorKey,
        message: '기본 설정값 적용 항목 미노출',
      };
    }
  }
  await targetItem.first().click();

  const applyBtn = page.getByRole('button', { name: /^적용$/ }).first();
  try {
    await applyBtn.waitFor({ state: 'visible', timeout: 10_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'apply_modal_not_shown' as ErrorKey,
      message: '확인 모달 미노출',
    };
  }
  await applyBtn.click({ timeout: 5_000 });

  const successToast = page.getByText(/^1개 상품이 일괄 업데이트 되었습니다\.?$/);
  const partialFailToast = page.getByText(/^일부 상품이 업데이트되지 않았습니다\.?$/);
  const start = Date.now();
  while (Date.now() - start < 60_000) {
    if (await successToast.first().isVisible().catch(() => false)) {
      logger.info('[verify-stock] bulk-apply success toast 검출');
      await page.waitForTimeout(800);
      return { ok: true as const };
    }
    if (await partialFailToast.first().isVisible().catch(() => false)) {
      return {
        ok: false as const,
        error_key: 'bulk_apply_partial_fail' as ErrorKey,
        message: '일부 상품 업데이트 실패',
      };
    }
    await page.waitForTimeout(500);
  }
  return {
    ok: false as const,
    error_key: 'bulk_apply_timeout' as ErrorKey,
    message: '60초 내 toast 미검출',
  };
};

const enterFirstProductStep: StepHandler = async (page, _inputs) => {
  const firstCard = page.locator('a[href*="/view2/interested-product/"]').first();
  await firstCard.click();
  try {
    await page.waitForURL(/\/view2\/interested-product\/\d+/, { timeout: 30_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'product_detail_navigation_failed' as ErrorKey,
      message: `상세 URL 도달 실패`,
    };
  }
  await page.waitForLoadState('domcontentloaded', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1_500);
  logger.info(`[verify-stock] entered: ${page.url()}`);
  return { ok: true as const };
};

const openSalesTabStep: StepHandler = async (page, _inputs) => {
  const tabCandidates = [
    page.getByRole('tab', { name: '판매가' }),
    page.getByRole('button', { name: /^판매가$/ }),
    page.getByText(/^판매가$/, { exact: true }),
  ];
  for (const c of tabCandidates) {
    if ((await c.count()) > 0 && (await c.first().isVisible().catch(() => false))) {
      try {
        await c.first().click({ timeout: 5_000 });
        break;
      } catch { /* 다음 후보 */ }
    }
  }

  // SalesPriceTable mount 검증 — "재고" 컬럼 헤더 노출 + input 다수.
  try {
    await page.waitForTimeout(1_500);
    // 컬럼 헤더 "재고" 노출 또는 input 충분히 많이 (옵션 N>=1) 있어야 함.
    const stocksHeader = page.getByText('재고', { exact: true });
    await stocksHeader.first().waitFor({ state: 'visible', timeout: 15_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'sales_tab_not_loaded' as ErrorKey,
      message: '판매가 탭 클릭 후 SalesPriceTable 마운트 안 됨',
    };
  }
  return { ok: true as const };
};

const verifyStockOnProductStep: StepHandler = async (page, _inputs) => {
  if (snapshotStock === null) {
    return {
      ok: false as const,
      error_key: 'snapshot_missing' as ErrorKey,
      message: 'snapshot 없음',
    };
  }
  const expectedStr = String(snapshotStock);

  // React Query cache→fetch 갱신 대비 polling.
  let count = 0;
  const start = Date.now();
  while (Date.now() - start < 10_000) {
    count = await page.locator(`input[value="${expectedStr}"]`).count();
    if (count >= 1) break;
    await page.waitForTimeout(500);
  }

  if (count < 1) {
    // 디버그: 페이지의 모든 input value 일부 sample 출력.
    const sample = await page
      .locator('input')
      .evaluateAll((els) =>
        els.slice(0, 30).map((el) => (el as HTMLInputElement).value),
      );
    logger.error(`[verify-stock] input value sample: ${JSON.stringify(sample)}`);
    return {
      ok: false as const,
      error_key: 'stock_product_no_match' as ErrorKey,
      message: `재고 ${expectedStr} 가진 input 0개. input value sample: ${JSON.stringify(sample)}`,
    };
  }

  logger.info(`[verify-stock] OK: 재고=${expectedStr} 가진 input ${count}개 매치`);
  return { ok: true as const };
};

const handlers: StepHandlers = {
  bump_and_snapshot_stock:     bumpAndSnapshotStockStep,
  open_collected_list:         openCollectedListStep,
  apply_base_setting_to_first: applyBaseSettingToFirstStep,
  enter_first_product:         enterFirstProductStep,
  open_sales_tab:              openSalesTabStep,
  verify_stock_on_product:     verifyStockOnProductStep,
};

test('재고 base setting 변경 후 첫 수집상품 판매가 탭 옵션 재고 매치 검증', async ({ page }) => {
  test.setTimeout(3 * 60_000);

  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
