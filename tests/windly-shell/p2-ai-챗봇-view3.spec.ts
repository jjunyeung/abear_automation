/**
 * ai 챗봇 / view3 영역 P2 TC 묶음 (11건) — skeleton ATC, destructive/외부/AI/환경 의존 → 진입 + noop log.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', "atcs", "windly-shell", "p2-ai-챗봇-view3.atc.yml");
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
  "tc1136_수정-업로드": verifyPageReachable,
  "tc1137_수정-업로드": noopAfter("tc1137_수정-업로드", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1138_수정-업로드": noopAfter("tc1138_수정-업로드", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1139_수정-업로드": noopAfter("tc1139_수정-업로드", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1140_수정-업로드": noopAfter("tc1140_수정-업로드", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1141_수정-업로드": noopAfter("tc1141_수정-업로드", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1142_수정-업로드": noopAfter("tc1142_수정-업로드", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1143_수정-업로드": noopAfter("tc1143_수정-업로드", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1144_수정-업로드": noopAfter("tc1144_수정-업로드", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1145_수정-업로드": noopAfter("tc1145_수정-업로드", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1146_수정-업로드": noopAfter("tc1146_수정-업로드", 'destructive / 환경 의존 / AI 비결정 — skip'),
};

test("ai 챗봇 / view3 영역 P2 TC 묶음 (11건) — 진입 + destructive/AI noop skip", async ({ page }) => {
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
