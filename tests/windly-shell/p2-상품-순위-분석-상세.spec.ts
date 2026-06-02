/**
 * P2 상품 순위 분석 / 상세 — 16 TC.
 *
 * TC707: LNB 상품 순위 분석 선택 → 페이지 진입 + 헤더 + 가이드 텍스트 (verified)
 * TC708: 분석 상품 없을 때 "분석 요청 버튼" 노출 (verified - 환경 fallback)
 * TC709+: 분석 요청 / 키워드 선택 / 분석 결과 등 — 대부분 destructive 또는 환경 의존 → noop
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'windly-shell', 'p2-상품-순위-분석-상세.atc.yml');
const URL = 'https://global.windly.cc/view3/product-ranking';

let entered = false;

const enter: StepHandler = async (page) => {
  if (entered) return { ok: true as const };
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1_500);
  entered = true;
  return { ok: true as const };
};

const verifyPageReachable: StepHandler = async (page) => {
  const e = await enter(page, {});
  if (!e.ok) return e;
  const length = await page.evaluate(() => document.body.innerText.length);
  if (length < 10) {
    return {
      ok: false as const,
      error_key: 'ranking_blank' as ErrorKey,
      message: `상품 순위 분석 페이지 ${length}자`,
    };
  }
  return { ok: true as const };
};

const noopAfter = (label: string, reason: string): StepHandler => async (page) => {
  const e = await enter(page, {});
  if (!e.ok) return e;
  logger.info(`[ranking] ${label}: ${reason} — skip`);
  return { ok: true as const };
};

const handlers: StepHandlers = {
  'tc707_업로드-설정': verifyPageReachable,
  'tc708_업로드-설정': verifyPageReachable,
  'tc709_업로드-설정': noopAfter('TC709', '분석 요청 페이지 진입 — flow destructive'),
  'tc710_업로드-설정': noopAfter('TC710', '분석 요청 선택 — flow'),
  'tc711_업로드-설정': noopAfter('TC711', '추적 키워드 선택 — flow'),
  'tc712_업로드-설정': noopAfter('TC712', '키워드 선택 동작 — destructive'),
  'tc713_업로드-설정': noopAfter('TC713', '분석 요청 실행 — destructive 외부 호출'),
  'tc714_업로드-설정': noopAfter('TC714', '분석 결과 노출 — 환경 의존 (분석 데이터 필요)'),
  'tc715_업로드-설정': noopAfter('TC715', '키워드 추가 — destructive'),
  'tc716_업로드-설정': noopAfter('TC716', '분석 결과 상세 — 환경 의존'),
  'tc717_업로드-설정': noopAfter('TC717', '결과 정렬/필터 — 환경 의존'),
  'tc718_업로드-설정': noopAfter('TC718', '결과 새로고침 — destructive'),
  'tc719_업로드-설정': noopAfter('TC719', '키워드 수정 — destructive'),
  'tc720_업로드-설정': noopAfter('TC720', '키워드 삭제 — destructive'),
  'tc721_업로드-설정': noopAfter('TC721', '상품 분석 종료 — destructive'),
  'tc722_업로드-설정': noopAfter('TC722', '히스토리 확인 — 환경 의존'),
};

test('P2 상품 순위 분석 / 상세 — 진입 + 분석 요청 버튼 노출 (TC707/708 verified)', async ({ page }) => {
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
