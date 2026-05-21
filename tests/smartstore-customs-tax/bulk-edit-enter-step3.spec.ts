/**
 * 수정 업로드 모달 step3 진입 검증.
 *
 * 대응 ATC : atcs/upload/bulk-edit-enter-step3.atc.yml
 * TC 원본  : Case No 3590 / 등록상품 › 수정 업로드 › 다음 버튼 이동 / P0
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
  clickBulkEditButtonStep,
  enterStep2Step,
  enterStep3Step,
  STEP3_ACCORDION_TITLE,
} from './_bulk-edit-handlers';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'smartstore-customs-tax',
  'bulk-edit-enter-step3.atc.yml',
);

const verifyStep3ActiveStep: StepHandler = async (page) => {
  // 헤더 가시.
  const header = page.getByText(/^수정할\s*정보\s*입력$/).first();
  try {
    await header.waitFor({ state: 'visible', timeout: 5_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'step3_header_missing' as ErrorKey,
      message: 'ProgressHeader 수정할 정보 입력 미노출',
    };
  }
  // Accordion title — priceAndDelivery 선택 시 step3 화면에 "가격 공식" accordion.
  const accordion = page.getByText(STEP3_ACCORDION_TITLE['priceAndDelivery']!).first();
  try {
    await accordion.waitFor({ state: 'visible', timeout: 5_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'step3_accordion_missing' as ErrorKey,
      message: 'Accordion title (가격 공식, 배송 정보) 미노출',
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_registered_list: openRegisteredListStep,
  select_first_product: selectFirstProductStep,
  click_bulk_edit_button: clickBulkEditButtonStep,
  enter_step2: enterStep2Step,
  enter_step3: enterStep3Step,
  verify_step3_active: verifyStep3ActiveStep,
};

test('수정 업로드 모달 step3 진입', async ({ page }) => {
  test.setTimeout(3 * 60_000);

  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
