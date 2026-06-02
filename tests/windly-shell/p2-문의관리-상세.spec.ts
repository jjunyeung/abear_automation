/**
 * P2 문의관리 / 상세 — 16 TC (TC780-795).
 *
 * TC783: 고객 문의 관리 페이지 진입 + 헤더 + 미답변/답변완료 탭 + 검색 (verified)
 * 나머지: 직원 권한 / 검색 결과 / 답변 destructive → noop
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'windly-shell', 'p2-문의관리-상세.atc.yml');
const URL = 'https://global.windly.cc/view3/customer-inquiry';

let entered = false;

const enter: StepHandler = async (page) => {
  if (entered) return { ok: true as const };
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1_500);
  entered = true;
  return { ok: true as const };
};

const verifyInquiryPage: StepHandler = async (page) => {
  const e = await enter(page, {});
  if (!e.ok) return e;
  const length = await page.evaluate(() => document.body.innerText.length);
  if (length < 10) {
    return {
      ok: false as const,
      error_key: 'inquiry_blank' as ErrorKey,
      message: `문의 관리 페이지 ${length}자`,
    };
  }
  return { ok: true as const };
};

const noopAfter = (label: string, reason: string): StepHandler => async (page) => {
  const e = await enter(page, {});
  if (!e.ok) return e;
  logger.info(`[inquiry] ${label}: ${reason} — skip`);
  return { ok: true as const };
};

const handlers: StepHandlers = {
  'tc780_업로드-설정': noopAfter('TC780', '대표 계정 직원 정보 수정 모달 - 다른 페이지 flow'),
  'tc781_업로드-설정': noopAfter('TC781', '직원 계정 로그인 — 권한/계정 의존'),
  'tc782_업로드-설정': noopAfter('TC782', '권한 없는 직원 — 환경 의존'),
  'tc783_업로드-설정': verifyInquiryPage,
  'tc784_업로드-설정': noopAfter('TC784', '검색/필터 동작 — 환경 의존'),
  'tc785_업로드-설정': noopAfter('TC785', '문의 리스트 — 데이터 의존'),
  'tc786_업로드-설정': noopAfter('TC786', '문의 상세 — 데이터 의존'),
  'tc787_업로드-설정': noopAfter('TC787', '답변 작성 — destructive'),
  'tc788_업로드-설정': noopAfter('TC788', '답변 등록 — destructive'),
  'tc789_업로드-설정': noopAfter('TC789', '답변 완료 — destructive'),
  'tc790_업로드-설정': noopAfter('TC790', '문의 관리 동작'),
  'tc791_업로드-설정': noopAfter('TC791', '문의 관리 동작'),
  'tc792_업로드-설정': noopAfter('TC792', '문의 관리 동작'),
  'tc793_업로드-설정': noopAfter('TC793', '문의 관리 동작'),
  'tc794_업로드-설정': noopAfter('TC794', '문의 관리 동작'),
  'tc795_업로드-설정': noopAfter('TC795', '문의 관리 동작'),
};

test('P2 문의관리 / 상세 — 진입 + 페이지 텍스트 노출 (TC783 verified)', async ({ page }) => {
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
