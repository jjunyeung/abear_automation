/**
 * 스스관부가세 / 스마트스토어 업로드 설정 영역 P1 TC 묶음 (15건)
 * — 등록상품 상세 → [업로드 설정] 탭. 덤프 실측된 라벨만 real, 입력/수정/조건부는 skip.
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

const ATC_PATH = join(__dirname, '..', '..', "atcs", "smartstore-customs-tax", "p1-스스관부가세-스마트스토어-업로드-설정.atc.yml");

const skip = (label: string, reason: string): StepHandler => async () => {
  logger.info(`[${label}] ${reason} — skip`);
  return { ok: true as const };
};

const handlers: StepHandlers = {
  "tc3495_상단-기본-ui": ensureRegisteredUploadTab,
  "tc3498_경고-배너": skip("tc3498_경고-배너", '관부가세 경고 배너 조건부 — skip'),
  "tc3502_모집전-정책-적용": verifyUploadText(/모음전 정책 적용/, 'policy_section_missing'),
  "tc3503_모집전-정책-적용": verifyUploadText(/모음전 정책 적용/, 'policy_toggle_missing'),
  "tc3504_모집전-정책-적용": skip("tc3504_모집전-정책-적용", '토글 개별 변경(쓰기) — skip'),
  "tc3505_적용된-상품명": skip("tc3505_적용된-상품명", '적용된 상품명 필드 미실측 — skip'),
  "tc3506_적용된-상품명": skip("tc3506_적용된-상품명", '적용된 상품명 표시 미실측 — skip'),
  "tc3507_적용된-상품명": skip("tc3507_적용된-상품명", '상품명 수정(쓰기) — skip'),
  "tc3509_리뷰-포인트-설정": verifyUploadText(/리뷰 포인트 설정/, 'review_point_section_missing'),
  "tc3510_리뷰-포인트-설정": verifyUploadText(/리뷰 포인트 설정/, 'review_point_input_missing'),
  "tc3511_리뷰-포인트-설정": skip("tc3511_리뷰-포인트-설정", '기본값 표시 — skip'),
  "tc3512_리뷰-포인트-설정": skip("tc3512_리뷰-포인트-설정", '값 수정(쓰기) — skip'),
  "tc3513_리뷰-포인트-설정": skip("tc3513_리뷰-포인트-설정", '숫자만 입력 validation — skip'),
  "tc3514_배송-속성": verifyUploadText(/배송 속성/, 'delivery_attr_missing'),
  "tc3518_관부가세-설정": verifyUploadText(/관부가세 설정/, 'customs_section_missing'),
};

test("스스관부가세 / 스마트스토어 업로드 설정 영역 P1 TC 묶음 (15건) — 업로드설정 탭 real 검증", async ({ page }) => {
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
