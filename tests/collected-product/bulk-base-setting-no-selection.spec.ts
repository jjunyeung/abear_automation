/**
 * 수집상품 일괄 → 기본 설정값 적용: 선택 없음 예외 검증.
 *
 * 대응 ATC : atcs/collected-product/bulk-base-setting-no-selection.atc.yml
 * TC 원본  : Case No 3555 / P0 (1건)
 *
 * 비-destructive. 더보기 버튼 disabled 상태 검증 → 모달 자체가 열리지 않음을 확인.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { goToCollectedProducts } from '../../lib/windly-actions';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'collected-product',
  'bulk-base-setting-no-selection.atc.yml',
);

const MORE_BUTTON_SVG = 'M5 10C3.9 10';
const APPLY_MENU_ITEM = '기본 설정값 적용';

const gotoCollectedProductsStep: StepHandler = async (page) => {
  await goToCollectedProducts(page);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  return { ok: true as const };
};

const ensureNoCardSelectedStep: StepHandler = async (page) => {
  // 카드 체크박스 (id^="checkbox_", value!=="" — 헤더 전체선택 제외) 중 체크된 거 해제.
  // 데이터 0건이면 input 자체 없음 — noop OK.
  const cleared = await page.evaluate(() => {
    const inputs = Array.from(
      document.querySelectorAll('input[type="checkbox"][id^="checkbox_"]'),
    ) as HTMLInputElement[];
    let count = 0;
    for (const inp of inputs) {
      if (!inp.value) continue; // 헤더 전체선택 제외
      if (!inp.checked) continue;
      const label = document.querySelector(`label[for="${inp.id}"]`) as HTMLLabelElement | null;
      if (label) {
        label.click();
        count += 1;
      }
    }
    return count;
  });
  if (cleared > 0) {
    await page.waitForTimeout(400);
  }
  return { ok: true as const };
};

const verifyMoreButtonDisabledStep: StepHandler = async (page) => {
  // 일괄 도구 영역의 ... 더보기 버튼 — svg path d^="M5 10C3.9 10" 시그니처.
  // 선택 0건일 때 disabled 속성 true 여야 함 (InterestedProduct.tsx L1056 `disabled={isEmptySelection}`).
  // disabled 일 때 :not([disabled]) selector 는 매칭 X 이므로, 일반 button 으로 잡고 검사.
  const state = await page.evaluate((svgD) => {
    const buttons = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[];
    let totalMatched = 0;
    let disabledCount = 0;
    let enabledCount = 0;
    for (const btn of buttons) {
      const path = btn.querySelector(`svg path[d^="${svgD}"]`);
      if (!path) continue;
      totalMatched += 1;
      if (btn.disabled) disabledCount += 1;
      else enabledCount += 1;
    }
    return { totalMatched, disabledCount, enabledCount };
  }, MORE_BUTTON_SVG);

  if (state.totalMatched === 0) {
    return {
      ok: false as const,
      error_key: 'more_button_not_found' as ErrorKey,
      message: `... 더보기 버튼 (svg d^="${MORE_BUTTON_SVG}") 매칭 0건 — 일괄 도구 영역 미노출 또는 selector 변경`,
    };
  }
  // 1개 이상의 더보기 버튼이 모두 disabled 여야 함 — 선택 0건 = isEmptySelection true.
  if (state.enabledCount > 0) {
    return {
      ok: false as const,
      error_key: 'more_button_not_disabled_when_empty' as ErrorKey,
      message: `선택 없음 상태인데 더보기 버튼이 enabled (matched=${state.totalMatched}, disabled=${state.disabledCount}, enabled=${state.enabledCount})`,
    };
  }
  return { ok: true as const };
};

const verifyModalNotOpenedOnDisabledClickStep: StepHandler = async (page) => {
  // disabled 버튼 클릭은 브라우저가 무시함 — 그래도 한 번 클릭 시도해 메뉴/모달 미노출 확인.
  // page.locator(...).click() 은 disabled element 에 force option 없으면 실패. force:true 로 강제.
  const moreBtn = page.locator(`button:has(svg path[d^="${MORE_BUTTON_SVG}"])`).first();
  try {
    await moreBtn.click({ force: true, timeout: 3_000 });
  } catch {
    // disabled 라 click 실패해도 OK — 의도된 결과 (모달 안 열림).
  }
  await page.waitForTimeout(500);

  // 메뉴 항목 "기본 설정값 적용" 노출 X 확인.
  const menuVisible = await page
    .getByText(APPLY_MENU_ITEM, { exact: true })
    .first()
    .isVisible()
    .catch(() => false);
  if (menuVisible) {
    return {
      ok: false as const,
      error_key: 'menu_item_visible_when_disabled' as ErrorKey,
      message: `더보기 disabled 인데 "${APPLY_MENU_ITEM}" 메뉴 항목 노출됨`,
    };
  }

  // 모달 title 노출 X 확인 (대조군).
  const modalTitle = await page
    .getByText(APPLY_MENU_ITEM, { exact: true })
    .first()
    .isVisible()
    .catch(() => false);
  if (modalTitle) {
    return {
      ok: false as const,
      error_key: 'modal_opened_when_disabled' as ErrorKey,
      message: '더보기 disabled 인데 기본 설정값 적용 모달이 열림',
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  goto_collected_products: gotoCollectedProductsStep,
  ensure_no_card_selected: ensureNoCardSelectedStep,
  verify_more_button_disabled: verifyMoreButtonDisabledStep,
  verify_modal_not_opened_on_disabled_click: verifyModalNotOpenedOnDisabledClickStep,
};

test('[TC 3555] 수집상품 목록 → 카드 0개 선택 상태에서 더보기(...) 버튼 disabled 로 [기본 설정값 적용] 메뉴 차단 확인', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
