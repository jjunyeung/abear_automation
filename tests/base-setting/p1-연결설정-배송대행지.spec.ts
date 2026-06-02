/**
 * P1 연결설정 / 배송대행지 영역 — skeleton ATC 의 3 TC.
 *
 * 검증 정책:
 *   - TC1322 퀵스타/토스토스 카드 노출 = 실 검증.
 *   - TC1326 아이디/비밀번호 찾기 외부 페이지 이동 = noop.
 *   - TC1337 회원가입 모달 취소 = noop (모달 트리거 destructive).
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'base-setting', 'p1-연결설정-배송대행지.atc.yml');
const URL = 'https://app.windly.cc/view3/connect?setting=DELIVERY_AGENCY';

const verifyAgencyCards: StepHandler = async (page) => {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1_000);
  const body = await page.evaluate(() => document.body.innerText);
  for (const k of ['퀵스타', '토스토스']) {
    if (!body.includes(k)) {
      return {
        ok: false as const,
        error_key: 'delivery_agency_card_missing' as ErrorKey,
        message: `배송대행지 카드 '${k}' 미노출`,
      };
    }
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  'tc1322_카카오톡-주문알림': verifyAgencyCards,
  'tc1326_카카오톡-주문알림': async () => {
    logger.info('[delivery-agency] TC1326 퀵스타 외부 페이지 이동 — noop');
    return { ok: true as const };
  },
  'tc1337_카카오톡-주문알림': async () => {
    logger.info('[delivery-agency] TC1337 회원가입 모달 — destructive trigger skip');
    return { ok: true as const };
  },
};

test('P1 연결설정 / 배송대행지 — 카드 노출 + 외부 페이지 skip', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
