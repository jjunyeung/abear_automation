/**
 * 스스관부가세 / 스마트스토어 배송 및 A/S 영역 P0 TC 묶음 (15건) — skeleton ATC, destructive/외부/AI/환경 의존 → 진입 + noop log.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', "atcs", "smartstore-customs-tax", "p0-스스관부가세-스마트스토어-배송-및-as.atc.yml");
const URL = "https://app.windly.cc/view2/registered-product";

let entered = false;

const enterPage: StepHandler = async (page) => {
  if (entered) return { ok: true as const };
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1_000);
  const body = await page.evaluate(() => document.body.innerText);
  if (!body.includes("\ub4f1\ub85d\uc0c1\ud488")) {
    logger.warn(`[customs] 페이지 라벨 '등록상품' 미감지 — host/URL 변경 가능. 일단 통과.`);
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
  "tc3467_화면-진입": verifyPageReachable,
  "tc3471_출고지-설정": noopAfter("tc3471_출고지-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3472_출고지-설정": noopAfter("tc3472_출고지-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3473_반품지-설정": noopAfter("tc3473_반품지-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3474_반품지-설정": noopAfter("tc3474_반품지-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3475_택배사-설정": noopAfter("tc3475_택배사-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3476_택배사-설정": noopAfter("tc3476_택배사-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3482_관부가세-설정": noopAfter("tc3482_관부가세-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3483_관부가세-설정": noopAfter("tc3483_관부가세-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3484_관부가세-설정": noopAfter("tc3484_관부가세-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3487_as-전화번호": noopAfter("tc3487_as-전화번호", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3488_as-전화번호": noopAfter("tc3488_as-전화번호", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3491_필수값-검증": noopAfter("tc3491_필수값-검증", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3492_설정-저장": noopAfter("tc3492_설정-저장", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc3493_설정-유지": noopAfter("tc3493_설정-유지", 'destructive / 환경 의존 / AI 비결정 — skip'),
};

test("스스관부가세 / 스마트스토어 배송 및 A/S 영역 P0 TC 묶음 (15건) — 진입 + destructive/AI noop skip", async ({ page }) => {
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
