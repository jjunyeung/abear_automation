/**
 * 스스관부가세 / 스마트스토어 배송 및 A/S 영역 P2 TC 묶음 (3건)
 * — 업로드 설정 탭의 "배송 속성" 섹션만 real (덤프 실측), 마켓 탭/좌측 서브메뉴(별도 화면)는 skip.
 * 공유 핸들러: ./_customs-handlers
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import { logger } from '../../lib/logger';
import { verifyUploadText, resetCustomsState } from './_customs-handlers';

const ATC_PATH = join(__dirname, '..', '..', "atcs", "smartstore-customs-tax", "p2-스스관부가세-스마트스토어-배송-및-as.atc.yml");

const skip = (label: string, reason: string): StepHandler => async () => {
  logger.info(`[${label}] ${reason} — skip`);
  return { ok: true as const };
};

const handlers: StepHandlers = {
  "tc3469_상단-마켓-탭": skip("tc3469_상단-마켓-탭", '배송/AS 별도 화면 마켓 탭 미실측 — skip'),
  "tc3470_좌측-서브-메뉴": skip("tc3470_좌측-서브-메뉴", '배송/AS 별도 화면 서브메뉴 미실측 — skip'),
  "tc3481_배송-속성": verifyUploadText(/배송 속성/, 'delivery_attr_missing'),
};

test("스스관부가세 / 스마트스토어 배송 및 A/S 영역 P2 TC 묶음 (3건) — 배송 속성 real 검증", async ({ page }) => {
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
