/**
 * 등록상품 첫 카드 → 상품명 timestamp 변경 → 재업로드 — Playwright spec
 *
 * 대응 ATC: atcs/upload/edit-top-name-reupload.atc.yml
 *
 * edit-name-reupload 의 변형: source_product_id 검색 대신 첫 카드 사용 +
 * 새 이름은 매 실행 자동 timestamp.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import { goToRegisteredProducts } from '../../lib/windly-actions';
import {
  editMainProductNameOnlyStep,
  triggerUploadStep,
  confirmUploadModalStep,
  waitUploadCompleteStep,
  openTopRegisteredProductStep,
  buildTimestampedNewName,
} from './_handlers';
import { logger } from '../../lib/logger';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'upload',
  'edit-top-name-reupload.atc.yml',
);

const openRegisteredListStep: StepHandler = async (page, _inputs) => {
  await goToRegisteredProducts(page);
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_registered_list: openRegisteredListStep,
  open_top_product: openTopRegisteredProductStep,
  edit_name: editMainProductNameOnlyStep,
  trigger_upload: triggerUploadStep,
  confirm_upload_modal: confirmUploadModalStep,
  wait_upload_complete: waitUploadCompleteStep,
};

test('등록상품 첫 카드 → 상품명 timestamp 변경 → 재업로드', async ({ page }) => {
  test.setTimeout(15 * 60_000);

  const atc = loadATC(ATC_PATH);
  const newName = buildTimestampedNewName();
  logger.info(`[edit-top-name-reupload] 새 이름 = "${newName}"`);

  const result = await runATC({
    atc,
    page,
    inputs: { new_name: newName },
    handlers,
  });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
