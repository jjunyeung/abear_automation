/**
 * Recovery: `esm_recommend_option_unmatched` — ESM 2.0 추천옵션 모드 미설정 자동 수정.
 *
 * 트리거: 에러체크 step 이 업로드 설정 탭 빨강이 ESM 추천옵션 미설정 때문임을 감지하고
 *         `error_key="esm_recommend_option_unmatched"` 반환 + 해당 step 의
 *         `on_error: [esm_recommend_option_unmatched]` 등록 시.
 *
 * 동작: 업로드 설정 탭 → "ESM 2.0 옵션설정" 모달 → 윈들리 옵션 칩 전부 선택(묶음) →
 *       생성하기 → 저장. (`lib/esm-option-actions.ts` 의 공유 플로우 재사용.)
 *
 * 규칙 준수:
 *   - C7: nested recovery 호출 금지 (다른 recover() 안 부름).
 *   - C8: 이 에러 한 종류만 처리.
 *   - D12: 실패 시 throw → runner 가 1회 실패로 기록 (fixEsmRecommendOption 이 throw).
 *   - 의존 정책: lib/errors(RecoveryContext) + lib/esm-option-actions + lib/logger 만 import.
 *     ATC 프레임워크 핵심(atc-loader/runner/recovery-registry/atc-schema) 은 import 금지.
 */

import type { Page } from '@playwright/test';
import type { RecoveryContext } from '../lib/errors';
import { fixEsmRecommendOption } from '../lib/esm-option-actions';
import { logger } from '../lib/logger';

export async function recover(page: Page, ctx: RecoveryContext): Promise<void> {
  logger.warn(
    `[recovery:esm_recommend_option_unmatched] 시작 — last_step=${ctx.last_step_id}, url=${ctx.page_url}`,
  );
  await fixEsmRecommendOption(page);
  logger.info('[recovery:esm_recommend_option_unmatched] 완료');
}
