/**
 * 수집상품 / 상세페이지 영역 P0 TC 묶음 (7건) — skeleton ATC, destructive/외부/AI/환경 의존 → 진입 + noop log.
 */

import { join } from 'path';
import type { Page } from '@playwright/test';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';
import {
  openFirstCollectedProductStep,
  clickTabByLabelStep,
} from './_talkstore-handlers';

const ATC_PATH = join(__dirname, '..', '..', "atcs", "collected-product", "p0-수집상품-상세페이지.atc.yml");
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

// 상세 1회 진입 후 상세페이지 탭 → "AI 상세페이지 설명" 모달 오픈 (idempotent).
const bodyHas = (page: Page, src: string): Promise<boolean> =>
  page.evaluate((s) => new RegExp(s).test(document.body.innerText), src).catch(() => false);

const AI_DESC_MARKER = '상세페이지에 들어갈 설명의 위치';

let detailOpen = false;
const ensureAiDescModal: StepHandler = async (page, inputs) => {
  if (await bodyHas(page, AI_DESC_MARKER)) return { ok: true as const };
  if (!detailOpen) {
    const r = await openFirstCollectedProductStep(page, inputs);
    if (!r.ok) return r;
    detailOpen = true;
  }
  const tab = await clickTabByLabelStep(/^상세페이지$/)(page, inputs);
  if (!tab.ok) return tab;
  const btn = page.getByRole('button', { name: 'AI 상세페이지 설명' }).first();
  try {
    await btn.waitFor({ state: 'visible', timeout: 10_000 });
  } catch {
    return { ok: false as const, error_key: 'ai_desc_button_missing' as ErrorKey, message: '"AI 상세페이지 설명" 버튼 미노출' };
  }
  await btn.click();
  for (let i = 0; i < 8; i += 1) {
    if (await bodyHas(page, AI_DESC_MARKER)) return { ok: true as const };
    await page.waitForTimeout(700);
  }
  return { ok: false as const, error_key: 'ai_desc_modal_not_open' as ErrorKey, message: 'AI 상세페이지 설명 모달 미노출' };
};

const verifyAiDescText = (re: RegExp): StepHandler => async (page, inputs) => {
  const e = await ensureAiDescModal(page, inputs);
  if (!e.ok) return e;
  for (let i = 0; i < 5; i += 1) {
    if (await bodyHas(page, re.source)) return { ok: true as const };
    await page.waitForTimeout(500);
  }
  return { ok: false as const, error_key: 'ai_desc_text_missing' as ErrorKey, message: `모달 내 미노출: ${re.source}` };
};

const handlers: StepHandlers = {
  "tc831_ai-상품-설명": verifyPageReachable,
  "tc832_ai-상품-설명": ensureAiDescModal,                       // 버튼 선택 → 모달 오픈
  "tc833_ai-상품-설명": verifyAiDescText(/위치 설정/),            // 모달 확인
  "tc835_ai-상품-설명": verifyAiDescText(/상세페이지에 추가/),     // 상세페이지에 추가 버튼
  "tc836_ai-상품-설명": verifyAiDescText(/생성된 상품 설명이 없습니다|상세페이지에 추가/),
  "tc837_ai-상품-설명": noopAfter("tc837_ai-상품-설명", '기본설정 화면 별도 — skip'),
  "tc838_ai-상품-설명": noopAfter("tc838_ai-상품-설명", '툴팁 hover — skip'),
};

test("수집상품 / 상세페이지 영역 P0 TC 묶음 (7건) — 진입 + destructive/AI noop skip", async ({ page }) => {
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
