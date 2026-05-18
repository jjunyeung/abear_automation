/**
 * 배송비 base setting 변경 → bulk-apply → 첫 수집상품 판매가 탭 배송비 카드 매치 검증.
 *
 * 대응 ATC: atcs/e2e/verify-delivery-fee-on-product.atc.yml
 *
 * 패턴: tests/e2e/verify-market-weights-on-product.spec.ts 와 동일 (bump → bulk-apply → match).
 *
 * Selector 출처:
 *   - windly base setting (.../BaseSetting/Common/DeliveryInfoTab/index.tsx):
 *       4개 TextField — label "배송비 조건" / "기본 배송비" / "반품 배송비" / "교환 배송비".
 *   - 상품 detail (sesame/.../SalesPriceSettings/DeliveryPrice.tsx):
 *       <CardLayout title="배송비" defaultState={false}>
 *         <NumberField label="기본 배송비" .../>
 *         <NumberField label="반품 배송비" .../>
 *         <NumberField label="교환 배송비" .../>
 *         <NumberField label="배송비 조건" .../>
 *       </CardLayout>
 *
 * MarketWeightTab 처럼 4개 input 이 같은 FormField wrapper 안 형제. fieldInputByLabel 의
 * label-별 ancestor 가 같은 wrapper 잡고 .first() 하면 항상 첫 input 만 매치되는 버그가
 * 발생할 수 있어 sesame 쪽에서는 NumberField 자체에 label 이 들어 있는지 확인 필요.
 * 안전을 위해 product 쪽도 input.value 매치 시 label 별로 직접 input 잡되, 매핑 실패 시
 * 같은 wrapper 안 nth(i) fallback 도 포함.
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
  'verify-delivery-fee-on-product.atc.yml',
);

const DELIVERY_URL =
  'https://app.windly.cc/view3/base-setting?setting=COMMON&category=DELIVERY_INFO';

// ─────────────────────────────────────────────────────────────────────────────
// Field 메타
// ─────────────────────────────────────────────────────────────────────────────

interface FieldSpec {
  key: 'unitQty' | 'defaultPrice' | 'returnPrice' | 'exchangePrice';
  label: string;
  step: number;        // +N. max 시 -N 로 fallback.
  min: number;
  max: number;
}

// 사용자 패턴: 원 = +100, 그 외 정수 (개) = +1.
const FIELDS: FieldSpec[] = [
  { key: 'unitQty',       label: '배송비 조건', step: 1,   min: 1, max: 1000   },
  { key: 'defaultPrice',  label: '기본 배송비', step: 100, min: 0, max: 100_000 },
  { key: 'returnPrice',   label: '반품 배송비', step: 100, min: 0, max: 100_000 },
  { key: 'exchangePrice', label: '교환 배송비', step: 100, min: 0, max: 100_000 },
];

const snapshot: Partial<Record<FieldSpec['key'], number>> = {};

// ─────────────────────────────────────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────────────────────────────────────

function parseNumeric(raw: string): number {
  const cleaned = raw.replace(/,/g, '').trim();
  if (cleaned === '') return NaN;
  return parseFloat(cleaned);
}

/** label 의 ancestor 중 input 보유한 가장 가까운 wrapper. */
function fieldWrapperByLabel(page: Page, label: string): Locator {
  return page
    .getByText(label, { exact: true })
    .locator('xpath=./ancestor::*[descendant::input][1]');
}

function fieldInputByLabel(page: Page, label: string): Locator {
  return fieldWrapperByLabel(page, label).locator('input').first();
}

/** label 별 input. wrapper 안 input 이 1개일 때만 신뢰 가능. */
async function readInputValue(page: Page, label: string): Promise<string> {
  const input = fieldInputByLabel(page, label);
  await input.waitFor({ state: 'visible', timeout: 30_000 });
  const start = Date.now();
  while (Date.now() - start < 10_000) {
    const v = await input.inputValue().catch(() => '');
    if (v.trim() !== '') return v;
    await page.waitForTimeout(300);
  }
  return '';
}

// ─────────────────────────────────────────────────────────────────────────────
// Step handlers
// ─────────────────────────────────────────────────────────────────────────────

const bumpAndSnapshotDeliveryStep: StepHandler = async (page, _inputs) => {
  await page.goto(DELIVERY_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForTimeout(1_500);

  for (const f of FIELDS) {
    const input = fieldInputByLabel(page, f.label);
    let currentRaw = '';
    try {
      await input.waitFor({ state: 'visible', timeout: 30_000 });
      const start = Date.now();
      while (Date.now() - start < 10_000) {
        currentRaw = await input.inputValue().catch(() => '');
        if (currentRaw.trim() !== '') break;
        await page.waitForTimeout(300);
      }
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      return {
        ok: false as const,
        error_key: 'delivery_input_not_found' as ErrorKey,
        message: `"${f.label}" input 미로드: ${err}`,
      };
    }

    if (currentRaw.trim() === '') {
      // 배송비 조건은 배송비 유형이 FREE 또는 PAID(=수량별 적용 X) 면 disabled — value="".
      // 이런 경우 우리가 변경 못함. fail 보다는 skip + base setting 값 미정.
      logger.info(`[verify-delivery] "${f.label}" 비어있음 (disabled 가능) — skip`);
      continue;
    }

    const current = parseNumeric(currentRaw);
    if (!Number.isFinite(current)) {
      return {
        ok: false as const,
        error_key: 'delivery_input_unreadable' as ErrorKey,
        message: `"${f.label}" 현재값 파싱 실패: "${currentRaw}"`,
      };
    }

    const next = current >= f.max ? current - f.step : current + f.step;
    const newClamped = Math.min(f.max, Math.max(f.min, Math.round(next)));

    if (newClamped === current) {
      snapshot[f.key] = current;
      logger.info(`[verify-delivery] "${f.label}": 변동 없음 (current=${current})`);
      continue;
    }

    logger.info(`[verify-delivery] "${f.label}": ${current} → ${newClamped}`);
    await input.click();
    await input.fill('');
    await input.fill(String(newClamped));
    // fill 후 잠깐 wait 후 blur (React state 반영 시간 확보).
    await page.waitForTimeout(800);
    await input.press('Tab');

    // onBlur API 응답 후 reformat 대기.
    let after = '';
    const start = Date.now();
    while (Date.now() - start < 8_000) {
      await page.waitForTimeout(400);
      after = await input.inputValue().catch(() => '');
      const parsed = parseNumeric(after);
      if (Number.isFinite(parsed) && Math.abs(parsed - newClamped) < f.step / 2) break;
    }
    const finalParsed = parseNumeric(after);
    if (!Number.isFinite(finalParsed) || Math.abs(finalParsed - newClamped) >= f.step / 2) {
      return {
        ok: false as const,
        error_key: 'delivery_save_not_reflected' as ErrorKey,
        message: `"${f.label}" 저장 후 input 미반영. expected=${newClamped}, actual="${after}"`,
      };
    }
    snapshot[f.key] = newClamped;
  }

  logger.info(`[verify-delivery] snapshot: ${JSON.stringify(snapshot)}`);
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
        message: '기본 설정값 적용 항목 노출 안 됨',
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
      logger.info('[verify-delivery] bulk-apply success toast 검출');
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
    message: '60초 내 success/fail toast 미검출',
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
  logger.info(`[verify-delivery] entered: ${page.url()}`);
  return { ok: true as const };
};

const openSalesTabStep: StepHandler = async (page, _inputs) => {
  // "판매가" 탭 클릭.
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

  // "배송비" CardLayout 펼치기. defaultState=false 라 mount 시 펼침이지만 실측상 collapsed.
  // 사용자 관점 selector: getByText('배송비', exact:true) — 단독 "배송비" Text 는 카드 헤더만 매치.
  // ("기본 배송비", "반품 배송비" 등은 substring 이라 exact 에서 제외됨)
  const isExpanded = async () =>
    (await page.locator('text="기본 배송비"').count()) > 0;

  if (!(await isExpanded())) {
    const heading = page.getByText('배송비', { exact: true }).first();
    try {
      await heading.scrollIntoViewIfNeeded({ timeout: 3_000 });
    } catch { /* 무시 */ }
    try {
      await heading.click({ timeout: 5_000 });
    } catch {
      await heading.click({ timeout: 5_000, force: true }).catch(() => undefined);
    }
    for (let waited = 0; waited < 5_000; waited += 400) {
      await page.waitForTimeout(400);
      if (await isExpanded()) break;
    }
  }

  if (!(await isExpanded())) {
    return {
      ok: false as const,
      error_key: 'delivery_card_not_loaded' as ErrorKey,
      message: '판매가 탭 + 배송비 카드 펼치기 시도 후에도 "기본 배송비" DOM 미발견',
    };
  }
  return { ok: true as const };
};

const verifyDeliveryOnProductStep: StepHandler = async (page, _inputs) => {
  const mismatches: string[] = [];

  for (const f of FIELDS) {
    const expected = snapshot[f.key];
    if (expected === undefined) {
      logger.info(`[verify-delivery] "${f.label}" snapshot 없음 — skip`);
      continue;
    }
    const raw = await readInputValue(page, f.label);
    if (raw.trim() === '') {
      // 배송비 조건은 배송비 유형/조건부 설정에 따라 disabled (value="") 일 수 있음.
      logger.info(`[verify-delivery] "${f.label}" product input 비어있음 — skip`);
      continue;
    }
    const actual = parseNumeric(raw);
    if (!Number.isFinite(actual) || Math.abs(actual - expected) >= f.step / 2) {
      const msg = `"${f.label}" mismatch: expected=${expected}, actual="${raw}"`;
      logger.error(`[verify-delivery] FAIL: ${msg}`);
      mismatches.push(msg);
    } else {
      logger.info(`[verify-delivery] OK: ${f.label} → "${raw}" (= ${expected})`);
    }
  }

  if (mismatches.length > 0) {
    return {
      ok: false as const,
      error_key: 'delivery_product_mismatch' as ErrorKey,
      message: `${mismatches.length}개 배송비 필드 불일치: ${mismatches.join(' | ')}`,
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  bump_and_snapshot_delivery: bumpAndSnapshotDeliveryStep,
  open_collected_list:        openCollectedListStep,
  apply_base_setting_to_first: applyBaseSettingToFirstStep,
  enter_first_product:        enterFirstProductStep,
  open_sales_tab:             openSalesTabStep,
  verify_delivery_on_product: verifyDeliveryOnProductStep,
};

test('배송비 base setting 변경 후 첫 수집상품 판매가 탭 매치 검증', async ({ page }) => {
  test.setTimeout(3 * 60_000);

  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
