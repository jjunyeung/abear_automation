/**
 * D2. 등록상품 삭제 cascade (e2e) — Playwright spec
 *
 * 대응 ATC: atcs/e2e/registered-delete-cascade.atc.yml
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
import { goToRegisteredProducts } from '../../lib/windly-actions';
import {
  selectOnlyFirstCardStep,
  checkAllMarketsStep,
  clickDeleteConfirmStep,
  clickDeleteToolbarStep,
} from '../registered-product/_delete-modal-handlers';
import { logger } from '../../lib/logger';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'e2e',
  'registered-delete-cascade.atc.yml',
);

let snapshotProductId = '';

const openRegisteredListStep: StepHandler = async (page) => {
  await goToRegisteredProducts(page);
  return { ok: true as const };
};

const snapshotFirstCardIdStep: StepHandler = async (page) => {
  const firstCard = page.locator('a[href*="/view2/registered-product/"]').first();
  try {
    await firstCard.waitFor({ state: 'visible', timeout: 15_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'no_registered_card' as ErrorKey,
      message: '등록상품 목록에 카드 0개 — 삭제 대상 없음',
    };
  }
  const href = (await firstCard.getAttribute('href')) ?? '';
  const match = href.match(/\/view2\/registered-product\/([0-9a-zA-Z\-_]+)/);
  if (match === null) {
    return {
      ok: false as const,
      error_key: 'product_id_extraction_failed' as ErrorKey,
      message: `첫 카드 href 에서 productId 추출 실패: ${href}`,
    };
  }
  snapshotProductId = match[1];
  logger.info(`[snapshot_first_card_id] productId=${snapshotProductId}`);
  return { ok: true as const };
};

const verifyModalVisibleStep: StepHandler = async (page) => {
  // 실제 모달 (sesame) — title="등록상품 삭제", subtitle="선택한 상품을 어디에서 삭제할까요?".
  const title = page.getByText(/^등록상품\s*삭제$/).first();
  try {
    await title.waitFor({ state: 'visible', timeout: 10_000 });
    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error_key: 'delete_modal_not_visible' as ErrorKey,
      message: '삭제 모달 노출 실패 — title "등록상품 삭제" 미발견',
    };
  }
};

const verifyModalClosedStep: StepHandler = async (page) => {
  await page.waitForTimeout(2_000);
  const title = page.getByText(/^등록상품\s*삭제$/);
  try {
    await title.first().waitFor({ state: 'hidden', timeout: 10_000 });
  } catch {
    const cnt = await title.count();
    if (cnt === 0) return { ok: true as const };
    const anyVisible = await title.first().isVisible().catch(() => false);
    if (!anyVisible) return { ok: true as const };
    return {
      ok: false as const,
      error_key: 'delete_modal_still_open' as ErrorKey,
      message: '확정 후에도 삭제 모달 title 잔존',
    };
  }
  return { ok: true as const };
};

const waitLoadingDoneStep: StepHandler = async (page) => {
  // 등록상품 페이지의 로딩 인디케이터 — generic spinner / disabled toolbar / overlay.
  const start = Date.now();
  while (Date.now() - start < 30_000) {
    const spinning = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('*'));
      for (const el of els) {
        const cs = window.getComputedStyle(el as HTMLElement);
        const anim = cs.animationName ?? '';
        if (!/spin|rotate|loading/i.test(anim)) continue;
        const r = el.getBoundingClientRect();
        if (r.width >= 8 && r.width <= 64 && r.height >= 8 && r.height <= 64) return true;
      }
      return false;
    });
    if (!spinning) return { ok: true as const };
    await page.waitForTimeout(1_000);
  }
  // 30초 후에도 spinner 가 보이면 — 실패 아니라 진행 신호로만 (실제 삭제는 비동기).
  logger.warn('[wait_loading_done] 30초 polling 후에도 spinner 잔존 — 진행');
  return { ok: true as const };
};

const verifyFirstCardRemovedStep: StepHandler = async (page) => {
  if (snapshotProductId.length === 0) {
    return {
      ok: false as const,
      error_key: 'snapshot_missing' as ErrorKey,
      message: 'snapshotProductId 미세팅 — snapshot step 실행 안 됨',
    };
  }
  // 백엔드 삭제 처리에 지연이 있을 수 있어 reload + polling.
  const start = Date.now();
  let lastCnt = -1;
  while (Date.now() - start < 30_000) {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2_000);
    const cnt = await page
      .locator(`a[href*="/view2/registered-product/${snapshotProductId}"]`)
      .count();
    lastCnt = cnt;
    if (cnt === 0) {
      logger.info(
        `[verify_first_card_removed] productId=${snapshotProductId} 목록에서 사라짐 ✓ (${Math.round((Date.now() - start) / 1000)}s)`,
      );
      return { ok: true as const };
    }
    logger.info(
      `[verify_first_card_removed] productId=${snapshotProductId} 잔존 ${cnt}개 — 5초 후 재확인`,
    );
    await page.waitForTimeout(5_000);
  }
  return {
    ok: false as const,
    error_key: 'product_still_present' as ErrorKey,
    message: `삭제 후 30초 polling 했지만 productId=${snapshotProductId} 가 ${lastCnt}개 잔존`,
  };
};

const handlers: StepHandlers = {
  open_registered_list: openRegisteredListStep,
  select_only_first_card: selectOnlyFirstCardStep,
  snapshot_first_card_id: snapshotFirstCardIdStep,
  open_delete_modal: clickDeleteToolbarStep,
  verify_modal_visible: verifyModalVisibleStep,
  check_all_markets: checkAllMarketsStep,
  confirm_delete: clickDeleteConfirmStep,
  verify_modal_closed: verifyModalClosedStep,
  wait_loading_done: waitLoadingDoneStep,
  verify_first_card_removed: verifyFirstCardRemovedStep,
};

test('등록상품 삭제 cascade (e2e)', async ({ page }) => {
  test.setTimeout(5 * 60_000);
  // 다른 test 와 module-level 변수 충돌 방지.
  snapshotProductId = '';

  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
