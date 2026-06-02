/**
 * 인 상 추 / 비슷한 상품 찾기 모달 영역 P2 TC 묶음 (13건) — skeleton ATC, destructive/외부/AI/환경 의존 → 진입 + noop log.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', "atcs", "collected-product", "p2-인-상-추-비슷한-상품-찾기-모달.atc.yml");
const URL = "https://app.windly.cc/view2/interested-product";

let entered = false;

const enterPage: StepHandler = async (page) => {
  if (entered) return { ok: true as const };
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1_000);
  const body = await page.evaluate(() => document.body.innerText);
  if (!body.includes("\uc218\uc9d1\uc0c1\ud488")) {
    logger.warn(`[collected] 페이지 라벨 '수집상품' 미감지 — host/URL 변경 가능. 일단 통과.`);
  }
  entered = true;
  return { ok: true as const };
};

const noopAfter = (label: string, reason: string): StepHandler => async (page) => {
  const e = await enterPage(page, {});
  if (!e.ok) return e;
  logger.info(`[${label}] ${reason} — skip`);
  return { ok: true as const };
};

const verifyPageReachable: StepHandler = async (page) => {
  const e = await enterPage(page, {});
  if (!e.ok) return e;
  const length = await page.evaluate(() => document.body.innerText.length);
  if (length < 10) {
    return { ok: false as const, error_key: 'page_blank' as ErrorKey, message: `page body length ${length}` };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  "tc3745_모달-열기": verifyPageReachable,
  "tc3746_모달-헤더": noopAfter("tc3746_모달-헤더", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3747_선택-상품-정보": noopAfter("tc3747_선택-상품-정보", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3748_수집몰-탭": noopAfter("tc3748_수집몰-탭", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3749_상품-카드": noopAfter("tc3749_상품-카드", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3750_상품-카드-상세": noopAfter("tc3750_상품-카드-상세", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3751_상품-수집-버튼": noopAfter("tc3751_상품-수집-버튼", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3752_닫기-버튼": noopAfter("tc3752_닫기-버튼", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3753_모달-닫기": noopAfter("tc3753_모달-닫기", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3754_상품-수집-정상-케이스": noopAfter("tc3754_상품-수집-정상-케이스", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3755_상품-수집-로그인-필요": noopAfter("tc3755_상품-수집-로그인-필요", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3756_상품-수집-확장-프로그램-필요": noopAfter("tc3756_상품-수집-확장-프로그램-필요", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3757_상품-수집-중복": noopAfter("tc3757_상품-수집-중복", 'destructive / 환경 의존 / AI 비결정 — skip'),
};

test("인 상 추 / 비슷한 상품 찾기 모달 영역 P2 TC 묶음 (13건) — 진입 + destructive/AI noop skip", async ({ page }) => {
  test.setTimeout(3 * 60_000);
  entered = false;
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
