/**
 * A4. 엑셀 벌크 수집 모달 smoke (e2e)
 * 실제 파일 업로드 + 가공 + 업로드는 시간/데이터 비용 큼 — 모달 노출까지만.
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
import { goToCollectImportMenu } from '../../lib/windly-actions';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'e2e', 'excel-bulk-collect-pick-upload.atc.yml');

const openMenuStep: StepHandler = async (page) => {
  await goToCollectImportMenu(page);
  return { ok: true as const };
};

const openExcelStep: StepHandler = async (page) => {
  const card = page.getByText(/엑셀.*가져오기|엑셀.*수집|엑셀\s*URL/, { exact: false }).first();
  try {
    await card.waitFor({ state: 'visible', timeout: 10_000 });
    await card.click();
    await page.waitForTimeout(2_000);
    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error_key: 'excel_card_not_found' as ErrorKey,
      message: '엑셀 수집 카드 미발견',
    };
  }
};

const verifyStep: StepHandler = async (page) => {
  const sig = page.getByText(/파일\s*업로드|파일\s*선택|엑셀\s*파일|drag/i).first();
  try {
    await sig.waitFor({ state: 'visible', timeout: 10_000 });
    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error_key: 'excel_modal_signature_missing' as ErrorKey,
      message: '엑셀 모달 파일 업로드 영역 미발견',
    };
  }
};

const handlers: StepHandlers = {
  open_collect_menu: openMenuStep,
  open_excel_import_modal: openExcelStep,
  verify_modal_visible: verifyStep,
};

test('엑셀 벌크 수집 모달 smoke (e2e)', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
