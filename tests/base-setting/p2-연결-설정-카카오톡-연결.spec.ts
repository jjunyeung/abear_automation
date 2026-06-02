/**
 * P2 연결 설정 / 카카오톡 연결 영역 — skeleton ATC 의 8 TC (UI 스냅샷).
 *
 * 검증 정책:
 *   - 카카오톡 연결 페이지 진입 + 핵심 섹션 텍스트 노출 = 실 검증.
 *   - 연결된 상태 / 비연결 상태 = 환경 의존 (둘 다 노출 가능).
 *   - 연결 해제 모달 = destructive 트리거 skip.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'base-setting', 'p2-연결-설정-카카오톡-연결.atc.yml');
const URL = 'https://app.windly.cc/view3/connect?setting=KAKAO_APP';

let pageEntered = false;

const enterKakaoPage: StepHandler = async (page) => {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1_500);
  pageEntered = true;
  return { ok: true as const };
};

const verifyText = (label: string, snippets: string[]): StepHandler => async (page) => {
  if (!pageEntered) {
    await enterKakaoPage(page, {});
  }
  const body = await page.evaluate(() => document.body.innerText);
  for (const s of snippets) {
    if (!body.includes(s)) {
      return {
        ok: false as const,
        error_key: 'kakao_section_text_missing' as ErrorKey,
        message: `${label}: '${s}' 미노출`,
      };
    }
  }
  return { ok: true as const };
};

const noopWithLog = (label: string, reason: string): StepHandler => async () => {
  logger.info(`[kakao-connect] ${label}: ${reason} — skip 처리`);
  return { ok: true as const };
};

const handlers: StepHandlers = {
  // TC3407 화면 전체 — 카카오톡 알림 / 카카오톡 계정 연결 설정 / 알림 받기 기능 활성화 섹션
  tc3407_ui_화면_전체_스냅샷: async (page) => {
    const enter = await enterKakaoPage(page, {});
    if (!enter.ok) return enter;
    return verifyText('TC3407', ['연결 설정', '카카오톡', '알림 받기'])(page, {});
  },
  // TC3411 주문알림 받기 토글 (Off)
  tc3411_ui_알림_받기_기능_활성화_토글: verifyText('TC3411', ['주문알림 받기']),
  // TC3412 AI 전세계 상품수집 완료알림 받기 토글
  tc3412_ui_알림_받기_기능_활성화_토글: verifyText('TC3412', ['AI 전세계 상품수집 완료알림']),
  // TC3413 연결된 상태 — windly@kakao.com 이메일 노출 — 환경 의존
  tc3413_ui_연결된_카카오톡_계정_상태_스냅샷: noopWithLog('TC3413', '연결된 상태 UI — 환경 (연결 상태) 의존'),
  // TC3415/3416 연결 후 On 상태 토글 — 환경 의존
  tc3415_ui_알림_받기_기능_활성화_토글: noopWithLog('TC3415', '연결 후 주문알림 On — 환경 (연결 상태) 의존'),
  tc3416_ui_알림_받기_기능_활성화_토글: noopWithLog('TC3416', '연결 후 AI 알림 On — 환경 의존'),
  // TC3417 연결 해제 모달 — destructive
  tc3417_ui_카카오_계정_연결_해제_모달_스냅샷: noopWithLog('TC3417', '연결 해제 모달 — destructive'),
  // TC3420 화면 전체 스냅샷
  tc3420_ui_화면_전체: verifyText('TC3420', ['연결 설정', '카카오톡']),
};

// 실제 step.id 는 dash 사용 — wrapper 로 매핑
const stepIdMap: Record<string, keyof typeof handlers> = {
  'tc3407_ui-화면-전체-스냅샷': 'tc3407_ui_화면_전체_스냅샷',
  'tc3411_ui-알림-받기-기능-활성화-토글': 'tc3411_ui_알림_받기_기능_활성화_토글',
  'tc3412_ui-알림-받기-기능-활성화-토글': 'tc3412_ui_알림_받기_기능_활성화_토글',
  'tc3413_ui-연결된-카카오톡-계정-상태-스냅샷': 'tc3413_ui_연결된_카카오톡_계정_상태_스냅샷',
  'tc3415_ui-알림-받기-기능-활성화-토글': 'tc3415_ui_알림_받기_기능_활성화_토글',
  'tc3416_ui-알림-받기-기능-활성화-토글': 'tc3416_ui_알림_받기_기능_활성화_토글',
  'tc3417_ui-카카오-계정-연결-해제-모달-스냅샷': 'tc3417_ui_카카오_계정_연결_해제_모달_스냅샷',
  'tc3420_ui-화면-전체': 'tc3420_ui_화면_전체',
};

const actualHandlers = Object.fromEntries(
  Object.entries(stepIdMap).map(([atcId, handlerKey]) => [atcId, handlers[handlerKey]]),
) as typeof handlers;

test('P2 연결 설정 / 카카오톡 연결 — 진입 + 섹션 텍스트 노출 + 연결 상태 UI skip', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  pageEntered = false;
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers: actualHandlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
