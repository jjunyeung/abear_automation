/** Recovery: tab_attribute_error — 상품 속성 탭 에러 자동 수정. */
import type { Page } from '@playwright/test';
import type { RecoveryContext } from '../lib/errors';
import { openTabAndFixErrors } from '../lib/tab-error-fix';
import { logger } from '../lib/logger';

export async function recover(page: Page, ctx: RecoveryContext): Promise<void> {
  logger.warn(`[recovery:tab_attribute_error] last_step=${ctx.last_step_id}`);
  const fixed = await openTabAndFixErrors(page, '상품 속성');
  logger.info(`[recovery:tab_attribute_error] ${fixed}건 수정`);
}
