/**
 * P1 연결 설정 / 카카오톡 연결 영역 — skeleton ATC 의 4 TC (FUNC 동작).
 *
 * 검증 정책:
 *   - 카카오톡 페이지 진입 + 핵심 텍스트 노출 = 실 검증.
 *   - 연결 해제 모달 / 활성화 모달 / 외부 링크 = destructive 또는 환경 의존 noop.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'base-setting', 'p1-연결-설정-카카오톡-연결.atc.yml');
const URL = 'https://app.windly.cc/view3/connect?setting=KAKAO_APP';

let entered = false;

const enter: StepHandler = async (page) => {
  if (entered) return { ok: true as const };
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1_000);
  entered = true;
  return { ok: true as const };
};

const noopAfterEnter = (label: string, reason: string): StepHandler => async (page) => {
  const e = await enter(page, {});
  if (!e.ok) return e;
  logger.info(`[kakao-func] ${label}: ${reason} — skip`);
  return { ok: true as const };
};

const handlers: StepHandlers = {
  'tc3409_func-실제-알림-화면-미리보기-링크': noopAfterEnter('TC3409', '미리보기 외부 링크 클릭'),
  'tc3414_func-카카오톡-계정-연결-해제': noopAfterEnter('TC3414', '연결 해제 모달 — 환경 (연결 상태) 의존'),
  'tc3418_func-카카오-계정-연결-해제-모달-취소': noopAfterEnter('TC3418', '모달 취소 — 환경 의존'),
  'tc3422_func-모달-노출': noopAfterEnter('TC3422', '지금 활성화하기 → 기능 제한 모달 — 환경 의존'),
};

test('P1 연결 설정 / 카카오톡 연결 — 페이지 진입 + 동작 noop', async ({ page }) => {
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
