/**
 * 에러체크 통합 파이프라인 handler 모듈 — test() 호출 없음 (e2e import 안전).
 *
 * 진단 → (조건부) 수정 → verify clean 의 통합 흐름.
 * 빨간 탭만 walk → 효율적. multi-pass 로 cascade 흡수.
 */

import type {
  StepHandler,
  StepHandlers,
} from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import {
  goToCollectedProducts,
  searchByProductCode,
  openFirstSearchResult,
} from '../../lib/windly-actions';
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
import {
  goToUploadSettingsTab,
  isEsmRecommendOptionError,
} from '../../lib/esm-option-actions';
import { logger } from '../../lib/logger';

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

const openCollectedListStep: StepHandler = async (page, _inputs) => {
  await goToCollectedProducts(page);
  return { ok: true as const };
};

const openFirstProductStep: StepHandler = async (page, inputs) => {
  // source_product_id 가 주어지면 (직접 입력 또는 from: previous) 그 상품을 검색해 진입.
  // 비어 있으면 기존 동작대로 목록 첫 카드 사용.
  const id =
    typeof inputs['source_product_id'] === 'string'
      ? (inputs['source_product_id'] as string).trim()
      : '';
  if (id.length > 0) {
    const count = await searchByProductCode(page, id);
    if (count === 0) {
      return {
        ok: false as const,
        error_key: 'product_not_found' as ErrorKey,
        message: `상품 코드 ${id} 검색 결과 0개`,
      };
    }
    try {
      await openFirstSearchResult(page);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        ok: false as const,
        error_key: 'detail_open_failed' as ErrorKey,
        message: `상세 진입 실패: ${msg}`,
      };
    }
    await page
      .waitForURL(/\/view2\/interested-product\/\d+/, { timeout: 30_000 })
      .catch(() => undefined);
    await page.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => undefined);
    await page.waitForTimeout(2_000);
    return { ok: true as const };
  }

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
  for (const redTab of reds) {
    const tabBtn = page.getByRole('button', { name: redTab.name }).first();
    await tabBtn.click().catch(() => undefined);
    await page.waitForTimeout(1_000);
    const banners = await readBannerErrors(page);
    const fixable = banners.filter(isAutoFixablePattern).length;
    logger.info(
      `[inspect_red_tabs] [${redTab.name}] 배너 ${banners.length}건 (자동수정 가능 ${fixable}건)`,
    );
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
      `[fix_red_tabs] pass ${pass}/${MAX_FIX_PASSES}: 빨간 탭 ${reds.length}개 — fix 시도`,
    );
    let fixedThisPass = 0;
    for (const redTab of reds) {
      const r = await walkAndFixTab(page, redTab.name);
      if (r.fixed > 0) {
        logger.info(`  [${redTab.name}] ${r.fixed}건 수정`);
        fixedThisPass += r.fixed;
      } else if (r.reason !== undefined && r.reason !== 'no errors') {
        logger.warn(`  [${redTab.name}] skip: ${r.reason}`);
      }
      await page.waitForTimeout(300);
    }
    logger.info(`[fix_red_tabs] pass ${pass} 결과: 총 ${fixedThisPass}건 수정`);
    await page.keyboard.press('Escape').catch(() => undefined);
    await page.waitForTimeout(300);
    await clickErrorCheckButton(page);
    await page.waitForTimeout(1_500);
    if (fixedThisPass === 0) break;
    if (prevReds === reds.length) break;
    prevReds = reds.length;
  }
  return { ok: true as const };
};

const verifyAllCleanStep: StepHandler = async (page, _inputs) => {
  const statuses = await readTabStatuses(page);
  const reds = statuses.filter((s) => s.status === 'red');
  if (reds.length === 0) return { ok: true as const };

  // 업로드 설정 탭이 빨강이고 그게 ESM 추천옵션 미설정 때문이면 ESM 복구로 분기.
  // (일반 walkAndFixTab 으로는 못 고치는 케이스 — recoveries/esm_recommend_option_unmatched.ts 가 처리.)
  const uploadRed = reds.find((r) => r.name === '업로드 설정');
  if (uploadRed !== undefined) {
    await goToUploadSettingsTab(page);
    if (await isEsmRecommendOptionError(page)) {
      return {
        ok: false as const,
        error_key: 'esm_recommend_option_unmatched' as ErrorKey,
        message:
          `자동수정 후에도 빨간 탭 ${reds.length}개: ${reds.map((r) => r.name).join(', ')}. ` +
          `업로드 설정 탭 빨강 = ESM 추천옵션 미설정 (복구 대상).`,
      };
    }
  }

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

export const checkAndFixHandlers: StepHandlers = {
  open_collected_list: openCollectedListStep,
  open_first_product: openFirstProductStep,
  trigger_error_check: triggerErrorCheckStep,
  inspect_red_tabs: inspectRedTabsStep,
  fix_red_tabs: fixRedTabsStep,
  verify_all_clean: verifyAllCleanStep,
};
