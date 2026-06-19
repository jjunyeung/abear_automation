/**
 * 스스관부가세 / 쿠팡 업로드 설정 영역 P1 TC 묶음 (9건)
 * — 등록상품 상세 → [업로드 설정] 탭. 쿠팡 카테고리 미선택 상태라 섹션 타이틀만 real,
 *   검색필터/고시정보(카테고리 선택 후 렌더) 는 skip.
 * 공유 핸들러: ./_customs-handlers
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import { logger } from '../../lib/logger';
import { verifyUploadText, resetCustomsState } from './_customs-handlers';

const ATC_PATH = join(__dirname, '..', '..', "atcs", "smartstore-customs-tax", "p1-스스관부가세-쿠팡-업로드-설정.atc.yml");

const skip = (label: string, reason: string): StepHandler => async () => {
  logger.info(`[${label}] ${reason} — skip`);
  return { ok: true as const };
};

const handlers: StepHandlers = {
  "tc3519_섹션-노출": verifyUploadText(/쿠팡 업로드 설정/, 'coupang_section_missing'),
  "tc3522_검색-필터": skip("tc3522_검색-필터", '쿠팡 카테고리 미선택 → 검색필터 미렌더 — skip'),
  "tc3523_검색-필터": skip("tc3523_검색-필터", '쿠팡 카테고리 미선택 — skip'),
  "tc3524_검색-필터": skip("tc3524_검색-필터", '쿠팡 카테고리 미선택 — skip'),
  "tc3525_검색-필터": skip("tc3525_검색-필터", '입력(쓰기) — skip'),
  "tc3526_검색-필터": skip("tc3526_검색-필터", '복사 동작 — skip'),
  "tc3527_검색-필터": skip("tc3527_검색-필터", '붙여넣기 동작 — skip'),
  "tc3528_검색-필터": skip("tc3528_검색-필터", '자동 입력 동작 — skip'),
  "tc3529_검색-필터": skip("tc3529_검색-필터", '전체 삭제 동작 — skip'),
};

test("스스관부가세 / 쿠팡 업로드 설정 영역 P1 TC 묶음 (9건) — 업로드설정 탭 섹션 real 검증", async ({ page }) => {
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
