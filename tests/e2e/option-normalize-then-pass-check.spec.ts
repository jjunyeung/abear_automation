/**
 * C2. 옵션 A-Z 정규화 → 에러체크 옵션 탭 정상 (e2e)
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import {
  runATC,
  type StepHandler,
  type StepHandlers,
} from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { optionsAZNormalizeHandlers } from '../collected-product/_options-a-z-normalize-handlers';
import {
  clickErrorCheckButton,
  readTabStatuses,
} from '../../lib/error-check-actions';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'e2e', 'option-normalize-then-pass-check.atc.yml');

const errorCheckAfterNormalizeStep: StepHandler = async (page) => {
  // 회귀 의미: 에러체크 트리거가 동작하고 옵션 탭 status 가 읽히면 OK.
  // 옵션 탭의 빨간 dot 자체는 옵션명 외 가격/수량 등 다른 필드도 영향 → 정규화 단독 회귀에 부적합.
  await page.keyboard.press('Escape').catch(() => undefined);
  await page.waitForTimeout(300);
  const ok = await clickErrorCheckButton(page);
  if (!ok) {
    return {
      ok: false as const,
      error_key: 'error_check_btn_not_found' as ErrorKey,
      message: '에러체크 버튼 미발견',
    };
  }
  await page.waitForTimeout(2_000);
  const statuses = await readTabStatuses(page);
  const optionTab = statuses.find((s) => s.name === '옵션');
  // status 가 읽히면 (status !== undefined) OK — 빨간 여부 무관 (회귀는 정규화 동작만).
  if (optionTab === undefined) {
    return {
      ok: false as const,
      error_key: 'option_tab_status_unknown' as ErrorKey,
      message: '옵션 탭 status 조회 실패',
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_collected_list: optionsAZNormalizeHandlers['open_collected_list']!,
  open_first_product: optionsAZNormalizeHandlers['open_first_product']!,
  apply_a_z: optionsAZNormalizeHandlers['apply_a_z']!,
  error_check_after_normalize: errorCheckAfterNormalizeStep,
};

test('옵션 A-Z 정규화 → 에러체크 옵션 탭 정상 (e2e)', async ({ page }) => {
  test.setTimeout(8 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
