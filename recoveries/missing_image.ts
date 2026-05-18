/**
 * Recovery flow: `missing_image`
 *
 * Fulfills R-A1.2 (vertical slice exemplar — recovery branch portion):
 *   given: ATC step `error_check` 가 error_key='missing_image' 를 반환
 *   when:  runner 가 D5 매칭으로 이 파일의 `recover()` 를 호출
 *   then:  본 함수가 누락 이미지를 채워 저장. 정상 종료 시 runner 가 D4 규칙
 *          (`on_recovery.restart_from: error_check`) 에 따라 에러체크 단계로
 *          복귀 — `recovered` status 가 리포트에 기록됨.
 *
 * Fulfills R-A4.2 (recovery 시그니처):
 *   - 파일 = recoveries/<recovery_id>.ts (단일 파일 단일 함수 export)
 *   - 시그니처: `recover(page: Page, ctx: RecoveryContext): Promise<void>`
 *   - ctx 필드 4개 (KG2 MVP): error_key, page_url, last_step_id, screenshot_path
 *
 * Rules enforced:
 *   - C7: nested recovery 호출 금지 (다른 recover() 부르지 않음)
 *   - C8: catch-all fallback 아님 — 'missing_image' 한 종류만 다룸
 *   - D12: 자체 try/catch 로 실패 삼키지 않음. 실패 시 throw → runner 가
 *          1회 실패로 기록 (RecoveryFailedError 경로).
 *
 * MVP 상태:
 *   본 함수는 의도적으로 "미구현" 명시 throw 를 유지한다. 사용자가 실제
 *   윈들리 UI 자동화 (이미지 탭 → AI 채우기 → 저장) 를 채워 넣을 때까지
 *   vertical slice 실행은 의도적으로 D12 (recovery 자체 실패) 경로를 통과해
 *   리포트에 명확한 메시지를 남긴다. TODO 블록의 코드 4줄을 활성화하면
 *   정상 복구 경로 (D4 재개) 도 자연스럽게 작동한다.
 */

import type { Page } from '@playwright/test';
import type { RecoveryContext } from '../lib/errors';
import { logger } from '../lib/logger';

/**
 * Recover from a `missing_image` error on a Windly product detail.
 *
 * @param page Playwright page (이미 상품 상세에 머물러 있음 — runner 가 page.url() 을 ctx 로 전달함)
 * @param ctx  RecoveryContext (KG2 MVP 4 필드)
 */
export async function recover(page: Page, ctx: RecoveryContext): Promise<void> {
  logger.warn(
    `[recovery:missing_image] 시작 — last_step=${ctx.last_step_id}, url=${ctx.page_url}`,
  );

  // ── 실제 윈들리 자동화 (사용자가 채워야 함) ─────────────────────────────
  // TODO: 1) 이미지 탭으로 이동
  //       await page.locator('[data-tab="images"]').click();
  // TODO: 2) 누락된 이미지 슬롯 식별 및 AI 자동 채우기
  //       await page.locator('[data-action="ai-fill-images"]').click();
  // TODO: 3) 저장 후 상품 상세로 복귀
  //       await page.locator('[data-action="save"]').click();
  //       await page.waitForLoadState('networkidle');
  //
  // 위 3단계가 채워지면 아래 throw 를 제거하라. 그러면:
  //   - 정상 종료 → runner 가 D4 규칙으로 error_check 단계 재진입
  //   - 그 단계도 통과하면 RunResult.overall='success' 로 마무리

  // 명시적 미구현 throw — D12 경로 시연.
  // runner 가 RecoveryFailedError 동등 처리:
  //   StepResult.status='failed' + recovery_id='missing_image' + message=...
  // 리포트에 "recovery 'missing_image' attempt failed: ..." 로 기록됨.
  void page; // unused-arg lint 회피
  throw new Error(
    '[recovery:missing_image] MVP 시뮬레이션 — 실제 윈들리 UI 자동화 미구현. ' +
      'recoveries/missing_image.ts 의 TODO 블록 (이미지 탭 → AI 채우기 → 저장) 을 채우세요.',
  );
}
