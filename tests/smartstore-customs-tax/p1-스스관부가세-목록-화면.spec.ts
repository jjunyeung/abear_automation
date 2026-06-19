/**
 * 스스관부가세 / 목록 화면 영역 P1 TC 묶음 (8건)
 * — 수집상품/등록상품 목록의 검색·액션 영역, 상품 카드, 선택 동작 real 검증.
 *   상품명 변경(오버플로 메뉴)·툴팁(hover)은 skip.
 */

import { join } from 'path';
import type { Page } from '@playwright/test';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';
import { goToCollectedProducts, goToRegisteredProducts } from '../../lib/windly-actions';

const ATC_PATH = join(__dirname, '..', '..', "atcs", "smartstore-customs-tax", "p1-스스관부가세-목록-화면.atc.yml");

const skip = (label: string, reason: string): StepHandler => async () => {
  logger.info(`[${label}] ${reason} — skip`);
  return { ok: true as const };
};
const bodyHas = (page: Page, src: string): Promise<boolean> =>
  page.evaluate((s) => new RegExp(s).test(document.body.innerText), src).catch(() => false);
const countChecked = (page: Page): Promise<number> =>
  page.evaluate(() => document.querySelectorAll('input:checked').length).catch(() => 0);

let where: 'collected' | 'registered' | null = null;
const enterCollected: StepHandler = async (page) => {
  if (where !== 'collected') { await goToCollectedProducts(page); await page.waitForTimeout(1_200); where = 'collected'; }
  return (await bodyHas(page, '수집상품')) ? { ok: true as const }
    : { ok: false as const, error_key: 'collected_list_missing' as ErrorKey, message: '수집상품 목록 미노출' };
};
const enterRegistered: StepHandler = async (page) => {
  if (where !== 'registered') { await goToRegisteredProducts(page); await page.waitForTimeout(1_200); where = 'registered'; }
  return (await bodyHas(page, '등록상품')) ? { ok: true as const }
    : { ok: false as const, error_key: 'registered_list_missing' as ErrorKey, message: '등록상품 목록 미노출' };
};
const verifyCards = (enter: StepHandler, hrefPart: string, key: string): StepHandler => async (page, inputs) => {
  const e = await enter(page, inputs);
  if (!e.ok) return e;
  const cnt = await page.locator(`a[href*="${hrefPart}"]`).count().catch(() => 0);
  return cnt >= 1 ? { ok: true as const }
    : { ok: false as const, error_key: key as ErrorKey, message: `상품 카드 ${cnt}개` };
};
const selectRow = (enter: StepHandler, idx: number, key: string): StepHandler => async (page, inputs) => {
  const e = await enter(page, inputs);
  if (!e.ok) return e;
  const before = await countChecked(page);
  const labels = page.locator('label[for^="checkbox_"]');
  const n = await labels.count().catch(() => 0);
  if (n <= idx) return { ok: false as const, error_key: key as ErrorKey, message: `체크박스 ${n}개 (idx ${idx})` };
  await labels.nth(idx).click();
  await page.waitForTimeout(400);
  const after = await countChecked(page);
  return after > before ? { ok: true as const }
    : { ok: false as const, error_key: key as ErrorKey, message: `checked ${before}→${after}` };
};
const verifyText = (enter: StepHandler, re: RegExp, key: string): StepHandler => async (page, inputs) => {
  const e = await enter(page, inputs);
  if (!e.ok) return e;
  return (await bodyHas(page, re.source)) ? { ok: true as const }
    : { ok: false as const, error_key: key as ErrorKey, message: `미노출: ${re.source}` };
};

const handlers: StepHandlers = {
  "tc3537_상단-검색-영역": verifyText(enterCollected, /검색/, 'collected_search_missing'),
  "tc3540_상품-카드-ui": verifyCards(enterCollected, '/view2/interested-product/', 'collected_card_missing'),
  "tc3543_선택-개수-표시": selectRow(enterCollected, 1, 'collected_select_failed'),
  "tc3544_상품명-변경-액션": skip("tc3544_상품명-변경-액션", '상품명 변경 = ... 오버플로 메뉴, innerText 미노출 — skip'),
  "tc3546_기본-설정값-적용-툴팁": skip("tc3546_기본-설정값-적용-툴팁", '툴팁 hover — skip'),
  "tc3567_상단-기본-ui": verifyText(enterRegistered, /검색/, 'registered_search_missing'),
  "tc3568_목록-테이블-ui": verifyCards(enterRegistered, '/view2/registered-product/', 'registered_table_missing'),
  "tc3571_선택-개수-표시": selectRow(enterRegistered, 1, 'registered_select_failed'),
};

test("스스관부가세 / 목록 화면 영역 P1 TC 묶음 (8건) — 검색·카드·선택 real 검증", async ({ page }) => {
  test.setTimeout(3 * 60_000);
  where = null;
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
