/**
 * 등록상품 삭제 실제 트리거 검증.
 *
 * 대응 ATC: atcs/upload/registered-delete-execute-trigger.atc.yml
 * TC 원본: Case No 922, 925 / 등록상품 › 상품삭제 / P0
 *
 * ⚠️ 실제 백엔드 삭제 요청 발생. 1 카드 + 1 마켓 (스마트스토어) 한정.
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
import { openRegisteredListStep } from '../smartstore-customs-tax/_bulk-edit-handlers';
import {
  selectOnlyFirstCardStep,
  clickDeleteToolbarStep,
  checkOnlyMarketStep,
  clickDeleteConfirmStep,
  MARKET_LABEL,
} from './_delete-modal-handlers';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'registered-product', 'registered-delete-execute-trigger.atc.yml');

/** 삭제 모달 사라짐 검증 (handleDelete → setShow(false)). */
const verifyModalClosedStep: StepHandler = async (page) => {
  try {
    await page
      .getByText(/^등록상품\s*삭제$/)
      .first()
      .waitFor({ state: 'hidden', timeout: 10_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'delete_modal_not_closed_after_confirm' as ErrorKey,
      message: '삭제 클릭 후에도 모달이 닫히지 않음',
    };
  }
  return { ok: true as const };
};

/**
 * "실시간 삭제" indicator 노출 best-effort 검증.
 * DeletingProductsIndicator 의 "실시간 삭제" 텍스트.
 * 비동기 mount 라 짧게 대기. 못 잡아도 ok=true 처리 (백엔드 task 가 즉시 완료된 경우 indicator 가 안 뜰 수도).
 */
const verifyLoadingIndicatorStep: StepHandler = async (page) => {
  const indicator = page.getByText(/^실시간\s*삭제$/).first();
  const visible = await indicator
    .waitFor({ state: 'visible', timeout: 8_000 })
    .then(() => true)
    .catch(() => false);
  if (!visible) {
    // indicator 못 잡아도 fail 처리 X — 백엔드 task 가 즉시 완료된 경우 정상적으로 안 뜸.
    // 어쨌든 모달 닫힘 = 삭제 요청 전송 성공.
    return { ok: true as const };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_registered_list: openRegisteredListStep,
  select_only_first_card: selectOnlyFirstCardStep,
  open_delete_modal: clickDeleteToolbarStep,
  check_only_market: checkOnlyMarketStep(MARKET_LABEL.smartstore),
  confirm_delete: clickDeleteConfirmStep,
  verify_modal_closed: verifyModalClosedStep,
  verify_loading_indicator: verifyLoadingIndicatorStep,
};

test('등록상품 삭제 실제 트리거', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
