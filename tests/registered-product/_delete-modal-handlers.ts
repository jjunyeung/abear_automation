/**
 * 등록상품 삭제 모달 시리즈 공유 step handlers.
 *
 * 다루는 ATC 들 (TC export Case 921, 924, 948~962):
 *   - registered-delete-modal-visible.atc.yml          (921, 924 — 모달 전체 노출)
 *   - registered-delete-modal-only-<market>.atc.yml    (948~962 — 단일 마켓 체크 후 삭제 버튼 활성 검증)
 *
 * 코드 출처 (sesame view2):
 *   src/features/RegisteredProduct/RegisteredProduct.tsx:430                  → "상품 삭제" 버튼
 *   src/components/organisms/Modals/Product/DeleteRegisteredProductsModal/index.tsx → 모달 컨테이너
 *     - title "등록상품 삭제"
 *     - 7개 마켓 체크박스 (smartstore/coupang/street/streetDomestic/esm/lotteOn/talkstore)
 *     - leftButton "취소"
 *     - rightButton "삭제" (체크 0건이면 disabled)
 *
 * 핵심 selector 규약:
 *   - 모달 컨테이너 식별 = title text "등록상품 삭제"
 *   - 마켓 체크박스 클릭 = `label[for^="checkbox_"]` + hasText: 한국어 마켓 라벨
 *   - 마켓 한국어 라벨 매핑 = sesame `marketKeyToLabel()` 와 일치 (스마트스토어/쿠팡/ESM 2.0 등)
 */

import type { Page } from '@playwright/test';
import type { StepHandler } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';

/**
 * 등록상품 카드 1개만 단독 선택 (헤더 select-all 이 아닌 첫 카드 체크박스).
 *
 * 등록상품 페이지 layout:
 *   - label[for^="checkbox_"] 의 첫 번째 = RegisteredProductTable 헤더 select-all
 *   - 두 번째부터 = 각 카드의 체크박스 (CheckBoxTableCell)
 *
 * 실제 삭제 trigger 케이스용 — 가능한 한 손실 최소화.
 */
export const selectOnlyFirstCardStep: StepHandler = async (page) => {
  const cardCb = page.locator('label[for^="checkbox_"]').nth(1);
  const cnt = await page.locator('label[for^="checkbox_"]').count().catch(() => 0);
  if (cnt < 2) {
    return {
      ok: false as const,
      error_key: 'no_card_checkbox' as ErrorKey,
      message: '카드 체크박스 매칭 X (헤더 select-all 만 있음 = 등록상품 0건)',
    };
  }
  await cardCb.waitFor({ state: 'visible', timeout: 5_000 });
  await cardCb.click();
  return { ok: true as const };
};

/** 모달의 "전체 선택" 체크박스 클릭 (모든 마켓 체크). */
export const checkAllMarketsStep: StepHandler = async (page) => {
  // 모달 안 첫 체크박스 라벨 = "전체 선택" (isAll=true).
  const allLabel = page
    .locator('label[for^="checkbox_"]')
    .filter({ hasText: /^\s*전체\s*선택\s*$/ })
    .first();
  try {
    await allLabel.waitFor({ state: 'visible', timeout: 5_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'modal_all_checkbox_missing' as ErrorKey,
      message: '모달의 전체 선택 체크박스 미노출',
    };
  }
  await allLabel.click();
  await page.waitForTimeout(300);
  return { ok: true as const };
};

/**
 * 모달의 "삭제" 버튼 클릭 → **실제 삭제 트리거**. 위험 — 호출자가 명시적으로 의도해야 함.
 * 클릭 후 로딩/완료 모달은 별도 step 으로 검증.
 */
export const clickDeleteConfirmStep: StepHandler = async (page) => {
  const del = page.getByRole('button', { name: /^삭제$/ }).first();
  await del.waitFor({ state: 'visible', timeout: 3_000 });
  const isDisabled = await del.isDisabled().catch(() => true);
  if (isDisabled) {
    return {
      ok: false as const,
      error_key: 'delete_confirm_disabled' as ErrorKey,
      message: '삭제 확정 버튼 비활성 — 마켓 체크 X',
    };
  }
  await del.click();
  return { ok: true as const };
};

/**
 * 툴바의 "상품 삭제" 버튼 클릭. 체크박스 1건 이상 선택돼 있어야 활성.
 * 호출 전 register list 진입 + 첫 페이지 전체 선택 필요 (선행 step).
 */
export const clickDeleteToolbarStep: StepHandler = async (page) => {
  const btn = page.getByRole('button', { name: /^상품\s*삭제$/ }).first();
  await btn.waitFor({ state: 'visible', timeout: 5_000 });
  const isDisabled = await btn.isDisabled().catch(() => false);
  if (isDisabled) {
    return {
      ok: false as const,
      error_key: 'delete_button_disabled' as ErrorKey,
      message: '상품 삭제 버튼 비활성 — 체크박스 선택 미반영 or 권한 없음',
    };
  }
  await btn.click();

  // 모달 title 가시까지 대기.
  try {
    await page.getByText(/^등록상품\s*삭제$/).first().waitFor({ state: 'visible', timeout: 5_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'delete_modal_not_opened' as ErrorKey,
      message: '삭제 버튼 클릭 후에도 모달이 열리지 않음',
    };
  }
  return { ok: true as const };
};

/** 모달 안에서 한국어 라벨 텍스트로 단일 마켓 체크박스를 찾아 클릭. */
export function checkOnlyMarketStep(marketLabel: RegExp): StepHandler {
  return async (page) => {
    // 모달 안 마켓 체크박스 — label[for^="checkbox_"] + hasText: marketLabel
    const cb = page
      .locator('label[for^="checkbox_"]')
      .filter({ hasText: marketLabel })
      .first();
    try {
      await cb.waitFor({ state: 'visible', timeout: 5_000 });
    } catch {
      return {
        ok: false as const,
        error_key: 'market_checkbox_missing' as ErrorKey,
        message: `마켓 체크박스 미노출 (${marketLabel.source})`,
      };
    }
    await cb.click();
    await page.waitForTimeout(300);
    return { ok: true as const };
  };
}

/** 모달의 "삭제" 버튼 활성화 검증. 클릭 X (실제 삭제 방지). */
export const verifyDeleteEnabledStep: StepHandler = async (page) => {
  const del = page.getByRole('button', { name: /^삭제$/ }).first();
  try {
    await del.waitFor({ state: 'visible', timeout: 3_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'delete_button_missing' as ErrorKey,
      message: '모달의 삭제 버튼 미노출',
    };
  }
  const isDisabled = await del.isDisabled().catch(() => true);
  if (isDisabled) {
    return {
      ok: false as const,
      error_key: 'delete_button_still_disabled' as ErrorKey,
      message: '마켓 체크 후에도 삭제 버튼 비활성',
    };
  }
  return { ok: true as const };
};

/** 모달의 취소 버튼 클릭 → 모달 닫힘. */
export const closeDeleteModalStep: StepHandler = async (page) => {
  const cancel = page.getByRole('button', { name: /^취소$/ }).first();
  await cancel.click();
  try {
    await page
      .getByText(/^등록상품\s*삭제$/)
      .first()
      .waitFor({ state: 'hidden', timeout: 5_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'delete_modal_not_closed' as ErrorKey,
      message: '취소 후에도 삭제 모달이 닫히지 않음',
    };
  }
  return { ok: true as const };
};

/* ─────────────────────────────────────────────────────────────
 * 보조 — 마켓 키 ↔ 한국어 라벨 매핑 (sesame marketKeyToLabel 와 일치).
 * ───────────────────────────────────────────────────────────── */

export const MARKET_LABEL: Record<string, RegExp> = {
  smartstore: /^\s*스마트스토어\s*$/,
  coupang: /^\s*쿠팡\s*$/,
  esm: /^\s*ESM\s*2\.0\s*$/,
  street: /^\s*11번가\s*글로벌\s*$/,
  lotteOn: /^\s*롯데온\s*$/,
  talkstore: /^\s*톡스토어\s*$/,
};
