/**
 * 스스관부가세 / 스마트스토어 업로드 설정 영역 P2 TC 묶음 (3건)
 * — 등록상품 상세 → [업로드 설정] 탭. 탭/상품코드 노출 real, 옵션가 기준(미실측)은 skip.
 * 공유 핸들러: ./_customs-handlers
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import { logger } from '../../lib/logger';
import {
  ensureRegisteredUploadTab,
  verifyUploadText,
  resetCustomsState,
} from './_customs-handlers';

const ATC_PATH = join(__dirname, '..', '..', "atcs", "smartstore-customs-tax", "p2-스스관부가세-스마트스토어-업로드-설정.atc.yml");

const skip = (label: string, reason: string): StepHandler => async () => {
  logger.info(`[${label}] ${reason} — skip`);
  return { ok: true as const };
};

const handlers: StepHandlers = {
  "tc3496_상단-탭": ensureRegisteredUploadTab,
  "tc3497_상품-식별-정보": verifyUploadText(/상품코드/, 'product_code_missing'),
  "tc3508_옵션가-기준": skip("tc3508_옵션가-기준", '옵션가 기준 영역 미실측(조건부) — skip'),
};

test("스스관부가세 / 스마트스토어 업로드 설정 영역 P2 TC 묶음 (3건) — 업로드설정 탭 real 검증", async ({ page }) => {
  test.setTimeout(3 * 60_000);
  resetCustomsState();
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
