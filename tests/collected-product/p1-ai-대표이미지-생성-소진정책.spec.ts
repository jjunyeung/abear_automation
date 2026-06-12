/**
 * AI 대표이미지 생성 / 소진정책 P1 (2건) — 사용량 소진(0회) 환경에서 real 검증.
 *
 * 대응 ATC : atcs/collected-product/p1-ai-대표이미지-생성-소진정책.atc.yml
 *   - tc3723: 소진 상태에서도 모달 접속 가능
 *   - tc3724: 소진 상태에서 "이미지 생성" 버튼 비활성
 * 공유 모달 핸들러: ./_ai-image-modal-handlers
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandlers } from '../../lib/runner';
import {
  verifyAiModalText,
  verifyAiGenerateDisabled,
} from './_ai-image-modal-handlers';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'collected-product', 'p1-ai-대표이미지-생성-소진정책.atc.yml');

const handlers: StepHandlers = {
  'tc3723_사용량-소진-시-모달-접속-가능': verifyAiModalText(/내 상품을 위한 대표이미지 디자인/, 'ai_modal_inaccessible_when_exhausted'),
  'tc3724_사용량-소진-시-이미지-생성하기-버튼-비활성': verifyAiGenerateDisabled,
};

test('AI 대표이미지 소진정책 — 모달 접속 가능 + 생성 버튼 비활성 (TC 3723/3724)', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
