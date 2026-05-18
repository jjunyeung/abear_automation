/**
 * 첫 수집상품 판매가 탭의 BaseSettingItem 들이 글로벌 base setting 과 일치하는지 검증.
 *
 * 대응 ATC: atcs/e2e/verify-base-setting-on-product.atc.yml
 *
 * Selector 출처 (sesame):
 *   - features/ProductDetail/ProductDetailTabs/SalesTab/SalesPriceSettings/MarketSalesPrice.tsx
 *       BaseSettingBox 안 BaseSettingItem 6개:
 *         "구매처수수료" / "판매처수수료" / "판매가 단위(올림)" /
 *         "판매가 할인율" / "마진" / "관세 기준"
 *   - components/.../BaseSettingItem.tsx
 *       <Tooltip><div><Text>{title}</Text><Text>{content}</Text></div></Tooltip>
 *       → title text node 의 부모 div 의 textContent = title + content (concat).
 *
 * 검증 대상:
 *   - alipay_fee_pct      = 구매처수수료 (% 정수)
 *   - market_fee_pct      = 판매처수수료 (% 정수)
 *   - rounding_won        = 판매가 단위(올림) (원, 정수)
 *   - discount_rate_pct   = 판매가 할인율 (% 정수)
 *   - margin (auto: % or 원)
 *   - tariff (관세 적용 기준가 + 관세 rate)
 *
 * 검증 제외:
 *   - 해외배송비(배대지) — BaseSettingBox 에 없음 (별도 위치)
 *   - 환율 — 통화 KRW 면 미노출
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
  'verify-base-setting-on-product.atc.yml',
);

const PRICE_URL =
  'https://app.windly.cc/view3/base-setting?setting=COMMON&category=PRICE_SETTING';

// ─────────────────────────────────────────────────────────────────────────────
// Snapshot (module-level — step 들 사이로 공유)
// ─────────────────────────────────────────────────────────────────────────────

interface BaseSettingSnapshot {
  alipay_fee_pct: number;
  market_fee_pct: number;
  rounding_won: number;
  discount_rate_pct: number;
  margin: { kind: 'percent' | 'krw'; value: number };
  tariff: { rate_pct: number; base_won: number };
}

const snapshot: Partial<BaseSettingSnapshot> = {};

// ─────────────────────────────────────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────────────────────────────────────

function parseNumeric(raw: string): number {
  const cleaned = raw.replace(/,/g, '').trim();
  if (cleaned === '') return NaN;
  return parseFloat(cleaned);
}

/** windly-frontend-web Field/index.tsx 구조 — label 의 ancestor 중 input 보유한 것. */
function fieldInputByLabel(page: Page, label: string): Locator {
  return page
    .getByText(label, { exact: true })
    .locator('xpath=./ancestor::*[descendant::input][1]')
    .locator('input')
    .first();
}

function fieldWrapperByLabel(page: Page, label: string): Locator {
  return page
    .getByText(label, { exact: true })
    .locator('xpath=./ancestor::*[descendant::input][1]');
}

async function readInputNumber(page: Page, label: string): Promise<number> {
  const input = fieldInputByLabel(page, label);
  await input.waitFor({ state: 'visible', timeout: 30_000 });
  // value 채워질 때까지 polling.
  const start = Date.now();
  while (Date.now() - start < 30_000) {
    const v = await input.inputValue().catch(() => '');
    if (v.trim() !== '') return parseNumeric(v);
    await page.waitForTimeout(300);
  }
  return NaN;
}

async function detectMarginUnit(page: Page): Promise<'percent' | 'krw' | 'unknown'> {
  const wrapper = fieldWrapperByLabel(page, '마진');
  const won = wrapper.getByText('원', { exact: true });
  const pct = wrapper.getByText('%', { exact: true });
  if ((await won.count()) > 0 && (await won.first().isVisible().catch(() => false))) return 'krw';
  if ((await pct.count()) > 0 && (await pct.first().isVisible().catch(() => false))) return 'percent';
  return 'unknown';
}

/**
 * BaseSettingItem 의 content 추출. title text 의 부모 div 의 textContent 에서
 * title 부분 trim 한 결과.
 */
async function readBaseSettingItem(page: Page, title: string): Promise<string> {
  const titleNode = page.getByText(title, { exact: true }).first();
  await titleNode.waitFor({ state: 'visible', timeout: 15_000 });
  // 부모 div = BaseSettingItem 의 wrapper.
  const parent = titleNode.locator('xpath=..');
  const fullText = (await parent.textContent()) ?? '';
  // text 가 "{title}{content}" 형식이라 title 제거 후 trim.
  const idx = fullText.indexOf(title);
  if (idx < 0) return fullText.trim();
  return fullText.slice(idx + title.length).trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Step handlers
// ─────────────────────────────────────────────────────────────────────────────

const snapshotBaseSettingStep: StepHandler = async (page, _inputs) => {
  await page.goto(PRICE_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForTimeout(1_500);

  try {
    snapshot.alipay_fee_pct    = await readInputNumber(page, '구매처 수수료');
    snapshot.market_fee_pct    = await readInputNumber(page, '판매처 수수료');
    snapshot.rounding_won      = await readInputNumber(page, '판매가 단위(올림)');
    snapshot.discount_rate_pct = await readInputNumber(page, '판매가 할인율');

    const marginUnit = await detectMarginUnit(page);
    if (marginUnit === 'unknown') {
      return {
        ok: false as const,
        error_key: 'margin_unit_undetectable' as ErrorKey,
        message: '마진 input 의 unit (% 또는 원) 감지 실패',
      };
    }
    const marginValue = await readInputNumber(page, '마진');
    snapshot.margin = { kind: marginUnit, value: marginValue };

    const tariffRatePct  = await readInputNumber(page, '관세(%)');
    const tariffBaseWon  = await readInputNumber(page, '관세 적용 기준가');
    snapshot.tariff = { rate_pct: tariffRatePct, base_won: tariffBaseWon };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return {
      ok: false as const,
      error_key: 'base_setting_snapshot_failed' as ErrorKey,
      message: `base setting 값 읽기 실패: ${err}`,
    };
  }

  for (const [k, v] of Object.entries(snapshot)) {
    if (typeof v === 'number' && !Number.isFinite(v)) {
      return {
        ok: false as const,
        error_key: 'base_setting_snapshot_nan' as ErrorKey,
        message: `snapshot.${k} 가 NaN`,
      };
    }
  }

  logger.info(
    `[verify-base] snapshot: ${JSON.stringify(snapshot)}`,
  );
  return { ok: true as const };
};

const openCollectedListStep: StepHandler = async (page, _inputs) => {
  // bulk-apply-base-setting 와 동일한 방식 — 사이드바 링크 클릭.
  // global.windly.cc 일 수도 있으므로 직접 goto fallback.
  await page
    .goto('https://global.windly.cc/view2/interested-product', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    })
    .catch(async () => {
      // app.windly.cc 로 폴백.
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
      message: '수집상품 목록에 카드 0개 — 검증 대상 없음',
    };
  }
  return { ok: true as const };
};

const enterFirstProductStep: StepHandler = async (page, _inputs) => {
  const firstCard = page.locator('a[href*="/view2/interested-product/"]').first();
  const href = (await firstCard.getAttribute('href').catch(() => null)) ?? '';
  await firstCard.click();
  try {
    await page.waitForURL(/\/view2\/interested-product\/\d+/, { timeout: 30_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'product_detail_navigation_failed' as ErrorKey,
      message: `첫 카드 (href=${href}) 클릭 후 상세 URL 도달 실패. 현재 url: ${page.url()}`,
    };
  }
  await page.waitForLoadState('domcontentloaded', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1_500);
  logger.info(`[verify-base] entered product detail: ${page.url()}`);
  return { ok: true as const };
};

const openSalesTabStep: StepHandler = async (page, _inputs) => {
  // sesame TabGroup — "판매가" 라벨. role 매칭 우선, 실패 시 텍스트.
  const candidates = [
    page.getByRole('tab', { name: '판매가' }),
    page.getByRole('button', { name: /^판매가$/ }),
    page.getByText(/^판매가$/, { exact: true }),
  ];

  let clicked = false;
  for (const c of candidates) {
    if ((await c.count()) > 0 && (await c.first().isVisible().catch(() => false))) {
      try {
        await c.first().click({ timeout: 5_000 });
        clicked = true;
        break;
      } catch {
        /* 다음 후보 */
      }
    }
  }
  if (!clicked) {
    return {
      ok: false as const,
      error_key: 'sales_tab_not_found' as ErrorKey,
      message: '"판매가" 탭 클릭 가능 요소 미발견',
    };
  }

  // BaseSettingBox 의 "판매가 단위(올림)" title 노출로 마운트 검증.
  // CardLayout (defaultState=true → 기본 collapsed). collapsed 시 children 미렌더 → DOM 에 없음.
  const isExpanded = async () =>
    (await page.locator('text="판매가 단위(올림)"').count()) > 0;

  if (!(await isExpanded())) {
    // CardLayout TitleBox: <svg/><Text>판매가</Text> — svg 의 다음 형제 + 텍스트 "판매가".
    // 다른 화면 요소 (탭, drawer 등) 와 충돌 안 하는 시그니처. 클릭 시 부모 (HeaderBox) onClick 으로 propagate → toggle.
    const cardTitleSpan = page
      .locator('svg + *', { hasText: '판매가' })
      .filter({ hasNotText: '단위' })
      .filter({ hasNotText: '할인율' })
      .filter({ hasNotText: '변경' })
      .first();

    try {
      await cardTitleSpan.scrollIntoViewIfNeeded({ timeout: 3_000 });
    } catch { /* 무시 */ }

    try {
      await cardTitleSpan.click({ timeout: 5_000 });
    } catch (e) {
      // fallback: parent (TitleBox or HeaderBox) 클릭.
      const parent = cardTitleSpan.locator('xpath=..');
      await parent.click({ timeout: 5_000, force: true }).catch(() => undefined);
    }

    // React render + state propagation 기다림.
    for (let waited = 0; waited < 5_000; waited += 400) {
      await page.waitForTimeout(400);
      if (await isExpanded()) break;
    }
  }

  if (!(await isExpanded())) {
    return {
      ok: false as const,
      error_key: 'sales_tab_basesetting_not_loaded' as ErrorKey,
      message: '판매가 탭 + CardLayout 펼치기 시도 후에도 "판매가 단위(올림)" DOM 미발견',
    };
  }
  return { ok: true as const };
};

/** percent display 비교 — formatNumberToPercentType 가 toFixed(2) 또는 정수 → expected 도 동일 처리. */
function expectedPercentText(pct: number): string {
  // 0.06 (fraction) 가 들어오는 게 아니라 우리가 가진 건 already percent 정수 (e.g., 6).
  // formatNumberToPercentType(0.06) = "6". formatNumberToPercentType(0.065) = "6.5".
  // snapshot 은 input.value 그대로 (이미 percent 표시값) 이라 그냥 number → string.
  if (Number.isInteger(pct)) return String(pct);
  return parseFloat(pct.toFixed(2)).toString();
}

/** 콤마 추가된 KRW 표시. */
function expectedKrwText(won: number): string {
  return Math.round(won).toLocaleString('en-US');
}

const verifyBaseSettingsOnProductStep: StepHandler = async (page, _inputs) => {
  if (
    snapshot.alipay_fee_pct === undefined ||
    snapshot.market_fee_pct === undefined ||
    snapshot.rounding_won === undefined ||
    snapshot.discount_rate_pct === undefined ||
    snapshot.margin === undefined ||
    snapshot.tariff === undefined
  ) {
    return {
      ok: false as const,
      error_key: 'snapshot_missing' as ErrorKey,
      message: 'snapshot 미완 — snapshot_base_setting step 실행 안 됨',
    };
  }

  const checks: Array<{
    title: string;
    expected: string;
    expectedAlt?: string;
  }> = [
    { title: '구매처수수료',     expected: `${expectedPercentText(snapshot.alipay_fee_pct)}%` },
    { title: '판매처수수료',     expected: `${expectedPercentText(snapshot.market_fee_pct)}%` },
    { title: '판매가 단위(올림)', expected: `${expectedKrwText(snapshot.rounding_won)}원` },
    { title: '판매가 할인율',    expected: `${expectedPercentText(snapshot.discount_rate_pct)}%` },
    {
      title: '마진',
      expected:
        snapshot.margin.kind === 'percent'
          ? `${expectedPercentText(snapshot.margin.value)}%`
          : `${expectedKrwText(snapshot.margin.value)}원`,
    },
    {
      title: '관세 기준',
      expected:
        snapshot.tariff.rate_pct === 0 && snapshot.tariff.base_won === 0
          ? '없음'
          : `${expectedKrwText(snapshot.tariff.base_won)}원 이상, ${expectedPercentText(snapshot.tariff.rate_pct)}%`,
    },
  ];

  const mismatches: string[] = [];
  for (const check of checks) {
    const actual = await readBaseSettingItem(page, check.title).catch((e: unknown) => {
      const err = e instanceof Error ? e.message : String(e);
      return `__READ_FAIL__:${err}`;
    });
    if (actual.startsWith('__READ_FAIL__')) {
      const msg = `"${check.title}" content 읽기 실패: ${actual}`;
      logger.error(`[verify-base] ${msg}`);
      mismatches.push(msg);
      continue;
    }
    if (actual === check.expected) {
      logger.info(`[verify-base] OK: ${check.title} → "${actual}"`);
    } else {
      const msg = `"${check.title}" mismatch: expected="${check.expected}", actual="${actual}"`;
      logger.error(`[verify-base] FAIL: ${msg}`);
      mismatches.push(msg);
    }
  }

  if (mismatches.length > 0) {
    return {
      ok: false as const,
      error_key: 'base_setting_product_mismatch' as ErrorKey,
      message: `${mismatches.length}개 항목 불일치: ${mismatches.join(' | ')}`,
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  snapshot_base_setting:           snapshotBaseSettingStep,
  open_collected_list:             openCollectedListStep,
  enter_first_product:             enterFirstProductStep,
  open_sales_tab:                  openSalesTabStep,
  verify_base_settings_on_product: verifyBaseSettingsOnProductStep,
};

test('첫 수집상품 판매가 탭의 base setting 항목들이 글로벌 base setting 과 일치', async ({ page }) => {
  test.setTimeout(3 * 60_000);

  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
