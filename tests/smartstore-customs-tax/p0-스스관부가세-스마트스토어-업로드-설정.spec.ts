/**
 * 스스관부가세 / 스마트스토어 업로드 설정 영역 P0 TC 묶음 (7건)
 * — 등록상품 상세 → [업로드 설정] 탭에서 관부가세/업로드 대상 마켓 섹션 real 검증.
 * 공유 핸들러: ./_customs-handlers
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandlers } from '../../lib/runner';
import {
  ensureRegisteredUploadTab,
  verifyUploadText,
  resetCustomsState,
} from './_customs-handlers';

const ATC_PATH = join(__dirname, '..', '..', "atcs", "smartstore-customs-tax", "p0-스스관부가세-스마트스토어-업로드-설정.atc.yml");

const handlers: StepHandlers = {
  "tc3494_화면-진입": ensureRegisteredUploadTab,
  "tc3499_업로드-대상-마켓": verifyUploadText(/업로드 대상 마켓/, 'upload_target_missing'),
  "tc3500_업로드-대상-마켓": verifyUploadText(/스마트스토어/, 'upload_target_smartstore_missing'),
  "tc3501_업로드-대상-마켓": verifyUploadText(/쿠팡/, 'upload_target_coupang_missing'),
  "tc3515_관부가세-설정": verifyUploadText(/관부가세 설정/, 'customs_section_missing'),
  "tc3516_관부가세-설정": verifyUploadText(/관부가세 포함/, 'customs_options_missing'),
  "tc3517_관부가세-설정": verifyUploadText(/관부가세 미포함/, 'customs_option_exclude_missing'),
};

test("스스관부가세 / 스마트스토어 업로드 설정 영역 P0 TC 묶음 (7건) — 등록상품 업로드설정 탭 real 검증", async ({ page }) => {
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
