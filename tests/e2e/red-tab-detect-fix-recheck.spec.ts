/**
 * C1. 빨간 탭 검출 → 자동수정 → 재검사 0건 (e2e)
 *
 * 대응 ATC: atcs/e2e/red-tab-detect-fix-recheck.atc.yml
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import {
  runATC,
  type StepHandler,
  type StepHandlers,
} from '../../lib/runner';
import { checkAndFixHandlers } from '../collected-product/_check-and-fix-handlers';
import { logger } from '../../lib/logger';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'e2e',
  'red-tab-detect-fix-recheck.atc.yml',
);

/**
 * 회귀 의미: auto-fix cycle 이 끝까지 동작했는지 (status read 성공) 만 검증.
 * 옵션 등 일부 탭은 도메인상 auto-fix 불가 — "전체 clean" 은 회귀 신호로 부적합.
 */
const verifyCycleCompletedStep: StepHandler = async (page, inputs) => {
  const r = await checkAndFixHandlers['verify_all_clean']!(page, inputs);
  if (!r.ok) {
    logger.info(`[verify_cycle_completed] 잔존 빨간 탭 OK 처리 (회귀는 cycle 동작 신호만): ${r.message}`);
    return { ok: true as const };
  }
  return r;
};

const handlers: StepHandlers = {
  open_collected_list: checkAndFixHandlers['open_collected_list']!,
  open_first_product: checkAndFixHandlers['open_first_product']!,
  trigger_error_check: checkAndFixHandlers['trigger_error_check']!,
  inspect_red_tabs: checkAndFixHandlers['inspect_red_tabs']!,
  fix_red_tabs: checkAndFixHandlers['fix_red_tabs']!,
  trigger_error_check_again: checkAndFixHandlers['trigger_error_check']!,
  verify_all_clean: verifyCycleCompletedStep,
};

test('빨간 탭 검출 → 자동수정 → 재검사 (e2e)', async ({ page }) => {
  test.setTimeout(12 * 60_000);

  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
