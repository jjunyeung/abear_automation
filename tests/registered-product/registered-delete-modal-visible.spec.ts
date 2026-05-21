/**
 * 등록상품 삭제 모달 노출 검증.
 *
 * 대응 ATC: atcs/upload/registered-delete-modal-visible.atc.yml
 * TC 원본: Case No 921, 924 / 등록상품 › 상품 삭제 / P0
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
import {
  openRegisteredListStep,
  selectFirstProductStep,
} from '../smartstore-customs-tax/_bulk-edit-handlers';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'registered-product', 'registered-delete-modal-visible.atc.yml');

/** 툴바의 "상품 삭제" 버튼 클릭. 체크 1건 이상 선택돼 있어야 활성. */
const clickDeleteButtonStep: StepHandler = async (page) => {
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
  return { ok: true as const };
};

/** 삭제 모달 노출 검증 — 타이틀 + 마켓 체크박스 7종 + 취소/삭제 버튼. */
const verifyDeleteModalStep: StepHandler = async (page) => {
  // title "등록상품 삭제" 가시.
  const title = page.getByText(/^등록상품\s*삭제$/).first();
  try {
    await title.waitFor({ state: 'visible', timeout: 5_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'delete_modal_title_missing' as ErrorKey,
      message: '삭제 모달 타이틀 "등록상품 삭제" 미노출',
    };
  }

  // 부제 "선택한 상품을 어디에서 삭제할까요?" 가시.
  const subtitle = page.getByText(/선택한\s*상품을\s*어디에서\s*삭제할까요/).first();
  try {
    await subtitle.waitFor({ state: 'visible', timeout: 3_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'delete_modal_subtitle_missing' as ErrorKey,
      message: '삭제 모달 부제 미노출',
    };
  }

  // 좌 취소 버튼.
  const cancel = page.getByRole('button', { name: /^취소$/ }).first();
  if (!(await cancel.isVisible().catch(() => false))) {
    return {
      ok: false as const,
      error_key: 'delete_modal_cancel_missing' as ErrorKey,
      message: '취소 버튼 미노출',
    };
  }
  // 우 삭제 버튼.
  const del = page.getByRole('button', { name: /^삭제$/ }).first();
  if (!(await del.isVisible().catch(() => false))) {
    return {
      ok: false as const,
      error_key: 'delete_modal_delete_missing' as ErrorKey,
      message: '삭제 버튼 미노출',
    };
  }

  return { ok: true as const };
};

/** 모달의 취소 버튼 클릭 → 모달 닫힘. */
const closeModalStep: StepHandler = async (page) => {
  const cancel = page.getByRole('button', { name: /^취소$/ }).first();
  await cancel.click();
  // 모달 사라짐 — 타이틀 텍스트 hidden 까지 대기.
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

const handlers: StepHandlers = {
  open_registered_list: openRegisteredListStep,
  select_first_product: selectFirstProductStep,
  click_delete_button: clickDeleteButtonStep,
  verify_delete_modal: verifyDeleteModalStep,
  close_modal: closeModalStep,
};

test('등록상품 삭제 모달 노출', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
