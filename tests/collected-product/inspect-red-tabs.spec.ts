/**
 * 임의 수집상품 → 에러체크 → 빨간 탭 진단 — Playwright spec
 *
 * 대응 ATC: atcs/error-check/inspect-red-tabs.atc.yml
 *
 * 진단 전용 (수정 X). 빨간 탭만 순회하며:
 *   - 에러 배너 메시지 (parseTabErrorBanner 결과)
 *   - 빨간 보더 input/textarea 의 bounding box + 라벨
 *   - 자동수정 가능 패턴 매칭 여부 (isAutoFixablePattern)
 * 을 logger 로 출력.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import {
  runATC,
  type StepHandler,
  type StepHandlers,
} from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { goToCollectedProducts } from '../../lib/windly-actions';
import {
  clickErrorCheckButton,
  readTabStatuses,
  readRedFieldLocations,
} from '../../lib/error-check-actions';
import {
  readBannerErrors,
  isAutoFixablePattern,
} from '../../lib/tab-error-fix';
import { logger } from '../../lib/logger';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'collected-product',
  'inspect-red-tabs.atc.yml',
);

// ─────────────────────────────────────────────────────────────────────────────
// Step handlers
// ─────────────────────────────────────────────────────────────────────────────

const openCollectedListStep: StepHandler = async (page, _inputs) => {
  await goToCollectedProducts(page);
  return { ok: true as const };
};

const openFirstProductStep: StepHandler = async (page, _inputs) => {
  const firstCard = page.locator('.product-card').first();
  await firstCard.waitFor({ state: 'visible', timeout: 30_000 }).catch(() => undefined);
  if ((await firstCard.count()) === 0) {
    return {
      ok: false as const,
      error_key: 'no_ready_card' as ErrorKey,
      message: '수집상품 list 에 .product-card 0개',
    };
  }
  const firstLink = firstCard
    .locator('a[href*="/view2/interested-product/"]')
    .first();
  await firstLink.waitFor({ state: 'visible', timeout: 10_000 });
  await firstLink.click();
  try {
    await page.waitForURL(/\/view2\/interested-product\/\d+/, { timeout: 30_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'product_detail_not_reached' as ErrorKey,
      message: `detail URL 도달 실패. 현재=${page.url()}`,
    };
  }
  await page.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => undefined);
  await page.waitForTimeout(2_000);
  return { ok: true as const };
};

const triggerErrorCheckStep: StepHandler = async (page, _inputs) => {
  await page.keyboard.press('Escape').catch(() => undefined);
  await page.waitForTimeout(200);
  const ok = await clickErrorCheckButton(page);
  if (!ok) {
    return {
      ok: false as const,
      error_key: 'error_check_btn_not_found' as ErrorKey,
      message: '체크마크 svg 버튼 미발견',
    };
  }
  return { ok: true as const };
};

const inspectRedTabsStep: StepHandler = async (page, _inputs) => {
  await page.waitForTimeout(1_500);
  const statuses = await readTabStatuses(page);
  const redTabs = statuses.filter((s) => s.status === 'red');

  logger.info(
    `[inspect_red_tabs] 전체 탭 status: ${JSON.stringify(statuses)}`,
  );
  logger.info(`[inspect_red_tabs] 빨간 탭 ${redTabs.length}개: ${redTabs.map((r) => r.name).join(', ') || '(없음)'}`);

  if (redTabs.length === 0) {
    return { ok: true as const };
  }

  const grandSummary: Array<{
    tab: string;
    banners: number;
    auto_fixable_banners: number;
    red_fields: number;
  }> = [];

  for (const redTab of redTabs) {
    logger.info(`[inspect_red_tabs] === 탭 진입: ${redTab.name} ===`);
    const tabBtn = page.getByRole('button', { name: redTab.name }).first();
    await tabBtn.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => undefined);
    await tabBtn.click().catch(() => undefined);
    await page.waitForTimeout(1_500);

    // (a) 배너 에러 + parsing.
    const banners = await readBannerErrors(page);
    logger.info(
      `[inspect_red_tabs] [${redTab.name}] 배너 에러 ${banners.length}건`,
    );
    let autoFixableBanners = 0;
    banners.forEach((err, i) => {
      const fixable = isAutoFixablePattern(err);
      if (fixable) autoFixableBanners += 1;
      logger.info(
        `  [${i + 1}] kind=${err.kind} field='${err.fieldLabel}' market='${err.market}' limit=${err.limit ?? '-'} | 자동수정=${fixable ? '가능' : '불가'} | raw="${err.raw}"`,
      );
    });

    // (b) 빨간 보더 필드 위치.
    const redFields = await readRedFieldLocations(page);
    logger.info(
      `[inspect_red_tabs] [${redTab.name}] 빨간 보더 필드 ${redFields.length}개`,
    );
    redFields.forEach((f, i) => {
      logger.info(
        `  [${i + 1}] ${f.tag} @ (${f.x},${f.y}) ${f.width}x${f.height} | label='${f.label}' | value='${f.value}'`,
      );
    });

    grandSummary.push({
      tab: redTab.name,
      banners: banners.length,
      auto_fixable_banners: autoFixableBanners,
      red_fields: redFields.length,
    });
  }

  logger.info(`[inspect_red_tabs] === 종합 요약 ===`);
  for (const s of grandSummary) {
    logger.info(
      `  ${s.tab}: 배너 ${s.banners}건 (자동수정 ${s.auto_fixable_banners}건), 빨간 필드 ${s.red_fields}개`,
    );
  }
  const totalAutoFixable = grandSummary.reduce(
    (acc, s) => acc + s.auto_fixable_banners,
    0,
  );
  const totalBanners = grandSummary.reduce((acc, s) => acc + s.banners, 0);
  logger.info(
    `[inspect_red_tabs] 총 배너 ${totalBanners}건 중 ${totalAutoFixable}건 자동수정 가능 패턴 매칭`,
  );

  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_collected_list: openCollectedListStep,
  open_first_product: openFirstProductStep,
  trigger_error_check: triggerErrorCheckStep,
  inspect_red_tabs: inspectRedTabsStep,
};

// ─────────────────────────────────────────────────────────────────────────────
// Test
// ─────────────────────────────────────────────────────────────────────────────

test('빨간 탭 위치/수정가능성 진단', async ({ page }) => {
  test.setTimeout(8 * 60_000);

  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
