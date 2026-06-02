/**
 * 수집상품 일괄 → 기본 설정값 적용 모달 노출/닫기 검증 (non-destructive).
 *
 * 대응 ATC : atcs/collected-product/bulk-base-setting-modal-display.atc.yml
 * TC 원본  : Case No 3547, 3548, 3549, 3551, 3552 / P0 (5건)
 *
 * Destructive (실제 적용) TC#3553/3554/3563 는 별도 ATC 로 — 본 spec 은 적용 버튼 클릭 X.
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
  'bulk-base-setting-modal-display.atc.yml',
);

const MODAL_TITLE = '기본 설정값 적용';
const MODAL_BODY_GUIDE = '선택한 상품에 기본 설정값을 적용하시겠어요?';
// 빨간 경고 텍스트 — Text 컴포넌트가 split rendering 하는 케이스 회피 위해 짧게.
const MODAL_WARNING_KEYWORD = '되돌릴';
const CANCEL_BUTTON = '취소';
const APPLY_BUTTON = '적용';

const gotoCollectedProductsStep: StepHandler = async (page) => {
  await goToCollectedProducts(page);
  // 상품 카드 로딩 대기.
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  return { ok: true as const };
};

const selectFirstCardStep: StepHandler = async (page) => {
  // sesame ProductCard 의 CheckBox 구조 (sesame/src/components/atoms/CheckBox/CheckBox.tsx):
  //   <input id="checkbox_<productId>_<className>_<uid>" value="<productId>" type="checkbox"/>
  //   <label htmlFor="checkbox_<productId>_..."> ... </label>
  // "전체 선택" 헤더 체크박스는 value="" — 그 외 = 첫 카드.
  // label 클릭 (부모 label 이 pointer-event 가로채는 패턴 회피).
  const clicked = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input[type="checkbox"][id^="checkbox_"]'));
    for (const inp of inputs) {
      const v = (inp as HTMLInputElement).value;
      if (!v) continue; // 헤더 전체선택 (value="") 제외
      const id = (inp as HTMLInputElement).id;
      const label = document.querySelector(`label[for="${id}"]`) as HTMLLabelElement | null;
      const target = label ?? (inp as HTMLElement);
      const rect = (target as HTMLElement).getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      target.scrollIntoView({ block: 'center' });
      (target as HTMLElement).click();
      return v; // productId 반환 — 디버깅용
    }
    return null;
  });
  if (clicked === null) {
    return {
      ok: false as const,
      error_key: 'no_product_card' as ErrorKey,
      message: '수집상품 카드 체크박스 미발견 — 목록 비어있거나 selector 미스매치',
    };
  }
  await page.waitForTimeout(500);
  return { ok: true as const };
};

const openMoreMenuAndClickApplyStep: StepHandler = async (page) => {
  // ... (More) 버튼 — svg-only icon button. windly more.svg path 시그니처 = "M5 10C3.9 10".
  // 일괄 도구 영역의 enabled More 버튼 1개 click 으로 AnchoredModalContainer 노출.
  const moreBtn = page.locator('button:not([disabled]):has(svg path[d^="M5 10C3.9 10"])').first();
  try {
    await moreBtn.waitFor({ state: 'visible', timeout: 8_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'more_button_not_found' as ErrorKey,
      message: '... 더 보기 버튼 미발견 (선택된 카드 없거나 disabled)',
    };
  }
  await moreBtn.scrollIntoViewIfNeeded();
  await moreBtn.click();
  await page.waitForTimeout(500);
  // 메뉴 항목 "기본 설정값 적용" 클릭 (AnchoredModalItem).
  const item = page.getByText('기본 설정값 적용', { exact: true }).first();
  try {
    await item.waitFor({ state: 'visible', timeout: 5_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'menu_item_not_visible' as ErrorKey,
      message: 'More 메뉴 노출됐으나 "기본 설정값 적용" 항목 미발견',
    };
  }
  await item.click();
  await page.waitForTimeout(800);
  // 모달 title 노출 확인.
  try {
    await page.getByText(MODAL_TITLE, { exact: true }).first().waitFor({ state: 'visible', timeout: 5_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'modal_not_opened' as ErrorKey,
      message: '기본 설정값 적용 모달 미오픈',
    };
  }
  return { ok: true as const };
};

const verifyModalTitleAndBodyStep: StepHandler = async (page) => {
  // 모달 body 의 텍스트 컴포넌트는 styled `<Text>` 안에 template literal 로 들어가
  // getByText 가 split 시 매칭 못하는 케이스가 있음. body innerText 로 직접 검색.
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (!bodyText.includes(MODAL_TITLE)) {
    return {
      ok: false as const,
      error_key: 'modal_title_missing' as ErrorKey,
      message: `body 텍스트에 title "${MODAL_TITLE}" 없음`,
    };
  }
  if (!bodyText.includes(MODAL_BODY_GUIDE)) {
    return {
      ok: false as const,
      error_key: 'modal_guide_missing' as ErrorKey,
      message: `body 텍스트에 안내 "${MODAL_BODY_GUIDE}" 없음`,
    };
  }
  if (!bodyText.includes(MODAL_WARNING_KEYWORD)) {
    return {
      ok: false as const,
      error_key: 'modal_warning_missing' as ErrorKey,
      message: `body 텍스트에 경고 키워드 "${MODAL_WARNING_KEYWORD}" 없음`,
    };
  }
  return { ok: true as const };
};

const verifyModalButtonsStep: StepHandler = async (page) => {
  const cancel = await page.getByRole('button', { name: CANCEL_BUTTON, exact: true }).first().isVisible().catch(() => false);
  const apply = await page.getByRole('button', { name: APPLY_BUTTON, exact: true }).first().isVisible().catch(() => false);
  if (!cancel) {
    return {
      ok: false as const,
      error_key: 'cancel_button_missing' as ErrorKey,
      message: `취소 버튼 미노출`,
    };
  }
  if (!apply) {
    return {
      ok: false as const,
      error_key: 'apply_button_missing' as ErrorKey,
      message: `적용 버튼 미노출`,
    };
  }
  return { ok: true as const };
};

const clickCancelAndVerifyClosedStep: StepHandler = async (page) => {
  const cancel = page.getByRole('button', { name: CANCEL_BUTTON, exact: true }).first();
  await cancel.click();
  await page.waitForTimeout(800);
  const stillVisible = await page.getByText(MODAL_TITLE, { exact: true }).first().isVisible().catch(() => false);
  if (stillVisible) {
    return {
      ok: false as const,
      error_key: 'modal_still_open' as ErrorKey,
      message: '취소 클릭 후 모달이 닫히지 않음',
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  goto_collected_products: gotoCollectedProductsStep,
  select_first_card: selectFirstCardStep,
  open_more_menu_and_click_apply: openMoreMenuAndClickApplyStep,
  verify_modal_title_and_body: verifyModalTitleAndBodyStep,
  verify_modal_buttons: verifyModalButtonsStep,
  click_cancel_and_verify_closed: clickCancelAndVerifyClosedStep,
};

test('[TC 3547/3548/3549/3551/3552] 수집상품 목록 → 카드 선택 → 더보기(...) → [기본 설정값 적용] → 모달 (제목/안내/경고/취소+적용 버튼) 노출 → [취소] 로 닫힘 (실 적용 X)', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
