/**
 * J2. AI 전세계 상품 수집 모달 smoke (e2e)
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

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'e2e', 'ai-global-collect-modal-send.atc.yml');

const openMenuStep: StepHandler = async (page) => {
  await goToCollectImportMenu(page);
  return { ok: true as const };
};

const openAiGlobalStep: StepHandler = async (page) => {
  const card = page.getByText(/AI\s*전세계|글로벌|global/i).first();
  try {
    await card.waitFor({ state: 'visible', timeout: 10_000 });
    await card.click();
    await page.waitForTimeout(2_000);
    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error_key: 'ai_global_card_not_found' as ErrorKey,
      message: 'AI 전세계 카드 미발견',
    };
  }
};

const verifyStep: StepHandler = async (page) => {
  const sig = page.getByText(/AI|전세계|글로벌|키워드|검색/i).first();
  try {
    await sig.waitFor({ state: 'visible', timeout: 10_000 });
    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error_key: 'ai_global_modal_missing' as ErrorKey,
      message: 'AI 전세계 모달 시그니처 미발견',
    };
  }
};

const handlers: StepHandlers = {
  open_collect_menu: openMenuStep,
  open_ai_global_card: openAiGlobalStep,
  verify_modal_visible: verifyStep,
};

test('AI 전세계 상품 수집 모달 smoke (e2e)', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
