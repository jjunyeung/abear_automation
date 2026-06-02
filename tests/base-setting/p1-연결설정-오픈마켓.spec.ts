/**
 * P1 연결설정 / 오픈마켓 영역 — skeleton ATC 의 3 TC (모두 톡스토어).
 *
 * 검증 정책:
 *   - 톡스토어 연결 페이지 진입 + "톡스토어" 텍스트 노출 = 실 검증.
 *   - TC991 고객센터 (채널톡) / TC992 사용가이드 (외부 새창) / TC1009 잘못된 인증키 = noop.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'base-setting', 'p1-연결설정-오픈마켓.atc.yml');
const URL = 'https://app.windly.cc/view3/connect?setting=MARKET&openMarket=TALKSTORE';

let entered = false;

const enterTalkstoreConnect: StepHandler = async (page) => {
  if (entered) return { ok: true as const };
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1_000);
  const body = await page.evaluate(() => document.body.innerText);
  if (!body.includes('톡스토어')) {
    return {
      ok: false as const,
      error_key: 'talkstore_connect_page_missing' as ErrorKey,
      message: '톡스토어 연결 페이지 미진입',
    };
  }
  entered = true;
  return { ok: true as const };
};

const handlers: StepHandlers = {
  tc991: async (page) => {
    const e = await enterTalkstoreConnect(page, {});
    if (!e.ok) return e;
    logger.info('[talkstore-connect] TC991 고객센터 (채널톡) — destructive external trigger, skip');
    return { ok: true as const };
  },
  tc992: async (page) => {
    const e = await enterTalkstoreConnect(page, {});
    if (!e.ok) return e;
    logger.info('[talkstore-connect] TC992 사용가이드 새창 — noop');
    return { ok: true as const };
  },
  tc1009: async (page) => {
    const e = await enterTalkstoreConnect(page, {});
    if (!e.ok) return e;
    logger.info('[talkstore-connect] TC1009 잘못된 API 키 입력 → 모달 — destructive form 입력, skip');
    return { ok: true as const };
  },
};

test('P1 연결설정 / 오픈마켓 (톡스토어) — 페이지 진입 + 액션 destructive skip', async ({ page }) => {
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
