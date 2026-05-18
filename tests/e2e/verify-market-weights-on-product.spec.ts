/**
 * 첫 수집상품 판매가 탭의 "마켓별 가중치" 가 글로벌 base setting 과 일치하는지 검증
 * (활성 마켓만 — 비활성은 검증 안 함).
 *
 * 대응 ATC: atcs/e2e/verify-market-weights-on-product.atc.yml
 *
 * 패턴: tests/e2e/verify-base-setting-on-product.spec.ts 와 동일 (snapshot → product → match).
 *
 * Selector 출처:
 *   - windly base setting (windly-frontend-web/src/features/BaseSetting/Common/MarketWeightTab/index.tsx):
 *       6개 TextField — label "스마트스토어" / "쿠팡" / "11번가" /
 *       "ESM 2.0(옥션, 지마켓)" / "롯데온" / "톡스토어".
 *   - 상품 detail (sesame/src/features/ProductDetail/.../MarketSalesPrice.tsx 라인 269~291):
 *       <div>
 *         <Text bold>마켓별 가중치</Text>
 *         {ActiveMarketList.map(...)} ← 활성 마켓만 Text 형제로 렌더
 *       </div>
 *   - sesame label (constants.ts MarketWeightList):
 *       smartstore="스마트스토어", coupang="쿠팡", street="11번가",
 *       esm="ESM 2.0", lotteOn="롯데온", talkstore="톡스토어".
 *
 * 비교 정확도:
 *   formatNumberToPercentType(fraction) 가 정수면 정수, 아니면 toFixed(2).
 *   snapshot 은 input.value (이미 percent 표시값, 예: 5 또는 5.50).
 *   product 표시 텍스트에서 "{label} {pct}%" 패턴 매치 후 parseFloat 으로 수치 비교.
 *   tolerance = 0.01 (unit) / 2 = 0.005 (실수 비교).
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
  'verify-market-weights-on-product.atc.yml',
);

const WEIGHTS_URL =
  'https://app.windly.cc/view3/base-setting?setting=COMMON&category=MARKET_WEIGHT';

// ─────────────────────────────────────────────────────────────────────────────
// 마켓 메타 — windly label (input 읽기) ↔ sesame label (product 매칭)
// ─────────────────────────────────────────────────────────────────────────────

interface MarketMeta {
  key: string;
  windlyLabel: string;
  sesameLabel: string;
}

const MARKETS: MarketMeta[] = [
  { key: 'smartstore', windlyLabel: '스마트스토어',          sesameLabel: '스마트스토어' },
  { key: 'coupang',    windlyLabel: '쿠팡',                  sesameLabel: '쿠팡' },
  { key: 'street',     windlyLabel: '11번가',                sesameLabel: '11번가' },
  { key: 'esm',        windlyLabel: 'ESM 2.0(옥션, 지마켓)', sesameLabel: 'ESM 2.0' },
  { key: 'lotteOn',    windlyLabel: '롯데온',                sesameLabel: '롯데온' },
  { key: 'talkstore',  windlyLabel: '톡스토어',              sesameLabel: '톡스토어' },
];

// 매칭 tolerance — formattingOptions 의 MARKET_WEIGHT_CONFIG.unit = 0.01.
const PCT_TOLERANCE = 0.005;

// ─────────────────────────────────────────────────────────────────────────────
// Snapshot
// ─────────────────────────────────────────────────────────────────────────────

const snapshot: Partial<Record<string, number>> = {};

// ─────────────────────────────────────────────────────────────────────────────
// 헬퍼 (verify-base-setting-on-product 와 동일 패턴 — 짧아서 inline 유지)
// ─────────────────────────────────────────────────────────────────────────────

function parseNumeric(raw: string): number {
  const cleaned = raw.replace(/,/g, '').trim();
  if (cleaned === '') return NaN;
  return parseFloat(cleaned);
}

function fieldInputByLabel(page: Page, label: string): Locator {
  return page
    .getByText(label, { exact: true })
    .locator('xpath=./ancestor::*[descendant::input][1]')
    .locator('input')
    .first();
}

async function readInputNumber(page: Page, label: string): Promise<number> {
  const input = fieldInputByLabel(page, label);
  await input.waitFor({ state: 'visible', timeout: 30_000 });
  const start = Date.now();
  while (Date.now() - start < 30_000) {
    const v = await input.inputValue().catch(() => '');
    if (v.trim() !== '') return parseNumeric(v);
    await page.waitForTimeout(300);
  }
  return NaN;
}

// ─────────────────────────────────────────────────────────────────────────────
// Step handlers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 6개 마켓 모두 현재값 +1% 로 변경 후 변경된 값을 snapshot.
 * MARKET_WEIGHT_CONFIG: min=0, max=100, unit=0.01. max(100) 이면 -1.
 *
 * Selector 주의: 6개 TextField 가 같은 FormField wrapper 안에 형제로 있어
 * label 별 fieldInputByLabel 의 ancestor xpath 가 같은 wrapper 잡고 .first() 로 항상
 * 첫 input(스마트스토어) 만 매치하는 버그가 발생함. → DOM 순서 기반 nth(i) 로 분리.
 *
 * fill → 잠깐 wait → Tab(blur) 패턴 적용 (사용자 요구: 너무 빠르면 적용 안 됨).
 */
const bumpAndSnapshotMarketWeightsStep: StepHandler = async (page, _inputs) => {
  await page.goto(WEIGHTS_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForTimeout(1_500);

  // 6개 TextField 의 input 들을 FormField 단위로 한꺼번에 잡고 nth(i) 로 분리.
  // FormField title "마켓별 판매가 가중치(%)" 의 ancestor 중 input 가지는 가장 가까운 = FormField wrapper.
  const formFieldWrapper = page
    .getByText('마켓별 판매가 가중치(%)', { exact: true })
    .locator('xpath=./ancestor::*[descendant::input][1]');
  const formInputs = formFieldWrapper.locator('input');

  // mount 대기 — 첫 input 의 value 채워질 때까지.
  try {
    await formInputs.first().waitFor({ state: 'visible', timeout: 30_000 });
    const start = Date.now();
    while (Date.now() - start < 30_000) {
      const v = await formInputs.first().inputValue().catch(() => '');
      if (v.trim() !== '') break;
      await page.waitForTimeout(300);
    }
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return {
      ok: false as const,
      error_key: 'market_weight_input_not_found' as ErrorKey,
      message: `MarketWeightTab input 미로드: ${err}`,
    };
  }

  const inputCount = await formInputs.count();
  if (inputCount < MARKETS.length) {
    return {
      ok: false as const,
      error_key: 'market_weight_input_count_short' as ErrorKey,
      message: `예상 ${MARKETS.length}개 input, 실제 ${inputCount}개`,
    };
  }

  for (let i = 0; i < MARKETS.length; i++) {
    const m = MARKETS[i];
    const input = formInputs.nth(i);

    const currentRaw = await input.inputValue().catch(() => '');
    const current = parseNumeric(currentRaw);
    if (!Number.isFinite(current)) {
      return {
        ok: false as const,
        error_key: 'market_weight_input_unreadable' as ErrorKey,
        message: `"${m.windlyLabel}" (idx=${i}) 현재값 파싱 실패: "${currentRaw}"`,
      };
    }

    // +1 (max 면 -1). 정수로 round.
    const newValue = current >= 100 ? current - 1 : current + 1;
    const newClamped = Math.min(100, Math.max(0, Math.round(newValue)));
    if (newClamped === current) {
      logger.info(`[verify-mkw] ${m.windlyLabel}: 변동 없음 (current=${current})`);
      snapshot[m.key] = current;
      continue;
    }

    logger.info(
      `[verify-mkw] ${m.windlyLabel} (idx=${i}): ${current} → ${newClamped}`,
    );
    await input.click();
    await input.fill('');
    await input.fill(String(newClamped));
    // 사용자 요구: 값 넣고 잠깐 기다렸다가 onBlur — React state propagation 시간 확보.
    await page.waitForTimeout(800);
    await input.press('Tab');

    // onBlur API 응답 후 reformat 대기.
    let after = '';
    const start = Date.now();
    while (Date.now() - start < 8_000) {
      await page.waitForTimeout(400);
      after = await input.inputValue().catch(() => '');
      const parsed = parseNumeric(after);
      if (Number.isFinite(parsed) && Math.abs(parsed - newClamped) < 0.5) {
        break;
      }
    }
    const finalParsed = parseNumeric(after);
    if (!Number.isFinite(finalParsed) || Math.abs(finalParsed - newClamped) >= 0.5) {
      return {
        ok: false as const,
        error_key: 'market_weight_save_not_reflected' as ErrorKey,
        message: `"${m.windlyLabel}" 저장 후 input 미반영. expected=${newClamped}, actual="${after}"`,
      };
    }
    snapshot[m.key] = newClamped;
  }

  logger.info(`[verify-mkw] snapshot (after +1): ${JSON.stringify(snapshot)}`);
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

/**
 * 첫 카드 1개 체크 + 기본 설정값 적용 일괄 실행 (bulk-apply-base-setting.spec.ts 패턴 차용).
 * snapshot 의 base setting 값이 첫 상품에 반영되도록 함.
 */
const applyBaseSettingToFirstStep: StepHandler = async (page, _inputs) => {
  const cards = page.locator('a[href*="/view2/interested-product/"]');
  const total = await cards.count();
  if (total < 1) {
    return {
      ok: false as const,
      error_key: 'no_collected_card' as ErrorKey,
      message: '수집상품 카드 0개',
    };
  }

  // 첫 카드의 체크박스 (label 클릭 — 메모리: input 은 styled hidden, label 클릭 필요).
  const firstCard = cards.first();
  const checkbox = firstCard.locator('input[type="checkbox"]').first();
  if (!(await checkbox.isChecked().catch(() => false))) {
    const label = firstCard.locator('label[for^="checkbox_"]').first();
    await label.scrollIntoViewIfNeeded();
    await label.click();
    await page.waitForTimeout(500);
  }

  // 상단 More(...) 버튼 — MoreIcon svg path d 시그니처 'M5 10C3.9 10' 로 정확 매치.
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
        message: 'enabled More(...) 버튼 미발견',
      };
    }
    await moreBtn.click();
    try {
      await targetItem.first().waitFor({ state: 'visible', timeout: 3_000 });
    } catch {
      return {
        ok: false as const,
        error_key: 'bulk_menu_not_openable' as ErrorKey,
        message: 'More 클릭 후 기본 설정값 적용 항목 노출 안 됨',
      };
    }
  }
  await targetItem.first().click();

  // 적용 모달의 "적용" 버튼.
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

  // success toast: "1개 상품이 일괄 업데이트 되었습니다.".
  const successToast = page.getByText(/^1개 상품이 일괄 업데이트 되었습니다\.?$/);
  const partialFailToast = page.getByText(/^일부 상품이 업데이트되지 않았습니다\.?$/);
  const start = Date.now();
  while (Date.now() - start < 60_000) {
    if (await successToast.first().isVisible().catch(() => false)) {
      logger.info('[verify-mkw] bulk-apply success toast 검출');
      // 카드 체크 해제 (다음 step 의 카드 클릭 시 체크박스 영역 영향 줄이기).
      await page.waitForTimeout(800);
      return { ok: true as const };
    }
    if (await partialFailToast.first().isVisible().catch(() => false)) {
      return {
        ok: false as const,
        error_key: 'bulk_apply_partial_fail' as ErrorKey,
        message: '일부 상품이 업데이트되지 않았습니다 toast — 적용 실패',
      };
    }
    await page.waitForTimeout(500);
  }
  return {
    ok: false as const,
    error_key: 'bulk_apply_timeout' as ErrorKey,
    message: '60초 내 success/fail toast 모두 미검출',
  };
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
      message: `첫 카드 (href=${href}) 클릭 후 상세 URL 도달 실패`,
    };
  }
  await page.waitForLoadState('domcontentloaded', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1_500);
  logger.info(`[verify-mkw] entered product detail: ${page.url()}`);
  return { ok: true as const };
};

const openSalesTabStep: StepHandler = async (page, _inputs) => {
  // "판매가" 탭 클릭.
  const tabCandidates = [
    page.getByRole('tab', { name: '판매가' }),
    page.getByRole('button', { name: /^판매가$/ }),
    page.getByText(/^판매가$/, { exact: true }),
  ];
  let tabClicked = false;
  for (const c of tabCandidates) {
    if ((await c.count()) > 0 && (await c.first().isVisible().catch(() => false))) {
      try {
        await c.first().click({ timeout: 5_000 });
        tabClicked = true;
        break;
      } catch { /* 다음 후보 */ }
    }
  }
  if (!tabClicked) {
    return {
      ok: false as const,
      error_key: 'sales_tab_not_found' as ErrorKey,
      message: '"판매가" 탭 클릭 가능 요소 미발견',
    };
  }

  // CardLayout 펼침 — verify-base-setting-on-product 와 동일 패턴.
  const isExpanded = async () =>
    (await page.locator('text="마켓별 가중치"').count()) > 0;

  if (!(await isExpanded())) {
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
    } catch {
      const parent = cardTitleSpan.locator('xpath=..');
      await parent.click({ timeout: 5_000, force: true }).catch(() => undefined);
    }
    for (let waited = 0; waited < 5_000; waited += 400) {
      await page.waitForTimeout(400);
      if (await isExpanded()) break;
    }
  }

  if (!(await isExpanded())) {
    return {
      ok: false as const,
      error_key: 'sales_tab_market_weights_not_loaded' as ErrorKey,
      message: '판매가 탭 + CardLayout 펼치기 시도 후에도 "마켓별 가중치" DOM 미발견',
    };
  }
  return { ok: true as const };
};

/** 정규식 escape. */
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const verifyMarketWeightsOnProductStep: StepHandler = async (page, _inputs) => {
  if (Object.keys(snapshot).length < MARKETS.length) {
    return {
      ok: false as const,
      error_key: 'snapshot_missing' as ErrorKey,
      message: 'snapshot 미완 — snapshot_market_weights step 미실행',
    };
  }

  // "마켓별 가중치" Text 의 부모 div 에 활성 마켓 라벨+% Text 들이 형제로 들어있음.
  const labelNode = page.getByText('마켓별 가중치', { exact: true }).first();
  await labelNode.waitFor({ state: 'attached', timeout: 10_000 });
  const containerText = (await labelNode.locator('xpath=..').textContent()) ?? '';
  // "마켓별 가중치스마트스토어 5%,쿠팡 3%,11번가 0%" 형태. prefix 제거.
  const body = containerText.replace('마켓별 가중치', '').trim();
  logger.info(`[verify-mkw] product 마켓별 가중치 raw: "${body}"`);

  // 활성 마켓 추출 — sesameLabel 매치되는 것.
  // 11번가 가 ESM/스마트스토어 등의 substring 이 아니므로 단순 substring 매치 가능.
  // 단, "스마트스토어" / "ESM 2.0" 등 정확 라벨 + space + 숫자 + "%" 패턴.
  const found: Array<{ key: string; label: string; pct: number }> = [];
  for (const m of MARKETS) {
    const re = new RegExp(`${escapeRe(m.sesameLabel)}\\s+(\\d[\\d.]*)\\s*%`);
    const match = body.match(re);
    if (match) {
      const pct = parseFloat(match[1]);
      if (Number.isFinite(pct)) {
        found.push({ key: m.key, label: m.sesameLabel, pct });
      }
    }
  }

  if (found.length === 0) {
    return {
      ok: false as const,
      error_key: 'no_active_markets_displayed' as ErrorKey,
      message: `활성 마켓 0개 (텍스트="${body}") — 검증 대상 없음`,
    };
  }

  // 사용자 요구: "활성화 되어있는 마켓만 적용될꺼라 변경한 부분이 잘 적용되어 나오는지만 확인".
  // 화면에는 6개 모두 노출되지만 미연결/비활성 마켓은 0% 로 표시됨 (가중치 적용 안 된 상태).
  // → 0% 마켓은 검증 skip, 0이 아닌 (= 실제로 적용된) 마켓만 snapshot 과 비교.
  const applied = found.filter((f) => f.pct > 0);
  const skipped = found.filter((f) => f.pct === 0);

  logger.info(
    `[verify-mkw] 추출 ${found.length}개 중 적용된(>0%) ${applied.length}개: ${applied.map((f) => `${f.label}=${f.pct}%`).join(', ')}`,
  );
  if (skipped.length > 0) {
    logger.info(
      `[verify-mkw] skip (0% = 비활성/미적용) ${skipped.length}개: ${skipped.map((f) => f.label).join(', ')}`,
    );
  }

  if (applied.length === 0) {
    return {
      ok: false as const,
      error_key: 'no_applied_market_weight' as ErrorKey,
      message: `상품에 가중치가 적용된 마켓이 0개 (전부 0%) — 검증 대상 없음. 직전 base setting 또는 bulk-apply 가 정상 동작했는지 확인 필요. raw="${body}"`,
    };
  }

  const mismatches: string[] = [];
  for (const f of applied) {
    const expected = snapshot[f.key];
    if (expected === undefined) {
      mismatches.push(`"${f.label}": snapshot 키 누락 (key=${f.key})`);
      continue;
    }
    if (Math.abs(f.pct - expected) >= PCT_TOLERANCE) {
      const msg = `"${f.label}" mismatch: expected=${expected}%, actual=${f.pct}%`;
      logger.error(`[verify-mkw] FAIL: ${msg}`);
      mismatches.push(msg);
    } else {
      logger.info(`[verify-mkw] OK: ${f.label} → ${f.pct}% (= ${expected}%)`);
    }
  }

  if (mismatches.length > 0) {
    return {
      ok: false as const,
      error_key: 'market_weight_product_mismatch' as ErrorKey,
      message: `${mismatches.length}개 적용 마켓 불일치: ${mismatches.join(' | ')}`,
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  snapshot_market_weights:           bumpAndSnapshotMarketWeightsStep,
  open_collected_list:               openCollectedListStep,
  apply_base_setting_to_first:       applyBaseSettingToFirstStep,
  enter_first_product:               enterFirstProductStep,
  open_sales_tab:                    openSalesTabStep,
  verify_market_weights_on_product:  verifyMarketWeightsOnProductStep,
};

test('첫 수집상품 판매가 탭의 마켓별 가중치 — 활성 마켓이 글로벌 base setting 과 일치', async ({ page }) => {
  test.setTimeout(3 * 60_000);

  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
