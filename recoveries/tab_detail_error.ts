/** Recovery: tab_detail_error — 상세페이지 탭 에러 자동 수정. */
import type { Page } from '@playwright/test';
import type { RecoveryContext } from '../lib/errors';
import { openTabAndFixErrors } from '../lib/tab-error-fix';
import { logger } from '../lib/logger';

export async function recover(page: Page, ctx: RecoveryContext): Promise<void> {
  logger.warn(`[recovery:tab_detail_error] last_step=${ctx.last_step_id}`);
  const fixed = await openTabAndFixErrors(page, '상세페이지');
  logger.info(`[recovery:tab_detail_error] ${fixed}건 수정`);
}
