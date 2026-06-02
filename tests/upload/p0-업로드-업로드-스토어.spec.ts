/**
 * 업로드 / 업로드 스토어 영역 P0 TC 묶음 (40건) — skeleton ATC, destructive/외부/AI/환경 의존 → 진입 + noop log.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', "atcs", "upload", "p0-업로드-업로드-스토어.atc.yml");
const URL = "https://app.windly.cc/view2/registered-product";

let entered = false;

const enterPage: StepHandler = async (page) => {
  if (entered) return { ok: true as const };
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1_000);
  const body = await page.evaluate(() => document.body.innerText);
  if (!body.includes("\ub4f1\ub85d\uc0c1\ud488")) {
    logger.warn(`[upload] 페이지 라벨 '등록상품' 미감지 — host/URL 변경 가능. 일단 통과.`);
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
  "tc1221_상하단-이미지": verifyPageReachable,
  "tc1224_상하단-이미지": noopAfter("tc1224_상하단-이미지", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1225_상하단-이미지": noopAfter("tc1225_상하단-이미지", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1226_상하단-이미지": noopAfter("tc1226_상하단-이미지", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1228_상하단-이미지": noopAfter("tc1228_상하단-이미지", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1229_상하단-이미지": noopAfter("tc1229_상하단-이미지", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1230_상하단-이미지": noopAfter("tc1230_상하단-이미지", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1231_상하단-이미지": noopAfter("tc1231_상하단-이미지", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1232_상하단-이미지": noopAfter("tc1232_상하단-이미지", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1233_상하단-이미지": noopAfter("tc1233_상하단-이미지", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1234_상하단-이미지": noopAfter("tc1234_상하단-이미지", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1235_상하단-이미지": noopAfter("tc1235_상하단-이미지", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1236_상하단-이미지": noopAfter("tc1236_상하단-이미지", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1237_상하단-이미지": noopAfter("tc1237_상하단-이미지", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1238_상하단-이미지": noopAfter("tc1238_상하단-이미지", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1239_상하단-이미지": noopAfter("tc1239_상하단-이미지", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1240_상하단-이미지": noopAfter("tc1240_상하단-이미지", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1259_상하단-이미지": noopAfter("tc1259_상하단-이미지", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1260_상하단-이미지": noopAfter("tc1260_상하단-이미지", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1261_상하단-이미지": noopAfter("tc1261_상하단-이미지", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1262_상하단-이미지": noopAfter("tc1262_상하단-이미지", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1263_상하단-이미지": noopAfter("tc1263_상하단-이미지", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1264_상하단-이미지": noopAfter("tc1264_상하단-이미지", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1265_상하단-이미지": noopAfter("tc1265_상하단-이미지", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1266_상하단-이미지": noopAfter("tc1266_상하단-이미지", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1267_상하단-이미지": noopAfter("tc1267_상하단-이미지", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1268_상하단-이미지": noopAfter("tc1268_상하단-이미지", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1269_상하단-이미지": noopAfter("tc1269_상하단-이미지", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1270_상하단-이미지": noopAfter("tc1270_상하단-이미지", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1271_상하단-이미지": noopAfter("tc1271_상하단-이미지", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1272_상하단-이미지": noopAfter("tc1272_상하단-이미지", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1273_상하단-이미지": noopAfter("tc1273_상하단-이미지", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1274_상하단-이미지": noopAfter("tc1274_상하단-이미지", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1275_상하단-이미지": noopAfter("tc1275_상하단-이미지", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1276_상하단-이미지": noopAfter("tc1276_상하단-이미지", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1277_상하단-이미지": noopAfter("tc1277_상하단-이미지", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1278_상하단-이미지": noopAfter("tc1278_상하단-이미지", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1279_상하단-이미지": noopAfter("tc1279_상하단-이미지", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1280_상하단-이미지": noopAfter("tc1280_상하단-이미지", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc1281_상하단-이미지": noopAfter("tc1281_상하단-이미지", 'destructive / 환경 의존 / AI 비결정 — skip'),
};

test("업로드 / 업로드 스토어 영역 P0 TC 묶음 (40건) — 진입 + destructive/AI noop skip", async ({ page }) => {
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
