/**
 * 등록상품 수정 업로드 모달 ATC 계열 공유 step handlers.
 *
 * 다루는 ATC 들 (TC export Case 3576~3605, P0 21건):
 *   - bulk-edit-banner-notice.atc.yml   (Case 3576)
 *   - bulk-edit-all-checkbox-visible.atc.yml (Case 3577)
 *   - bulk-edit-market-list-visible.atc.yml  (Case 3578)
 *   - bulk-edit-select-all-action.atc.yml    (Case 3580)
 *   - bulk-edit-partial-then-next.atc.yml    (Case 3582)
 *   - bulk-edit-none-blocks-next.atc.yml     (Case 3583)
 *   - bulk-edit-cancel-closes.atc.yml        (Case 3585)
 *   - ... (3586~3605 후속)
 *
 * 코드 출처 (sesame view2):
 *   src/features/RegisteredProduct/RegisteredProduct.tsx:401             → "수정 업로드" 버튼
 *   src/features/RegisteredProduct/BulkEditModal/index.tsx               → 모달 컨테이너
 *   src/features/RegisteredProduct/BulkEditModal/StepChoiceMarket/index.tsx → 1단계 마켓 선택
 *     - .banner                            안내 배너 (WarningMessageContainer)
 *     - <CheckBox isAll label="전체 선택" /> 전체 선택 (`label[for^="checkbox_"]` text="전체 선택")
 *     - .checkbox-all-container            전체 선택 영역 컨테이너
 *   src/components/atoms/CheckBox/CheckBox.tsx                            → input[display:none] + Label
 *   src/components/atoms/CheckBox/CheckBox.styled.ts                      → .base-checkbox styled div
 *
 * 핵심 selector 규약:
 *   - 체크박스 클릭 = label[for^="checkbox_"] (input 은 display:none)
 *   - 1단계 식별 = `.banner` 존재 + "전체 선택" label 존재
 *   - 다음 / 이전 / 취소 / 수정 업로드 버튼 = getByRole('button', { name: /^...$/ })
 */

import type { Page } from '@playwright/test';
import type { StepHandler } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { goToRegisteredProducts } from '../../lib/windly-actions';

/** 등록상품 페이지 진입 + 첫 카드 가시 대기 (목록 0건이면 다음 step 에서 fail). */
export const openRegisteredListStep: StepHandler = async (page) => {
  await goToRegisteredProducts(page);
  await page
    .locator('a[href*="/view2/registered-product/"]')
    .first()
    .waitFor({ state: 'visible', timeout: 15_000 })
    .catch(() => undefined);
  return { ok: true as const };
};

/**
 * 등록상품 목록의 헤더 "전체 선택" 체크박스 라벨을 클릭하여 모든 상품 선택.
 * sesame CheckBox 은 input[display:none] + Label htmlFor=checkbox_<v>_<cls>_<uid>.
 */
export const selectFirstProductStep: StepHandler = async (page) => {
  const cbLabel = page.locator('label[for^="checkbox_"]').first();
  const cnt = await cbLabel.count().catch(() => 0);
  if (cnt === 0) {
    return {
      ok: false as const,
      error_key: 'no_registered_products' as ErrorKey,
      message: '등록상품 목록 체크박스 라벨 매칭 0건',
    };
  }
  await cbLabel.waitFor({ state: 'visible', timeout: 10_000 });
  await cbLabel.click();
  return { ok: true as const };
};

/**
 * 화면 상단 툴바의 "수정 업로드" 버튼 클릭. 체크박스 1개 이상 선택돼 있어야 활성.
 * 모달 진입 후 1단계의 .banner 또는 "전체 선택" label 가시까지 짧게 대기.
 */
export const clickBulkEditButtonStep: StepHandler = async (page) => {
  const btn = page.getByRole('button', { name: /^수정\s*업로드$/ }).first();
  await btn.waitFor({ state: 'visible', timeout: 5_000 });
  const isDisabled = await btn.isDisabled().catch(() => false);
  if (isDisabled) {
    return {
      ok: false as const,
      error_key: 'button_disabled' as ErrorKey,
      message: '수정 업로드 버튼 비활성 — 체크박스 선택이 반영 안 됨',
    };
  }
  await btn.click();
  // 모달 1단계 진입 대기 — banner 컨테이너 가시까지.
  await page
    .locator('.banner')
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 })
    .catch(() => undefined);
  return { ok: true as const };
};

/* ─────────────────────────────────────────────────────────────
 * 헬퍼 (handler 가 아닌, 검증/조작 보조).
 * ───────────────────────────────────────────────────────────── */

/** 모달이 보이는 동안 1단계의 모든 체크박스 label 매핑. 첫 번째 = "전체 선택", 나머지 = 마켓. */
export async function listStepOneCheckboxLabels(page: Page) {
  return page.locator('label[for^="checkbox_"]').filter({ has: page.locator('.base-checkbox') });
}

/** 1단계의 "전체 선택" label (checkbox-label text 매칭). */
export function stepOneAllSelectLabel(page: Page) {
  return page
    .locator('label[for^="checkbox_"]')
    .filter({ hasText: /^\s*전체\s*선택\s*$/ })
    .first();
}

/** 모달 안 "다음" 버튼. step1/step2 의 진행 버튼. */
export function modalNextButton(page: Page) {
  return page.getByRole('button', { name: /^다음$/ }).first();
}

/** 모달 안 "취소" 버튼. step1 의 좌측 버튼. */
export function modalCancelButton(page: Page) {
  return page.getByRole('button', { name: /^취소$/ }).first();
}

/** 모달이 현재 노출 중인지 = .banner 가시 여부로 판정 (1단계에서만 노출). */
export async function isStepOneVisible(page: Page): Promise<boolean> {
  const b = page.locator('.banner').first();
  return await b.isVisible().catch(() => false);
}

/** EditForms (step2 라디오) 라벨 정규식 — 한 가지 이상 보이면 step2 진입한 것. */
export const STEP2_FORM_LABEL_RE = /(가격\s*공식|배송\s*정보|상하단이미지|리뷰포인트|모음전\s*정책|관부가세)/;

/**
 * EditFormValue → step3 Accordion title 매핑 (진입 확인용).
 * 주의: step2 라디오 라벨은 "가격 공식, 배송 정보" 한 줄이지만 step3 에서는
 * 두 accordion 으로 분리 ("가격 공식" + "배송 정보") — 따라서 priceAndDelivery
 * 진입 검증은 "가격 공식" 단독 매칭이 안전.
 */
export const STEP3_ACCORDION_TITLE: Record<string, RegExp> = {
  priceAndDelivery: /^가격\s*공식$/,
  topBottomImage: /^상하단이미지$/,
  smartStoreReviewPoint: /^스마트스토어\s*리뷰포인트$/,
  smartStorePolicy: /^스마트스토어\s*모음전\s*정책\s*적용$/,
  smartStoreCustomsTax: /^관부가세$/,
};

/**
 * step1 진입 → 모달 전체선택 → 다음 → step2 진입 보장. step2 케이스들의 prelude.
 * 마켓 모두 선택해야 step2 의 EditForms 가 disabled 없이 보임 (예: smartStorePolicy 는 smartstore 필요).
 */
export const enterStep2Step: StepHandler = async (page) => {
  // 1단계 진입 보장
  await page
    .locator('.banner')
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 });

  // 모달 안 .checkbox-all-container 전체 선택 클릭.
  const allInModal = page.locator('.checkbox-all-container label[for^="checkbox_"]').first();
  await allInModal.waitFor({ state: 'visible', timeout: 5_000 });
  await allInModal.click();
  await page.waitForTimeout(300);

  // 다음 버튼.
  const next = modalNextButton(page);
  const disabled = await next.isDisabled().catch(() => true);
  if (disabled) {
    return {
      ok: false as const,
      error_key: 'next_button_disabled' as ErrorKey,
      message: 'step1 전체선택 후에도 다음 버튼 비활성',
    };
  }
  await next.click();

  // step2 진입 보장 — banner 사라지고 EditForms 라벨 가시까지.
  try {
    await page.getByText(STEP2_FORM_LABEL_RE).first().waitFor({ state: 'visible', timeout: 10_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'step2_not_entered' as ErrorKey,
      message: 'step2 EditForms 라벨 미노출 — step 전환 실패',
    };
  }
  return { ok: true as const };
};

/**
 * step2 → step3 진입. step2 의 첫 라디오 (가격 공식, 배송 정보 = priceAndDelivery) 선택 + 다음.
 * step3 진입 = ProgressHeader 의 "수정할 정보 입력" 가시.
 */
export const enterStep3Step: StepHandler = async (page) => {
  // step2 라디오 첫 번째 (priceAndDelivery).
  const firstRadioLabel = page.locator('label[for^="radio_"]').first();
  await firstRadioLabel.waitFor({ state: 'visible', timeout: 5_000 });
  await firstRadioLabel.click({ force: true });
  await page.waitForTimeout(300);

  const next = modalNextButton(page);
  const disabled = await next.isDisabled().catch(() => true);
  if (disabled) {
    return {
      ok: false as const,
      error_key: 'step2_next_disabled' as ErrorKey,
      message: 'step2 라디오 선택 후에도 다음 비활성',
    };
  }
  await next.click();

  // step3 진입 — "수정할 정보 입력" 텍스트 가시.
  try {
    await page.getByText(/^수정할\s*정보\s*입력$/).first().waitFor({ state: 'visible', timeout: 10_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'step3_not_entered' as ErrorKey,
      message: 'ProgressHeader 수정할 정보 입력 미노출',
    };
  }
  return { ok: true as const };
};
