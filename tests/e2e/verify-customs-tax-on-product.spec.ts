/**
 * 관부가세 base setting 변경 → bulk-apply → 첫 상품 업로드 설정 탭에서 selected 매치 검증.
 *
 * 대응 ATC: atcs/e2e/verify-customs-tax-on-product.atc.yml
 *
 * 패턴: tests/e2e/verify-delivery-fee-on-product.spec.ts 와 동일 (snapshot+bump → bulk-apply → match).
 *
 * Selector 출처:
 *   - windly base setting (.../BaseSetting/Common/DeliveryInfoTab/CustomsTax/index.tsx):
 *       <FormField title="관부가세 설정">
 *         <SegmentedButtonGroup>
 *           <SegmentedButton selected={...}>부과 대상 아님</SegmentedButton>
 *           <SegmentedButton selected={...}>관부가세 포함</SegmentedButton>
 *           <SegmentedButton selected={...}>관부가세 미포함</SegmentedButton>
 *         </SegmentedButtonGroup>
 *       </FormField>
 *   - 상품 detail (sesame/.../UploadTab/CommonUploadSettings/CustomsTax/index.tsx):
 *       <Subheader title="관부가세 설정" .../>
 *       <SegmentedButtonGroup>
 *         (동일 3개 button)
 *       </SegmentedButtonGroup>
 *
 * SegmentedButton 의 selected 판정:
 *   sesame/windly 둘 다 styled emotion `active={selected}` prop 으로 시각만 변경.
 *   button 안 자식 span 의 opacity 가 활성 1, 비활성 0.4. computed style 검사.
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
  'verify-customs-tax-on-product.atc.yml',
);

const DELIVERY_URL =
  'https://app.windly.cc/view3/base-setting?setting=COMMON&category=DELIVERY_INFO';

const TAX_OPTIONS = ['부과 대상 아님', '관부가세 포함', '관부가세 미포함'] as const;
type TaxOption = typeof TAX_OPTIONS[number];

let snapshotSelected: TaxOption | null = null;

// ─────────────────────────────────────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SegmentedButtonGroup 안에서 현재 selected 인 옵션의 텍스트 반환.
 * @param scopeLocator group 의 ancestor (SegmentedButton 들이 자손).
 *
 * 활성 button: 자식 span 의 computed opacity ≈ 1.
 * 비활성: opacity ≈ 0.4.
 */
async function getSelectedSegmentedOption(
  scope: Locator,
  options: readonly string[],
): Promise<string | null> {
  for (const opt of options) {
    const btn = scope.getByRole('button', { name: opt }).first();
    if ((await btn.count()) === 0) continue;

    // span 자식의 computed opacity. button 자체엔 active 표시 없음.
    const opacity = await btn
      .locator('span')
      .first()
      .evaluate((el) => {
        const o = window.getComputedStyle(el).opacity;
        return parseFloat(o);
      })
      .catch(() => NaN);

    if (Number.isFinite(opacity) && opacity >= 0.9) {
      return opt;
    }
  }
  return null;
}

function nextOption(current: TaxOption): TaxOption {
  const i = TAX_OPTIONS.indexOf(current);
  return TAX_OPTIONS[(i + 1) % TAX_OPTIONS.length];
}

// ─────────────────────────────────────────────────────────────────────────────
// Step handlers
// ─────────────────────────────────────────────────────────────────────────────

const bumpAndSnapshotCustomsTaxStep: StepHandler = async (page, _inputs) => {
  await page.goto(DELIVERY_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForTimeout(1_500);

  // 관부가세 설정 FormField scope. title text 의 ancestor 중 SegmentedButton 들 가지는 것.
  const customsTaxScope = page
    .getByText('관부가세 설정', { exact: true })
    .locator('xpath=./ancestor::*[descendant::button][1]');

  // 3개 button 노출 대기.
  try {
    await customsTaxScope
      .getByRole('button', { name: TAX_OPTIONS[0] })
      .first()
      .waitFor({ state: 'visible', timeout: 30_000 });
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return {
      ok: false as const,
      error_key: 'customs_tax_buttons_not_found' as ErrorKey,
      message: `관부가세 SegmentedButton 미노출: ${err}`,
    };
  }

  // 현재 selected.
  const before = await getSelectedSegmentedOption(customsTaxScope, TAX_OPTIONS);
  if (before === null) {
    return {
      ok: false as const,
      error_key: 'customs_tax_selected_undetectable' as ErrorKey,
      message: '관부가세 SegmentedButton 의 selected 를 opacity 로 판정 실패',
    };
  }

  const after = nextOption(before as TaxOption);
  logger.info(`[verify-tax] 관부가세: ${before} → ${after}`);

  await customsTaxScope.getByRole('button', { name: after }).first().click({ timeout: 5_000 });
  await page.waitForTimeout(800); // React state + API 응답 대기.

  // 클릭 후 selected 가 바뀌었는지 확인.
  const verified = await getSelectedSegmentedOption(customsTaxScope, TAX_OPTIONS);
  if (verified !== after) {
    return {
      ok: false as const,
      error_key: 'customs_tax_change_not_reflected' as ErrorKey,
      message: `클릭 후 selected="${verified}" expected="${after}"`,
    };
  }
  snapshotSelected = after as TaxOption;
  logger.info(`[verify-tax] snapshot: ${snapshotSelected}`);
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
      logger.info('[verify-tax] bulk-apply success toast 검출');
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
  logger.info(`[verify-tax] entered: ${page.url()}`);
  return { ok: true as const };
};

const openUploadTabStep: StepHandler = async (page, _inputs) => {
  // sesame ProductDetail tab "업로드 설정" (value="upload").
  const tabCandidates = [
    page.getByRole('tab', { name: '업로드 설정' }),
    page.getByRole('button', { name: /^업로드 설정$/ }),
    page.getByText(/^업로드 설정$/, { exact: true }),
  ];
  let clicked = false;
  for (const c of tabCandidates) {
    if ((await c.count()) > 0 && (await c.first().isVisible().catch(() => false))) {
      try {
        await c.first().click({ timeout: 5_000 });
        clicked = true;
        break;
      } catch { /* 다음 후보 */ }
    }
  }
  if (!clicked) {
    return {
      ok: false as const,
      error_key: 'upload_tab_not_found' as ErrorKey,
      message: '"업로드 설정" 탭 클릭 가능 요소 미발견',
    };
  }

  // 관부가세 설정 Subheader 노출 대기.
  try {
    await page
      .getByText('관부가세 설정', { exact: true })
      .first()
      .waitFor({ state: 'visible', timeout: 15_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'customs_tax_subheader_not_loaded' as ErrorKey,
      message: '업로드 설정 탭 클릭 후 관부가세 설정 미노출',
    };
  }
  return { ok: true as const };
};

const verifyCustomsTaxOnProductStep: StepHandler = async (page, _inputs) => {
  if (!snapshotSelected) {
    return {
      ok: false as const,
      error_key: 'snapshot_missing' as ErrorKey,
      message: 'snapshot 미완',
    };
  }

  // 업로드 설정 탭 안 관부가세 SegmentedButton scope.
  const taxScope = page
    .getByText('관부가세 설정', { exact: true })
    .locator('xpath=./ancestor::*[descendant::button][1]');

  // button 노출 대기.
  try {
    await taxScope
      .getByRole('button', { name: TAX_OPTIONS[0] })
      .first()
      .waitFor({ state: 'visible', timeout: 15_000 });
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return {
      ok: false as const,
      error_key: 'product_customs_tax_buttons_not_found' as ErrorKey,
      message: `상품의 관부가세 SegmentedButton 미노출: ${err}`,
    };
  }

  // selected 추출 — 잠깐 polling (React Query 캐시→fetch 갱신 대비).
  let actual: string | null = null;
  const start = Date.now();
  while (Date.now() - start < 8_000) {
    actual = await getSelectedSegmentedOption(taxScope, TAX_OPTIONS);
    if (actual === snapshotSelected) break;
    await page.waitForTimeout(400);
  }

  if (actual !== snapshotSelected) {
    const msg = `관부가세 mismatch: expected="${snapshotSelected}", actual="${actual}"`;
    logger.error(`[verify-tax] FAIL: ${msg}`);
    return {
      ok: false as const,
      error_key: 'customs_tax_product_mismatch' as ErrorKey,
      message: msg,
    };
  }

  logger.info(`[verify-tax] OK: 관부가세 → "${actual}" (= snapshot)`);
  return { ok: true as const };
};

const handlers: StepHandlers = {
  bump_and_snapshot_customs_tax: bumpAndSnapshotCustomsTaxStep,
  open_collected_list:           openCollectedListStep,
  apply_base_setting_to_first:   applyBaseSettingToFirstStep,
  enter_first_product:           enterFirstProductStep,
  open_upload_tab:               openUploadTabStep,
  verify_customs_tax_on_product: verifyCustomsTaxOnProductStep,
};

test('관부가세 base setting 변경 후 첫 수집상품 업로드 설정 탭 매치 검증', async ({ page }) => {
  test.setTimeout(3 * 60_000);

  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
