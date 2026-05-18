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
  'import-direct-amazon-de-popup.atc.yml',
);

const handlers: StepHandlers = {
  open_collect_menu: async (page) => {
    await goToCollectImportMenu(page);
    return { ok: true as const };
  },
  click_mall_verify_popup: async (page) => {
    const r = await verifySourcingMallPopup(page, '독일', /(^|\.)amazon\.de$/i);
    if (r.ok) return { ok: true as const };
    return { ok: false as const, error_key: r.error_key as ErrorKey, message: r.message };
  },
};

test('상품 수집 - 독일 버튼 새 창 popup 검증', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
