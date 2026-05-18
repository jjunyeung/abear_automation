/** Recovery: tab_basic_error — 기본 정보 탭 에러 자동 수정 (lib/tab-error-fix 패턴 공유). */
import type { Page } from '@playwright/test';
import type { RecoveryContext } from '../lib/errors';
import { openTabAndFixErrors } from '../lib/tab-error-fix';
import { logger } from '../lib/logger';

export async function recover(page: Page, ctx: RecoveryContext): Promise<void> {
  logger.warn(`[recovery:tab_basic_error] last_step=${ctx.last_step_id}`);
  const fixed = await openTabAndFixErrors(page, '기본 정보');
  logger.info(`[recovery:tab_basic_error] ${fixed}건 수정`);
}
