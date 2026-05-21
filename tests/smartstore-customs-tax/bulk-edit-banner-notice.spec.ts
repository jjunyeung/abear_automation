/**
 * 등록상품 수정 업로드 모달 1단계 안내 배너 검증 — Playwright spec.
 *
 * 대응 ATC : atcs/upload/bulk-edit-banner-notice.atc.yml
 * TC 원본  : Case No 3576 / 등록상품 › 수정 업로드 › 안내 배너 문구 / P0
 * 공통 핸들러: ./_bulk-edit-handlers (3 step prelude)
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
} from './_bulk-edit-handlers';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'smartstore-customs-tax',
  'bulk-edit-banner-notice.atc.yml',
);

const BANNER_TEXT_PREFIX = '업로드된 마켓에만 상품 정보가 업데이트됩니다';

const verifyBannerNoticeStep: StepHandler = async (page) => {
  const banner = page.locator('.banner').filter({ hasText: BANNER_TEXT_PREFIX }).first();
  try {
    await banner.waitFor({ state: 'visible', timeout: 15_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'banner_not_visible' as ErrorKey,
      message: `모달 1단계 안내 배너 미노출 (.banner 안에 "${BANNER_TEXT_PREFIX}" 미매칭)`,
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_registered_list: openRegisteredListStep,
  select_first_product: selectFirstProductStep,
  click_bulk_edit_button: clickBulkEditButtonStep,
  verify_banner_notice: verifyBannerNoticeStep,
};

test('등록상품 수정 업로드 모달 1단계 안내 배너 노출 검증', async ({ page }) => {
  test.setTimeout(3 * 60_000);

  const atc = loadATC(ATC_PATH);
  const inputs: Record<string, unknown> = {};

  const result = await runATC({ atc, page, inputs, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
