/**
 * 에러체크 통합 파이프라인 — Playwright spec
 *
 * 대응 ATC: atcs/error-check/check-and-fix.atc.yml
 *
 * 진단 → (조건부) 수정 → verify clean 의 통합 흐름.
 * 빨간 탭만 walk → 효율적. multi-pass 로 cascade 흡수.
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
  summarizeTabStatuses,
} from '../../lib/error-check-actions';
import {
  readBannerErrors,
  isAutoFixablePattern,
  walkAndFixTab,
} from '../../lib/tab-error-fix';
import { logger } from '../../lib/logger';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'collected-product',
  'check-and-fix.atc.yml',
);

const MAX_FIX_PASSES = 3;

const TAB_TO_KEY: Record<string, string> = {
  '기본 정보': 'tab_basic_error',
  이미지: 'tab_image_error',
  옵션: 'tab_option_error',
  판매가: 'tab_price_error',
  '상품 속성': 'tab_attribute_error',
  상세페이지: 'tab_detail_error',
  '업로드 설정': 'tab_upload_settings_error',
};

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
  const summary = summarizeTabStatuses(statuses);
  const reds = statuses.filter((s) => s.status === 'red');
  logger.info(
    `[inspect_red_tabs] 전체 status=${JSON.stringify(statuses)} | summary=${JSON.stringify(summary)}`,
  );
  logger.info(
    `[inspect_red_tabs] 빨간 탭 ${reds.length}개: ${reds.map((r) => r.name).join(', ') || '(없음)'}`,
  );

  // 각 빨간 탭의 배너 미리보기 (진단 — 수정 X).
  for (const redTab of reds) {
    const tabBtn = page.getByRole('button', { name: redTab.name }).first();
    await tabBtn.click().catch(() => undefined);
    await page.waitForTimeout(1_000);
    const banners = await readBannerErrors(page);
    const fixable = banners.filter(isAutoFixablePattern).length;
    logger.info(
      `[inspect_red_tabs] [${redTab.name}] 배너 ${banners.length}건 (자동수정 가능 ${fixable}건)`,
    );
    banners.forEach((err, i) => {
      logger.info(
        `  [${i + 1}] kind=${err.kind} field='${err.fieldLabel}' market='${err.market}' | "${err.raw}"`,
      );
    });
  }

  return { ok: true as const };
};

const fixRedTabsStep: StepHandler = async (page, _inputs) => {
  let prevReds = -1;

  for (let pass = 1; pass <= MAX_FIX_PASSES; pass++) {
    const statuses = await readTabStatuses(page);
    const reds = statuses.filter((s) => s.status === 'red');

    if (reds.length === 0) {
      logger.info(`[fix_red_tabs] pass ${pass}: 빨간 탭 0개 — fix 종료`);
      return { ok: true as const };
    }
    logger.info(
      `[fix_red_tabs] pass ${pass}/${MAX_FIX_PASSES}: 빨간 탭 ${reds.length}개 (${reds.map((r) => r.name).join(', ')}) — fix 시도`,
    );

    let fixedThisPass = 0;
    for (const redTab of reds) {
      const r = await walkAndFixTab(page, redTab.name);
      if (r.fixed > 0) {
        logger.info(`  [${redTab.name}] ${r.fixed}건 수정`);
        fixedThisPass += r.fixed;
      } else if (r.reason !== undefined && r.reason !== 'no errors') {
        logger.warn(`  [${redTab.name}] skip: ${r.reason}`);
      } else {
        logger.info(`  [${redTab.name}] 수정 대상 없음`);
      }
      await page.waitForTimeout(300);
    }

    logger.info(`[fix_red_tabs] pass ${pass} 결과: 총 ${fixedThisPass}건 수정`);

    // 에러체크 재트리거하여 dot 상태 갱신.
    await page.keyboard.press('Escape').catch(() => undefined);
    await page.waitForTimeout(300);
    await clickErrorCheckButton(page);
    await page.waitForTimeout(1_500);

    // 진척 없으면 (이번 pass 에서 0 건 fix) 조기 종료.
    if (fixedThisPass === 0) {
      logger.warn(
        `[fix_red_tabs] pass ${pass} 에서 fix 0건 — 자동수정 한계 도달, 조기 종료`,
      );
      break;
    }
    if (prevReds === reds.length) {
      logger.warn(
        `[fix_red_tabs] 빨간 탭 수가 변화 없음 (${reds.length}) — 조기 종료`,
      );
      break;
    }
    prevReds = reds.length;
  }
  return { ok: true as const };
};

const verifyAllCleanStep: StepHandler = async (page, _inputs) => {
  const statuses = await readTabStatuses(page);
  const summary = summarizeTabStatuses(statuses);
  logger.info(
    `[verify_all_clean] 최종 status=${JSON.stringify(statuses)} | summary=${JSON.stringify(summary)}`,
  );
  const reds = statuses.filter((s) => s.status === 'red');
  if (reds.length === 0) {
    return { ok: true as const };
  }
  // 빨간 탭이 남아있으면 — 첫 빨간 탭의 배너로 메시지 작성.
  const firstRed = reds[0];
  const tabBtn = page.getByRole('button', { name: firstRed.name }).first();
  await tabBtn.click().catch(() => undefined);
  await page.waitForTimeout(800);
  const banners = await readBannerErrors(page);
  const firstBanner = banners[0]?.raw ?? '(배너 없음)';
  const key = (TAB_TO_KEY[firstRed.name] ?? 'tab_unknown_error') as ErrorKey;
  return {
    ok: false as const,
    error_key: key,
    message:
      `자동수정 후에도 빨간 탭 ${reds.length}개: ${reds.map((r) => r.name).join(', ')}. ` +
      `첫 탭 [${firstRed.name}] 배너: ${firstBanner}`,
  };
};

const handlers: StepHandlers = {
  open_collected_list: openCollectedListStep,
  open_first_product: openFirstProductStep,
  trigger_error_check: triggerErrorCheckStep,
  inspect_red_tabs: inspectRedTabsStep,
  fix_red_tabs: fixRedTabsStep,
  verify_all_clean: verifyAllCleanStep,
};

// ─────────────────────────────────────────────────────────────────────────────
// Test
// ─────────────────────────────────────────────────────────────────────────────

test('에러체크 → 진단 → (조건부) 자동 수정 → verify clean', async ({ page }) => {
  test.setTimeout(15 * 60_000);

  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
