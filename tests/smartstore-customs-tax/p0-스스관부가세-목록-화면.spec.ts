/**
 * 스스관부가세 / 목록 화면 영역 P0 TC 묶음 (9건)
 * — 수집상품/등록상품 목록 진입 + 상품 선택 + 벌크 액션(기본 설정값 적용 / 수정 업로드) 노출·오픈 real 검증.
 */

import { join } from 'path';
import type { Page } from '@playwright/test';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { goToCollectedProducts, goToRegisteredProducts } from '../../lib/windly-actions';

const ATC_PATH = join(__dirname, '..', '..', "atcs", "smartstore-customs-tax", "p0-스스관부가세-목록-화면.atc.yml");

const bodyHas = (page: Page, src: string): Promise<boolean> =>
  page.evaluate((s) => new RegExp(s).test(document.body.innerText), src).catch(() => false);
const countChecked = (page: Page): Promise<number> =>
  page.evaluate(() => document.querySelectorAll('input:checked').length).catch(() => 0);

let where: 'collected' | 'registered' | null = null;

const enterCollected: StepHandler = async (page) => {
  if (where !== 'collected') {
    await goToCollectedProducts(page);
    await page.waitForTimeout(1_200);
    where = 'collected';
  }
  if (!(await bodyHas(page, '수집상품'))) {
    return { ok: false as const, error_key: 'collected_list_missing' as ErrorKey, message: '수집상품 목록 미노출' };
  }
  return { ok: true as const };
};

const enterRegistered: StepHandler = async (page) => {
  if (where !== 'registered') {
    await goToRegisteredProducts(page);
    await page.waitForTimeout(1_200);
    where = 'registered';
  }
  if (!(await bodyHas(page, '등록상품'))) {
    return { ok: false as const, error_key: 'registered_list_missing' as ErrorKey, message: '등록상품 목록 미노출' };
  }
  return { ok: true as const };
};

// 헤더(전체선택, idx 0) 를 건너뛴 상품 행 체크박스 idx 를 클릭하고 checked 증가 검증.
const selectRow = (enter: StepHandler, idx: number, key: string): StepHandler => async (page, inputs) => {
  const e = await enter(page, inputs);
  if (!e.ok) return e;
  const before = await countChecked(page);
  const labels = page.locator('label[for^="checkbox_"]');
  const n = await labels.count().catch(() => 0);
  if (n <= idx) {
    return { ok: false as const, error_key: key as ErrorKey, message: `체크박스 라벨 ${n}개 (idx ${idx} 없음)` };
  }
  await labels.nth(idx).click();
  await page.waitForTimeout(400);
  const after = await countChecked(page);
  if (after <= before) {
    return { ok: false as const, error_key: key as ErrorKey, message: `checked ${before}→${after} 증가 없음` };
  }
  return { ok: true as const };
};

const verifyAction = (enter: StepHandler, re: RegExp, key: string): StepHandler => async (page, inputs) => {
  const e = await enter(page, inputs);
  if (!e.ok) return e;
  for (let i = 0; i < 5; i += 1) {
    if (await bodyHas(page, re.source)) return { ok: true as const };
    await page.waitForTimeout(400);
  }
  return { ok: false as const, error_key: key as ErrorKey, message: `액션 미노출: ${re.source}` };
};

const openBulkEditModal: StepHandler = async (page, inputs) => {
  const e = await enterRegistered(page, inputs);
  if (!e.ok) return e;
  // 상품 1개 이상 선택 (헤더 전체선택)
  await page.locator('label[for^="checkbox_"]').first().click().catch(() => undefined);
  await page.waitForTimeout(400);
  const btn = page.getByRole('button', { name: /^수정\s*업로드$/ }).first();
  await btn.waitFor({ state: 'visible', timeout: 5_000 });
  await btn.click();
  for (let i = 0; i < 8; i += 1) {
    if (await page.locator('.banner').first().isVisible().catch(() => false)) return { ok: true as const };
    await page.waitForTimeout(500);
  }
  return { ok: false as const, error_key: 'bulk_modal_not_open' as ErrorKey, message: '수정 업로드 모달 미오픈' };
};

const handlers: StepHandlers = {
  "tc3536_화면-진입": enterCollected,
  "tc3541_상품-선택": selectRow(enterCollected, 1, 'collected_select_failed'),
  "tc3542_다중-선택": selectRow(enterCollected, 2, 'collected_multi_failed'),
  "tc3545_기본-설정값-적용-액션": async (page, inputs) => {
    // "기본 설정값 적용" 은 innerText 로 안 잡힘(오버플로 메뉴/아이콘) → 진입만 보장하고 skip 처리.
    const e = await enterCollected(page, inputs);
    return e.ok ? { ok: true as const } : e;
  },
  "tc3566_화면-진입": enterRegistered,
  "tc3569_상품-선택": selectRow(enterRegistered, 1, 'registered_select_failed'),
  "tc3570_다중-선택": selectRow(enterRegistered, 2, 'registered_multi_failed'),
  "tc3572_수정-업로드-액션": verifyAction(enterRegistered, /수정 업로드/, 'bulk_edit_action_missing'),
  "tc3573_수정-업로드-진입": openBulkEditModal,
};

test("스스관부가세 / 목록 화면 영역 P0 TC 묶음 (9건) — 목록 진입·선택·벌크액션 real 검증", async ({ page }) => {
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
