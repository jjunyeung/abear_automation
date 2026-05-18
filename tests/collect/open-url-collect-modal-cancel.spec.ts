/**
 * 상품 수집 → URL 수집 모달 열기 → 취소 → 모달 닫힘
 *
 * 대응 ATC: atcs/collect/open-url-collect-modal-cancel.atc.yml
 * 생성: scripts/gen-atc-tcs (단건 TC 일괄 생성).
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { goToCollectImportMenu } from '../../lib/windly-actions';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'collect',
  'open-url-collect-modal-cancel.atc.yml',
);

const handlers: StepHandlers = {
  open_collect_menu: async (page) => {
    await goToCollectImportMenu(page);
    return { ok: true as const };
  },
  open_modal: async (page) => {
    const urlCard = page
      .locator('div')
      .filter({ has: page.getByRole('img', { name: 'import-icon' }) })
      .filter({ hasText: /^URL 수집$/ })
      .first();
    await urlCard.waitFor({ state: 'visible', timeout: 20_000 });
    await urlCard.scrollIntoViewIfNeeded();
    await urlCard.click();
    await page.waitForTimeout(1_000);
    const field = page
      .getByPlaceholder(/URL|주소|링크|http/i)
      .or(page.locator('textarea'))
      .first();
    try {
      await field.waitFor({ state: 'visible', timeout: 10_000 });
    } catch {
      return {
        ok: false as const,
        error_key: 'url_collect_modal_not_opened' as ErrorKey,
        message: 'URL 수집 모달 안 textarea 미발견',
      };
    }
    return { ok: true as const };
  },
  cancel_modal: async (page) => {
    const cancelBtn = page
      .getByRole('button', { name: /^취소$|^닫기$/ })
      .first();
    try {
      await cancelBtn.waitFor({ state: 'visible', timeout: 5_000 });
    } catch {
      return {
        ok: false as const,
        error_key: 'cancel_button_not_found' as ErrorKey,
        message: '모달 안 취소/닫기 버튼 미발견',
      };
    }
    await cancelBtn.click();
    const field = page
      .getByPlaceholder(/URL|주소|링크|http/i)
      .or(page.locator('textarea'))
      .first();
    try {
      await field.waitFor({ state: 'hidden', timeout: 10_000 });
    } catch {
      return {
        ok: false as const,
        error_key: 'modal_not_closed' as ErrorKey,
        message: '취소 클릭 후 textarea 가 hidden 안 됨',
      };
    }
    return { ok: true as const };
  },
};

test('상품 수집 → URL 수집 모달 열기 → 취소 → 모달 닫힘', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
