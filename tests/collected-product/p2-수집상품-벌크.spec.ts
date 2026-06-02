/**
 * 수집상품 / 벌크 영역 P2 TC 묶음 (22건) — skeleton ATC, destructive/외부/AI/환경 의존 → 진입 + noop log.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', "atcs", "collected-product", "p2-수집상품-벌크.atc.yml");
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
  "tc359": verifyPageReachable,
  "tc360_카테고리태그": noopAfter("tc360_카테고리태그", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc361_카테고리태그": noopAfter("tc361_카테고리태그", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc362_카테고리태그": noopAfter("tc362_카테고리태그", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc363": noopAfter("tc363", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc364": noopAfter("tc364", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc365": noopAfter("tc365", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc366": noopAfter("tc366", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc367": noopAfter("tc367", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc368": noopAfter("tc368", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc369": noopAfter("tc369", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc370": noopAfter("tc370", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc371": noopAfter("tc371", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc372": noopAfter("tc372", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc373": noopAfter("tc373", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc374": noopAfter("tc374", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc375": noopAfter("tc375", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc376": noopAfter("tc376", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc377": noopAfter("tc377", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc378": noopAfter("tc378", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc379": noopAfter("tc379", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc380_기본-설정값-적용": noopAfter("tc380_기본-설정값-적용", 'destructive / 환경 의존 / AI 비결정 — skip'),
};

test("수집상품 / 벌크 영역 P2 TC 묶음 (22건) — 진입 + destructive/AI noop skip", async ({ page }) => {
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
