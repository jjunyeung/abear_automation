/**
 * AI 대표이미지 생성 / 이미지탭 P0 (2건) — 수집상품 모달 오픈 real, 등록상품 진입은 noop.
 *
 * 대응 ATC : atcs/collected-product/p0-ai-대표이미지-생성-이미지탭.atc.yml
 *   - tc3710: 수집상품에서 AI 대표이미지 생성 버튼 → 모달 오픈 (real)
 *   - tc3711: 등록상품에서 모달 오픈 (진입 경로 상이 → noop)
 * 공유 모달 핸들러: ./_ai-image-modal-handlers
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import { logger } from '../../lib/logger';
import { ensureAiImageModalFromCollected } from './_ai-image-modal-handlers';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'collected-product', 'p0-ai-대표이미지-생성-이미지탭.atc.yml');

const skipStep = (label: string, reason: string): StepHandler => async () => {
  logger.info(`[${label}] ${reason} — skip`);
  return { ok: true as const };
};

const handlers: StepHandlers = {
  'tc3710_수집상품-모달-오픈': ensureAiImageModalFromCollected,
  'tc3711_등록상품-모달-오픈': skipStep('tc3711_등록상품-모달-오픈', '등록상품 상세 진입 경로 별도 — skip'),
};

test('AI 대표이미지 이미지탭 — 수집상품 모달 오픈 (TC 3710, 3711)', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
