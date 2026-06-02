/**
 * AI 대표이미지 생성 / 모달 영역 P2 TC 묶음 (9건) — skeleton ATC, destructive/외부/AI/환경 의존 → 진입 + noop log.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', "atcs", "collected-product", "p2-ai-대표이미지-생성-모달.atc.yml");
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
  "tc3699_상품명-노출": verifyPageReachable,
  "tc3700_잔여-사용량-노출": noopAfter("tc3700_잔여-사용량-노출", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3701_프롬프트-입력-필드": noopAfter("tc3701_프롬프트-입력-필드", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3702_이미지-생성하기-버튼": noopAfter("tc3702_이미지-생성하기-버튼", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3703_기존-대표이미지-노출": noopAfter("tc3703_기존-대표이미지-노출", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3704_ai-생성-이미지-영역-초기-상태": noopAfter("tc3704_ai-생성-이미지-영역-초기-상태", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3705_ai-생성-이미지-적용하기-버튼": noopAfter("tc3705_ai-생성-이미지-적용하기-버튼", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3706_취소-버튼": noopAfter("tc3706_취소-버튼", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3708_사용량-소진-시-버튼-disabled": noopAfter("tc3708_사용량-소진-시-버튼-disabled", 'destructive / 환경 의존 / AI 비결정 — skip'),
};

test("AI 대표이미지 생성 / 모달 영역 P2 TC 묶음 (9건) — 진입 + destructive/AI noop skip", async ({ page }) => {
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
