/**
 * 상품 수집 페이지 타오바오 버튼 popup 검증 — Playwright spec
 *
 * 대응 ATC: atcs/collect/import-direct-taobao-popup.atc.yml
 * Helper: lib/windly-actions.ts > verifySourcingMallPopup
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
  goToCollectImportMenu,
  verifySourcingMallPopup,
} from '../../lib/windly-actions';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'collect',
  'import-direct-taobao-popup.atc.yml',
);

const openCollectMenuStep: StepHandler = async (page) => {
  await goToCollectImportMenu(page);
  return { ok: true as const };
};

const clickTaobaoVerifyPopupStep: StepHandler = async (page) => {
  const r = await verifySourcingMallPopup(page, '타오바오', /(^|\.)taobao\.com$/i);
  if (r.ok) return { ok: true as const };
  return {
    ok: false as const,
    error_key: r.error_key as ErrorKey,
    message: r.message,
  };
};

const handlers: StepHandlers = {
  open_collect_menu: openCollectMenuStep,
  click_taobao_verify_popup: clickTaobaoVerifyPopupStep,
};

test('상품 수집 - 타오바오 버튼 새 창 popup 검증', async ({ page }) => {
  test.setTimeout(3 * 60_000);

  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
