/**
 * Recovery: `tab_price_error` — 판매가 탭의 빨간 배너 에러 자동 수정.
 *
 * 윈들리 UI 패턴 (사용자 가이드):
 *   - 빨간 탭 (판매가) 클릭 → 탭 안 빨간 배너 메시지 노출.
 *   - 메시지 형식: "[<market>] <field>는 <N>원 이하로 입력해주세요" 등.
 *   - 빨간 보더 + ⊘ 가 있는 input 이 수정 대상.
 *   - 라벨로 input 식별, 한도 값으로 set, blur.
 *
 * 실제 fix 로직은 `lib/tab-error-fix.ts` 의 `openTabAndFixErrors` 가 모든 탭에 공통으로 처리.
 * 본 파일은 thin wrapper.
 *
 * 규칙 준수:
 *   - C7: nested recovery 호출 금지 (다른 recover() 부르지 않음).
 *   - C8: 'tab_price_error' 한 종류만 처리.
 *   - D12: 실패 시 throw → runner 가 1회 실패로 기록.
 */

import type { Page } from '@playwright/test';
import type { RecoveryContext } from '../lib/errors';
import { openTabAndFixErrors } from '../lib/tab-error-fix';
import { logger } from '../lib/logger';

export async function recover(page: Page, ctx: RecoveryContext): Promise<void> {
  logger.warn(
    `[recovery:tab_price_error] 시작 — last_step=${ctx.last_step_id}, url=${ctx.page_url}`,
  );
  const fixed = await openTabAndFixErrors(page, '판매가');
  logger.info(`[recovery:tab_price_error] ${fixed}건 수정 완료`);
}
