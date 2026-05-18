/**
 * 임의 수집상품 진입 → 에러체크 트리거 동작 확인 — Playwright spec
 *
 * 대응 ATC: atcs/error-check/trigger-error-check.atc.yml
 *
 * 검증 시그널: 에러체크 클릭 후 readTabStatuses 결과에서 red/yellow/green
 * 으로 분류된 탭 수 ≥1. = 에러체크가 실제로 실행되어 dot 색상이 update 됐다는 증거.
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
import { logger } from '../../lib/logger';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'error-check',
  'trigger-error-check.atc.yml',
);

// ─────────────────────────────────────────────────────────────────────────────
// Step handlers
// ─────────────────────────────────────────────────────────────────────────────

const openCollectedListStep: StepHandler = async (page, _inputs) => {
  await goToCollectedProducts(page);
  return { ok: true as const };
};

const openFirstProductStep: StepHandler = async (page, _inputs) => {
  // 첫 .product-card (수집중 카드 제외 — ProductImportingCard 는 .product-card 클래스 없음).
  const firstCard = page.locator('.product-card').first();
  await firstCard.waitFor({ state: 'visible', timeout: 30_000 }).catch(() => undefined);
  if ((await firstCard.count()) === 0) {
    return {
      ok: false as const,
      error_key: 'no_ready_card' as ErrorKey,
      message: '수집상품 list 에 .product-card 0개 — 수집된 상품 없음',
    };
  }
  const firstLink = firstCard
    .locator('a[href*="/view2/interested-product/"]')
    .first();
  await firstLink.waitFor({ state: 'visible', timeout: 10_000 });
  const href = (await firstLink.getAttribute('href')) ?? '';
  await firstLink.click();
  try {
    await page.waitForURL(/\/view2\/interested-product\/\d+/, { timeout: 30_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'product_detail_not_reached' as ErrorKey,
      message: `첫 카드 클릭 후 detail URL 도달 실패. href=${href}, 현재=${page.url()}`,
    };
  }
  await page.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => undefined);
  // detail mount 안정화 — 탭 영역이 렌더되어 에러체크 버튼이 잡히도록.
  await page.waitForTimeout(2_000);
  return { ok: true as const };
};

const triggerErrorCheckStep: StepHandler = async (page, _inputs) => {
  // 잔여 모달/툴팁 정리.
  await page.keyboard.press('Escape').catch(() => undefined);
  await page.waitForTimeout(200);
  await page.keyboard.press('Escape').catch(() => undefined);
  await page.waitForTimeout(200);

  const ok = await clickErrorCheckButton(page);
  if (!ok) {
    return {
      ok: false as const,
      error_key: 'error_check_btn_not_found' as ErrorKey,
      message: '체크마크 svg 시그니처를 가진 에러체크 버튼 미발견 (페이지 상단 80px 영역)',
    };
  }
  return { ok: true as const };
};

const verifyErrorCheckRanStep: StepHandler = async (page, _inputs) => {
  // 에러체크 후 dot 색상 update 시간 — clickErrorCheckButton 안에서 2.5s 대기.
  // 추가 안정화 + 재read 시 일관성 확보용.
  await page.waitForTimeout(1_500);

  const statuses = await readTabStatuses(page);
  const summary = summarizeTabStatuses(statuses);
  logger.info(
    `[verify_error_check_ran] tab statuses=${JSON.stringify(statuses)}, summary=${JSON.stringify(summary)}`,
  );

  if (summary.total_classified === 0) {
    return {
      ok: false as const,
      error_key: 'error_check_did_not_run' as ErrorKey,
      message: `7개 탭 모두 status=none — 에러체크가 실행 안 됐거나 dot DOM 위치 변경 가능. statuses=${JSON.stringify(statuses)}`,
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_collected_list: openCollectedListStep,
  open_first_product: openFirstProductStep,
  trigger_error_check: triggerErrorCheckStep,
  verify_error_check_ran: verifyErrorCheckRanStep,
};

// ─────────────────────────────────────────────────────────────────────────────
// Test
// ─────────────────────────────────────────────────────────────────────────────

test('임의 수집상품 진입 → 에러체크 트리거 동작 확인', async ({ page }) => {
  test.setTimeout(5 * 60_000);

  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
