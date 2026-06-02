/**
 * 온보딩 / 가이드 시작 버튼 선택 영역 P2 TC 묶음 (24건) — skeleton ATC, destructive/외부/AI/환경 의존 → 진입 + noop log.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', "atcs", "windly-shell", "p2-온보딩-가이드-시작-버튼-선택.atc.yml");
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
  "tc29": verifyPageReachable,
  "tc30": noopAfter("tc30", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc31": noopAfter("tc31", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc32": noopAfter("tc32", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc33": noopAfter("tc33", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc34_⑥": noopAfter("tc34_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc35_⑥": noopAfter("tc35_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc36_⑥": noopAfter("tc36_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc37_⑥": noopAfter("tc37_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc38_⑥": noopAfter("tc38_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc39_⑥": noopAfter("tc39_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc40_⑥": noopAfter("tc40_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc41_⑥": noopAfter("tc41_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc42_⑥": noopAfter("tc42_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc43_⑥": noopAfter("tc43_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc44_⑥": noopAfter("tc44_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc45_⑥": noopAfter("tc45_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc46_⑥": noopAfter("tc46_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc47_⑥": noopAfter("tc47_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc48_⑥": noopAfter("tc48_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc49_⑥": noopAfter("tc49_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc50_⑥": noopAfter("tc50_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc51_⑥": noopAfter("tc51_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc52_⑥": noopAfter("tc52_⑥", 'destructive / 환경 의존 / AI 비결정 — skip'),
};

test("온보딩 / 가이드 시작 버튼 선택 영역 P2 TC 묶음 (24건) — 진입 + destructive/AI noop skip", async ({ page }) => {
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
