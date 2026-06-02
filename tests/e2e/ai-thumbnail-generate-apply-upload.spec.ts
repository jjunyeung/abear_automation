/**
 * G3. AI 대표이미지 생성 진입 smoke (e2e)
 * 실제 생성은 크레딧 차감 → 진입까지만 검증.
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
import { aiRecommendNameHandlers } from '../collected-product/_ai-recommend-name-handlers';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'e2e', 'ai-thumbnail-generate-apply-upload.atc.yml');

const openImageTabStep: StepHandler = async (page) => {
  const tab = page.getByRole('button', { name: /^이미지$/ }).first();
  try {
    await tab.waitFor({ state: 'visible', timeout: 10_000 });
    await tab.click();
    await page.waitForTimeout(2_000);
    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error_key: 'image_tab_not_found' as ErrorKey,
      message: '이미지 탭 미발견',
    };
  }
};

const verifyAiThumbStep: StepHandler = async (page) => {
  const sig = page.getByText(/AI\s*대표이미지|AI\s*이미지|대표이미지\s*생성/, { exact: false }).first();
  try {
    await sig.waitFor({ state: 'visible', timeout: 10_000 });
    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error_key: 'ai_thumbnail_signature_missing' as ErrorKey,
      message: 'AI 대표이미지 영역 시그니처 미발견',
    };
  }
};

const handlers: StepHandlers = {
  open_collected_list: aiRecommendNameHandlers['open_collected_list']!,
  open_first_product: aiRecommendNameHandlers['open_first_product']!,
  open_image_tab: openImageTabStep,
  verify_ai_thumbnail_visible: verifyAiThumbStep,
};

test('AI 대표이미지 영역 진입 smoke (e2e)', async ({ page }) => {
  test.setTimeout(5 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
