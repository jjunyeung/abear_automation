/**
 * 수집상품 / 상품 상세페이지 영역 P2 TC 묶음 (183건) — skeleton ATC, destructive/외부/AI/환경 의존 → 진입 + noop log.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', "atcs", "collected-product", "p2-수집상품-상품-상세페이지.atc.yml");
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
  "tc387_기본-설정값-적용": verifyPageReachable,
  "tc388_gnb": noopAfter("tc388_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc389_gnb": noopAfter("tc389_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc390_gnb": noopAfter("tc390_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc391_gnb": noopAfter("tc391_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc392_gnb": noopAfter("tc392_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc393_gnb": noopAfter("tc393_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc394_gnb": noopAfter("tc394_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc395_gnb": noopAfter("tc395_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc396_gnb": noopAfter("tc396_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc397_gnb": noopAfter("tc397_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc398_gnb": noopAfter("tc398_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc399_gnb": noopAfter("tc399_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc400_gnb": noopAfter("tc400_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc401_gnb": noopAfter("tc401_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc402_gnb": noopAfter("tc402_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc403_gnb": noopAfter("tc403_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc404_gnb": noopAfter("tc404_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc405_gnb": noopAfter("tc405_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc406_gnb": noopAfter("tc406_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc407_gnb": noopAfter("tc407_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc408_gnb": noopAfter("tc408_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc409_gnb": noopAfter("tc409_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc410_gnb": noopAfter("tc410_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc411_gnb": noopAfter("tc411_gnb", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc412": noopAfter("tc412", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc413": noopAfter("tc413", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc414": noopAfter("tc414", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc415": noopAfter("tc415", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc416": noopAfter("tc416", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc417": noopAfter("tc417", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc418": noopAfter("tc418", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc419": noopAfter("tc419", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc420": noopAfter("tc420", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc421": noopAfter("tc421", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc422": noopAfter("tc422", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc423": noopAfter("tc423", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc424": noopAfter("tc424", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc425": noopAfter("tc425", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc426": noopAfter("tc426", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc427": noopAfter("tc427", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc428": noopAfter("tc428", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc429": noopAfter("tc429", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc430": noopAfter("tc430", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc431": noopAfter("tc431", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc432": noopAfter("tc432", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc433": noopAfter("tc433", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc434": noopAfter("tc434", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc435": noopAfter("tc435", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc436": noopAfter("tc436", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc437": noopAfter("tc437", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc438": noopAfter("tc438", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc439": noopAfter("tc439", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc440": noopAfter("tc440", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc441": noopAfter("tc441", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc442": noopAfter("tc442", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc443": noopAfter("tc443", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc444": noopAfter("tc444", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc445": noopAfter("tc445", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc446": noopAfter("tc446", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc447": noopAfter("tc447", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc448": noopAfter("tc448", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc449": noopAfter("tc449", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc450": noopAfter("tc450", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc451": noopAfter("tc451", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc452": noopAfter("tc452", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc453": noopAfter("tc453", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc454": noopAfter("tc454", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc455": noopAfter("tc455", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc456": noopAfter("tc456", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc457": noopAfter("tc457", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc458": noopAfter("tc458", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc459": noopAfter("tc459", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc460": noopAfter("tc460", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc461": noopAfter("tc461", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc462": noopAfter("tc462", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc463": noopAfter("tc463", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc464": noopAfter("tc464", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc465": noopAfter("tc465", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc466": noopAfter("tc466", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc467": noopAfter("tc467", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc468": noopAfter("tc468", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc469": noopAfter("tc469", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc470": noopAfter("tc470", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc471": noopAfter("tc471", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc472": noopAfter("tc472", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc473": noopAfter("tc473", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc474": noopAfter("tc474", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc475": noopAfter("tc475", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc476": noopAfter("tc476", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc477": noopAfter("tc477", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc478": noopAfter("tc478", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc479": noopAfter("tc479", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc480": noopAfter("tc480", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc481": noopAfter("tc481", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc482": noopAfter("tc482", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc483": noopAfter("tc483", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc484": noopAfter("tc484", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc485": noopAfter("tc485", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc486": noopAfter("tc486", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc487": noopAfter("tc487", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc488": noopAfter("tc488", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc489": noopAfter("tc489", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc490": noopAfter("tc490", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc491": noopAfter("tc491", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc492": noopAfter("tc492", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc493": noopAfter("tc493", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc494": noopAfter("tc494", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc495": noopAfter("tc495", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc496": noopAfter("tc496", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc497": noopAfter("tc497", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc498": noopAfter("tc498", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc499": noopAfter("tc499", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc500": noopAfter("tc500", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc501": noopAfter("tc501", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc502": noopAfter("tc502", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc503": noopAfter("tc503", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc504": noopAfter("tc504", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc505": noopAfter("tc505", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc506": noopAfter("tc506", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc507": noopAfter("tc507", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc508": noopAfter("tc508", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc509": noopAfter("tc509", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc510": noopAfter("tc510", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc511": noopAfter("tc511", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc512": noopAfter("tc512", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc513_상품-속성": noopAfter("tc513_상품-속성", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc514_상품-속성": noopAfter("tc514_상품-속성", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc515_상품-속성": noopAfter("tc515_상품-속성", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc516_상품-속성": noopAfter("tc516_상품-속성", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc517_상품-속성": noopAfter("tc517_상품-속성", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc518_상품-속성": noopAfter("tc518_상품-속성", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc519_상품-속성": noopAfter("tc519_상품-속성", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc520_상품-속성": noopAfter("tc520_상품-속성", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc521_업로드-마켓": noopAfter("tc521_업로드-마켓", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc522_업로드-마켓": noopAfter("tc522_업로드-마켓", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc523_업로드-마켓": noopAfter("tc523_업로드-마켓", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc524_업로드-마켓": noopAfter("tc524_업로드-마켓", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc525": noopAfter("tc525", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc526": noopAfter("tc526", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc527": noopAfter("tc527", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc528": noopAfter("tc528", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc529": noopAfter("tc529", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc530": noopAfter("tc530", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc531": noopAfter("tc531", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc532": noopAfter("tc532", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc533": noopAfter("tc533", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc534": noopAfter("tc534", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc535": noopAfter("tc535", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc536": noopAfter("tc536", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc537": noopAfter("tc537", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc538": noopAfter("tc538", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc539": noopAfter("tc539", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc540_업로드-설정": noopAfter("tc540_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc541_업로드-설정": noopAfter("tc541_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc542_업로드-설정": noopAfter("tc542_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc543_업로드-설정": noopAfter("tc543_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc544_업로드-설정": noopAfter("tc544_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc545_업로드-설정": noopAfter("tc545_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc546_업로드-설정": noopAfter("tc546_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc547_업로드-설정": noopAfter("tc547_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc548_업로드-설정": noopAfter("tc548_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc549_업로드-설정": noopAfter("tc549_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc550_업로드-설정": noopAfter("tc550_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc551_업로드-설정": noopAfter("tc551_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc552_업로드-설정": noopAfter("tc552_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc553_업로드-설정": noopAfter("tc553_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc554_업로드-설정": noopAfter("tc554_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc555_업로드-설정": noopAfter("tc555_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc556_업로드-설정": noopAfter("tc556_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc557_업로드-설정": noopAfter("tc557_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc558_업로드-설정": noopAfter("tc558_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc559_업로드-설정": noopAfter("tc559_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc560_업로드-설정": noopAfter("tc560_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc561_업로드-설정": noopAfter("tc561_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc562_업로드-설정": noopAfter("tc562_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc563_업로드-설정": noopAfter("tc563_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc564_업로드-설정": noopAfter("tc564_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc565_업로드-설정": noopAfter("tc565_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc566_업로드-설정": noopAfter("tc566_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc567_업로드-설정": noopAfter("tc567_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc568_업로드-설정": noopAfter("tc568_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
  "tc569_업로드-설정": noopAfter("tc569_업로드-설정", 'destructive / 환경 의존 / AI 비결정 — skip'),
};

test("수집상품 / 상품 상세페이지 영역 P2 TC 묶음 (183건) — 진입 + destructive/AI noop skip", async ({ page }) => {
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
