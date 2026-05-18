/**
 * 상품 속성 base setting 변경 → bulk-apply → 첫 상품 상품 속성 탭 매치 검증.
 *
 * 대응 ATC: atcs/e2e/verify-product-attribute-on-product.atc.yml
 *
 * Selector 출처:
 *   - windly base setting (.../BaseSetting/Common/ProductAttributeTab/index.tsx):
 *       <FormField title="상품 속성">
 *         <TextField label="제조사" .../>
 *         <TextField label="브랜드" .../>
 *         <Dropdown label="미성년자 구매" optionSets=ADULT_ONLY .../>
 *       </FormField>
 *   - 상품 detail (sesame/.../AttributeTab/CommonAttributes/index.tsx):
 *       <Dropdown label="미성년자 구매" .../>
 *       <TextField label="제조사" .../>
 *       <TextField label="브랜드" .../>
 *
 * Dropdown 의 selected 추출: trigger 안 텍스트 (단독 "가능" 또는 "불가능").
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
  'verify-product-attribute-on-product.atc.yml',
);

const ATTRIBUTE_URL =
  'https://app.windly.cc/view3/base-setting?setting=COMMON&category=PRODUCT_ATTRIBUTE';

const ADULT_ONLY_LABELS = ['가능', '불가능'] as const;
type AdultOnlyLabel = typeof ADULT_ONLY_LABELS[number];

interface AttributeSnapshot {
  manufacturer: string;
  brand: string;
  adultOnly: AdultOnlyLabel;
}

let snapshot: AttributeSnapshot | null = null;

// ─────────────────────────────────────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────────────────────────────────────

function fieldInputByLabel(page: Page, label: string): Locator {
  return page
    .getByText(label, { exact: true })
    .locator('xpath=./ancestor::*[descendant::input][1]')
    .locator('input')
    .first();
}

/** 단독 "가능" / "불가능" Text 중 visible 한 것 = Dropdown trigger 의 selected 표시. */
async function getSelectedAdultOnlyLabel(
  page: Page,
): Promise<AdultOnlyLabel | null> {
  for (const label of ADULT_ONLY_LABELS) {
    const txt = page.getByText(label, { exact: true });
    if ((await txt.count()) > 0 && (await txt.first().isVisible().catch(() => false))) {
      return label;
    }
  }
  return null;
}

function nextAdultOnly(current: AdultOnlyLabel): AdultOnlyLabel {
  return current === '가능' ? '불가능' : '가능';
}

// ─────────────────────────────────────────────────────────────────────────────
// Step handlers
// ─────────────────────────────────────────────────────────────────────────────

const bumpAndSnapshotAttributeStep: StepHandler = async (page, _inputs) => {
  await page.goto(ATTRIBUTE_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForTimeout(1_500);

  // 제조사 / 브랜드 — unique 값으로 fill.
  const ts = String(Date.now()).slice(-6);
  const newManufacturer = `TC제조사_${ts}`;
  const newBrand = `TC브랜드_${ts}`;

  for (const [label, value] of [
    ['제조사', newManufacturer],
    ['브랜드', newBrand],
  ] as const) {
    const input = fieldInputByLabel(page, label);
    try {
      await input.waitFor({ state: 'visible', timeout: 30_000 });
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      return {
        ok: false as const,
        error_key: 'attribute_input_not_found' as ErrorKey,
        message: `"${label}" input 미로드: ${err}`,
      };
    }
    logger.info(`[verify-attr] ${label}: → "${value}"`);
    await input.click();
    await input.fill('');
    await input.fill(value);
    await page.waitForTimeout(800);
    await input.press('Tab');

    // onBlur API 응답 후 input value 가 새 값으로 유지되는지 확인.
    let after = '';
    const start = Date.now();
    while (Date.now() - start < 8_000) {
      await page.waitForTimeout(400);
      after = await input.inputValue().catch(() => '');
      if (after === value) break;
    }
    if (after !== value) {
      return {
        ok: false as const,
        error_key: 'attribute_save_not_reflected' as ErrorKey,
        message: `"${label}" 저장 후 값 미반영. expected="${value}", actual="${after}"`,
      };
    }
  }

  // 미성년자 구매 Dropdown — cycle.
  const beforeAdult = await getSelectedAdultOnlyLabel(page);
  if (beforeAdult === null) {
    return {
      ok: false as const,
      error_key: 'adult_only_undetectable' as ErrorKey,
      message: '미성년자 구매 Dropdown selected 추출 실패',
    };
  }
  const newAdult = nextAdultOnly(beforeAdult);
  logger.info(`[verify-attr] 미성년자 구매: ${beforeAdult} → ${newAdult}`);

  // trigger click → popup 열림 → "{newAdult}" 옵션 click.
  // windly Dropdown 의 OptionBox 가 `show` prop 으로 토글되며 visibility 보다는 height/opacity
  // transition 이 적용될 수 있어 Playwright click 시 "Element is not visible". 직접 DOM click()
  // 호출 (evaluate) 로 actionability 체크 우회.
  await page.getByText(beforeAdult, { exact: true }).first().click();
  await page.waitForTimeout(500);
  const newOption = page.getByText(newAdult, { exact: true }).last();
  await newOption
    .evaluate((el) => {
      if (el instanceof HTMLElement) {
        el.click();
      } else if (el && (el as Element).parentElement instanceof HTMLElement) {
        ((el as Element).parentElement as HTMLElement).click();
      }
    })
    .catch(() => undefined);
  await page.waitForTimeout(1_000);

  // 변경 검증 — 새 selected 가 보이는지.
  const verified = await getSelectedAdultOnlyLabel(page);
  if (verified !== newAdult) {
    return {
      ok: false as const,
      error_key: 'adult_only_change_not_reflected' as ErrorKey,
      message: `Dropdown 변경 후 selected="${verified}" expected="${newAdult}"`,
    };
  }

  snapshot = {
    manufacturer: newManufacturer,
    brand: newBrand,
    adultOnly: newAdult,
  };
  logger.info(`[verify-attr] snapshot: ${JSON.stringify(snapshot)}`);
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
      logger.info('[verify-attr] bulk-apply success toast 검출');
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
  logger.info(`[verify-attr] entered: ${page.url()}`);
  return { ok: true as const };
};

const openAttributeTabStep: StepHandler = async (page, _inputs) => {
  // sesame ProductDetail tab "상품 속성" (value="attribute").
  const tabCandidates = [
    page.getByRole('tab', { name: '상품 속성' }),
    page.getByRole('button', { name: /^상품 속성$/ }),
    page.getByText(/^상품 속성$/, { exact: true }),
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
      error_key: 'attribute_tab_not_found' as ErrorKey,
      message: '상품 속성 탭 클릭 가능 요소 미발견',
    };
  }

  // 제조사 input 노출 대기.
  try {
    await fieldInputByLabel(page, '제조사').waitFor({ state: 'visible', timeout: 15_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'attribute_tab_not_loaded' as ErrorKey,
      message: '상품 속성 탭 클릭 후 제조사 input 미노출',
    };
  }
  return { ok: true as const };
};

const verifyAttributeOnProductStep: StepHandler = async (page, _inputs) => {
  if (snapshot === null) {
    return {
      ok: false as const,
      error_key: 'snapshot_missing' as ErrorKey,
      message: 'snapshot 없음',
    };
  }

  const mismatches: string[] = [];

  // React Query cache→fetch 갱신 대비 polling.
  const matchAll = async () => {
    const manuRaw = await fieldInputByLabel(page, '제조사').inputValue().catch(() => '');
    const brandRaw = await fieldInputByLabel(page, '브랜드').inputValue().catch(() => '');
    const adult = await getSelectedAdultOnlyLabel(page);
    return { manuRaw, brandRaw, adult };
  };

  let result = await matchAll();
  const start = Date.now();
  while (
    Date.now() - start < 10_000 &&
    (result.manuRaw !== snapshot.manufacturer ||
      result.brandRaw !== snapshot.brand ||
      result.adult !== snapshot.adultOnly)
  ) {
    await page.waitForTimeout(500);
    result = await matchAll();
  }

  if (result.manuRaw !== snapshot.manufacturer) {
    const msg = `제조사 mismatch: expected="${snapshot.manufacturer}", actual="${result.manuRaw}"`;
    logger.error(`[verify-attr] FAIL: ${msg}`);
    mismatches.push(msg);
  } else {
    logger.info(`[verify-attr] OK: 제조사 → "${result.manuRaw}"`);
  }
  if (result.brandRaw !== snapshot.brand) {
    const msg = `브랜드 mismatch: expected="${snapshot.brand}", actual="${result.brandRaw}"`;
    logger.error(`[verify-attr] FAIL: ${msg}`);
    mismatches.push(msg);
  } else {
    logger.info(`[verify-attr] OK: 브랜드 → "${result.brandRaw}"`);
  }
  if (result.adult !== snapshot.adultOnly) {
    const msg = `미성년자 구매 mismatch: expected="${snapshot.adultOnly}", actual="${result.adult}"`;
    logger.error(`[verify-attr] FAIL: ${msg}`);
    mismatches.push(msg);
  } else {
    logger.info(`[verify-attr] OK: 미성년자 구매 → "${result.adult}"`);
  }

  if (mismatches.length > 0) {
    return {
      ok: false as const,
      error_key: 'attribute_product_mismatch' as ErrorKey,
      message: `${mismatches.length}개 상품 속성 불일치: ${mismatches.join(' | ')}`,
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  bump_and_snapshot_attribute:  bumpAndSnapshotAttributeStep,
  open_collected_list:          openCollectedListStep,
  apply_base_setting_to_first:  applyBaseSettingToFirstStep,
  enter_first_product:          enterFirstProductStep,
  open_attribute_tab:           openAttributeTabStep,
  verify_attribute_on_product:  verifyAttributeOnProductStep,
};

test('상품 속성 base setting 변경 후 첫 수집상품 상품 속성 탭 매치 검증', async ({ page }) => {
  test.setTimeout(3 * 60_000);

  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
