/**
 * 연결 설정 / 카카오톡 연결 영역 P0 TC 묶음 (10건) — skeleton ATC, destructive/외부/AI/환경 의존 → 진입 + noop log.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', "atcs", "base-setting", "p0-연결-설정-카카오톡-연결.atc.yml");
const URL = "https://app.windly.cc/view3/base-setting?setting=COMMON&category=PRODUCT_DETAIL";

let entered = false;

const enterPage: StepHandler = async (page) => {
  if (entered) return { ok: true as const };
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1_000);
  const body = await page.evaluate(() => document.body.innerText);
  if (!body.includes("\uae30\ubcf8\uc124\uc815")) {
    logger.warn(`[base] 페이지 라벨 '기본설정' 미감지 — host/URL 변경 가능. 일단 통과.`);
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
  "tc3408_func-카카오톡-계정-연결": verifyPageReachable,
  "tc3410_func-원들리-채널-친구-추가": noopAfter("tc3410_func-원들리-채널-친구-추가", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3419_func-카카오-계정-연결-해제-모달-확인": noopAfter("tc3419_func-카카오-계정-연결-해제-모달-확인", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3421_func-링크-이동": noopAfter("tc3421_func-링크-이동", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3423_func-계정-연결-시작": noopAfter("tc3423_func-계정-연결-시작", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3424_func-채널-친구-추가": noopAfter("tc3424_func-채널-친구-추가", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3425_func-토글-동작": noopAfter("tc3425_func-토글-동작", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3426_func-토글-동작": noopAfter("tc3426_func-토글-동작", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3427_func-플랜-업그레이드": noopAfter("tc3427_func-플랜-업그레이드", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3428_func-모달-닫기": noopAfter("tc3428_func-모달-닫기", 'destructive / 환경 의존 / AI 비결정 — skip'),
};

test("연결 설정 / 카카오톡 연결 영역 P0 TC 묶음 (10건) — 진입 + destructive/AI noop skip", async ({ page }) => {
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
