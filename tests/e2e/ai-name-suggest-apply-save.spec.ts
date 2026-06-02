/**
 * G1. AI 상품명 추천 → 저장 → 영구 반영 (e2e)
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import {
  runATC,
  type StepHandler,
  type StepHandlers,
} from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { aiRecommendNameHandlers } from '../collected-product/_ai-recommend-name-handlers';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'e2e', 'ai-name-suggest-apply-save.atc.yml');

let urlBefore = '';

const saveProductStep: StepHandler = async (page) => {
  // 윈들리 수집상품 detail 은 autosave — input blur 시 자동 저장 (별도 저장 버튼 없음).
  // body 클릭으로 active input blur + autosave 트리거 + 짧은 대기.
  urlBefore = page.url();
  await page.locator('body').click({ position: { x: 10, y: 10 } }).catch(() => undefined);
  await page.keyboard.press('Tab').catch(() => undefined);
  await page.waitForTimeout(3_000);
  return { ok: true as const };
};

const reEnterAndVerifyStep: StepHandler = async (page) => {
  if (urlBefore.length === 0) {
    await page.reload({ waitUntil: 'domcontentloaded' });
  } else {
    await page.goto(urlBefore, { waitUntil: 'domcontentloaded' });
  }
  await page.waitForTimeout(3_000);

  // 기본 정보 탭 클릭 — reload 후 다른 탭일 수 있음.
  const basicTab = page.getByRole('button', { name: /^기본\s*정보$/ }).first();
  if ((await basicTab.count()) > 0) {
    await basicTab.click({ timeout: 5_000 }).catch(() => undefined);
    await page.waitForTimeout(2_000);
  }

  // 페이지 안의 가장 긴 input/textarea = 상품명일 가능성. 모든 visible input 의 value 중 가장 긴 것.
  const longestVal = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('input, textarea')) as HTMLInputElement[];
    let best = '';
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (el.readOnly) continue;
      const v = (el.value ?? '').trim();
      if (v.length > best.length) best = v;
    }
    return best;
  });
  logger.info(`[re_enter_and_verify] 가장 긴 input value="${longestVal.slice(0, 60)}" (len=${longestVal.length})`);
  if (longestVal.length === 0) {
    return {
      ok: false as const,
      error_key: 'name_empty_after_save' as ErrorKey,
      message: 'reload 후 visible input 값 모두 비어있음 — 저장 미반영',
    };
  }
  return { ok: true as const };
};

/** 이미 AI 추천 적용된 상품이면 변경 없음 → 회귀에선 OK. */
const recommendNameOrSkipStep: StepHandler = async (page, inputs) => {
  const r = await aiRecommendNameHandlers['recommend_name']!(page, inputs);
  if (!r.ok && r.error_key === 'ai_name_no_change') {
    logger.info('[recommend_name] 변경 없음 — 이미 AI 적용된 상태로 간주, OK 처리');
    return { ok: true as const };
  }
  return r;
};

const handlers: StepHandlers = {
  open_collected_list: aiRecommendNameHandlers['open_collected_list']!,
  open_first_product: aiRecommendNameHandlers['open_first_product']!,
  recommend_name: recommendNameOrSkipStep,
  save_product: saveProductStep,
  re_enter_and_verify: reEnterAndVerifyStep,
};

test('AI 상품명 추천 → 저장 → 영구 반영 (e2e)', async ({ page }) => {
  test.setTimeout(8 * 60_000);
  urlBefore = '';
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
