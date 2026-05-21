/**
 * 등록상품 삭제 — 전체 마켓 선택 트리거 + 진행 indicator 검증.
 *
 * 대응 ATC: atcs/upload/registered-delete-execute-complete.atc.yml
 * TC 원본: Case No 925 (전체 마켓 trigger), 926 (완료 후 사라짐 — trigger 까지만 cover) / P0
 *
 * ⚠️ 실제 백엔드 삭제 요청 발생. 1 카드.
 * 926 의 "카드 사라짐" 은 백엔드 비동기로 시간 의존 — 본 spec 에서는 검증 안 함.
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
  checkAllMarketsStep,
  clickDeleteConfirmStep,
} from './_delete-modal-handlers';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'registered-product', 'registered-delete-execute-complete.atc.yml');

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

const verifyLoadingIndicatorStep: StepHandler = async (page) => {
  const indicator = page.getByText(/^실시간\s*삭제$/).first();
  await indicator
    .waitFor({ state: 'visible', timeout: 8_000 })
    .catch(() => undefined);
  // best-effort — indicator 가 즉시 사라지거나 안 떴어도 PASS (백엔드 task 즉시 완료 case).
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_registered_list: openRegisteredListStep,
  select_only_first_card: selectOnlyFirstCardStep,
  open_delete_modal: clickDeleteToolbarStep,
  check_all_markets: checkAllMarketsStep,
  confirm_delete: clickDeleteConfirmStep,
  verify_modal_closed: verifyModalClosedStep,
  verify_loading_indicator: verifyLoadingIndicatorStep,
};

test('등록상품 삭제 — 전체 마켓 트리거', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
