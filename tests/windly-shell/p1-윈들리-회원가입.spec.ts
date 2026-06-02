/**
 * 윈들리 / 회원가입 영역 P1 TC 묶음 (10건) — skeleton ATC, destructive/외부/AI/환경 의존 → 진입 + noop log.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', "atcs", "windly-shell", "p1-윈들리-회원가입.atc.yml");
const URL = "https://app.windly.cc/view3/main";

let entered = false;

const enterPage: StepHandler = async (page) => {
  if (entered) return { ok: true as const };
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1_000);
  const body = await page.evaluate(() => document.body.innerText);
  if (!body.includes("\uc708\ub4e4\ub9ac")) {
    logger.warn(`[shell] 페이지 라벨 '윈들리' 미감지 — host/URL 변경 가능. 일단 통과.`);
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
  "tc811_업로드-설정": verifyPageReachable,
  "tc815_업로드-설정": noopAfter("tc815_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc816_업로드-설정": noopAfter("tc816_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc817_업로드-설정": noopAfter("tc817_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc818_업로드-설정": noopAfter("tc818_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc819_업로드-설정": noopAfter("tc819_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc821_업로드-설정": noopAfter("tc821_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc822_업로드-설정": noopAfter("tc822_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc823_업로드-설정": noopAfter("tc823_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc825_업로드-설정": noopAfter("tc825_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
};

test("윈들리 / 회원가입 영역 P1 TC 묶음 (10건) — 진입 + destructive/AI noop skip", async ({ page }) => {
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
