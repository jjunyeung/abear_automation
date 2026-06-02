/**
 * B7. AI 번역 설정 페이지 smoke (e2e)
 * 라쿠텐 수집 + 번역 결과 검증까지는 URL 풀 + 시간 비용 큼 → 설정 페이지 마운트까지만.
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

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'e2e', 'verify-ai-translation-on-product.atc.yml');

const openStep: StepHandler = async (page) => {
  await page.goto(
    'https://app.windly.cc/view3/base-setting?setting=COMMON&category=AI_TRANSLATION',
    { waitUntil: 'domcontentloaded', timeout: 30_000 },
  );
  await page.waitForTimeout(2_500);
  return { ok: true as const };
};

const verifyStep: StepHandler = async (page) => {
  const sig = page.getByText(/번역|AI/, { exact: false }).first();
  try {
    await sig.waitFor({ state: 'visible', timeout: 10_000 });
    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error_key: 'ai_translation_signature_missing' as ErrorKey,
      message: 'AI 번역 설정 시그니처 미발견',
    };
  }
};

const handlers: StepHandlers = {
  open_ai_translation_setting: openStep,
  verify_setting_visible: verifyStep,
};

test('AI 번역 베이스세팅 smoke (e2e)', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
