/**
 * Recovery: `tab_upload_settings_error` — 업로드 설정 탭의 빨간 배너 에러 자동 수정.
 *
 * 패턴은 모든 탭 동일 — `lib/tab-error-fix.ts` 의 `openTabAndFixErrors` 가 처리.
 *
 * 규칙 준수:
 *   - C7: nested recovery 호출 금지.
 *   - C8: 'tab_upload_settings_error' 한 종류만 처리.
 *   - D12: 실패 시 throw → runner 가 1회 실패로 기록.
 */

import type { Page } from '@playwright/test';
import type { RecoveryContext } from '../lib/errors';
import { openTabAndFixErrors } from '../lib/tab-error-fix';
import { logger } from '../lib/logger';

export async function recover(page: Page, ctx: RecoveryContext): Promise<void> {
  logger.warn(
    `[recovery:tab_upload_settings_error] 시작 — last_step=${ctx.last_step_id}, url=${ctx.page_url}`,
  );
  const fixed = await openTabAndFixErrors(page, '업로드 설정');
  logger.info(`[recovery:tab_upload_settings_error] ${fixed}건 수정 완료`);
}
