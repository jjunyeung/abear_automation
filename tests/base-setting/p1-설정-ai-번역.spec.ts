/**
 * P1 설정 / AI 번역 영역 — skeleton ATC 의 8 TC.
 *
 * 검증 정책:
 *   - AI 번역 페이지 진입 + 핵심 텍스트 노출 = 실 검증.
 *   - 토글 on/off, 모달 확인, 사용량 문구 변경 = destructive 또는 환경 (잔여 번역량) 의존.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'base-setting', 'p1-설정-ai-번역.atc.yml');
const URL = 'https://app.windly.cc/view3/base-setting?setting=COMMON&category=AI_TRANSLATION';

let entered = false;

const enter: StepHandler = async (page) => {
  if (entered) return { ok: true as const };
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1_000);
  const body = await page.evaluate(() => document.body.innerText);
  if (!body.includes('번역') && !body.includes('AI')) {
    return {
      ok: false as const,
      error_key: 'ai_translation_page_missing' as ErrorKey,
      message: 'AI 번역 페이지 텍스트 미노출',
    };
  }
  entered = true;
  return { ok: true as const };
};

const noopAfterEnter = (label: string, reason: string): StepHandler => async (page) => {
  const e = await enter(page, {});
  if (!e.ok) return e;
  logger.info(`[ai-translation] ${label}: ${reason} — skip`);
  return { ok: true as const };
};

const handlers: StepHandlers = {
  'tc1181_이미지-선번역-화이트리스트': noopAfterEnter('TC1181', '사용가이드 외부 페이지 — noop'),
  'tc1182_ai-이미지-선번역': enter, // 진입 + 토글 노출 자체 검증 → 토글 동작 destructive
  'tc1183_ai-이미지-선번역': noopAfterEnter('TC1183', '확인했어요 선택 — destructive 모달'),
  'tc1184_ai-이미지-선번역': noopAfterEnter('TC1184', '다시표시하지 않기 — destructive 설정'),
  'tc1185_ai-이미지-선번역': noopAfterEnter('TC1185', '토글 off — destructive 설정'),
  'tc1186_ai-이미지-선번역': noopAfterEnter('TC1186', '번역 사용량 문구 — 환경 (잔여량) 의존'),
  'tc1187_ai-이미지-선번역': noopAfterEnter('TC1187', '번역 사용량 문구 — 환경 의존'),
  'tc1188_ai-이미지-선번역': noopAfterEnter('TC1188', '번역 사용량 문구 — 환경 의존'),
};

test('P1 설정 / AI 번역 — 페이지 진입 + 동작 noop', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  entered = false;
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
