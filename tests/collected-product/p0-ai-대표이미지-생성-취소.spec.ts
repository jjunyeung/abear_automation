/**
 * AI 대표이미지 생성 / 취소 P0 (1건) — 모달 열고 "취소" → 닫힘 검증.
 *
 * 대응 ATC : atcs/collected-product/p0-ai-대표이미지-생성-취소.atc.yml
 *   - tc3716: 취소 버튼 클릭 시 대표이미지 교체 없이 모달 닫힘
 * 공유 모달 핸들러: ./_ai-image-modal-handlers
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandlers } from '../../lib/runner';
import { cancelAiImageModal } from './_ai-image-modal-handlers';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'collected-product', 'p0-ai-대표이미지-생성-취소.atc.yml');

const handlers: StepHandlers = {
  'tc3716_취소-버튼-클릭': cancelAiImageModal,
};

test('AI 대표이미지 취소 — 취소 클릭 시 모달 닫힘 (TC 3716)', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
