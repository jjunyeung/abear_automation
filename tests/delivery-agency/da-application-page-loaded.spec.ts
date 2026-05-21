/**
 * 배송대행지 토스토스 신청서 진입 + 헤더 가시 검증.
 *
 * 대응 ATC : atcs/settings/da-application-page-loaded.atc.yml
 * TC 원본  : Case No 1378 prerequisite / 배송대행지 › 신청서 작성 / P0
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
import { goToTosstossApplicationStep } from './_da-application-handlers';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'delivery-agency',
  'da-application-page-loaded.atc.yml',
);

const verifyFormHeaderStep: StepHandler = async (page) => {
  // 헤더 타이틀: "배송대행 신청서 작성" 또는 "배송대행 신청서 수정" 또는 "배송대행 신청서".
  const title = page.getByText(/배송대행\s*신청서(\s*(작성|수정))?/).first();
  try {
    await title.waitFor({ state: 'visible', timeout: 10_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'header_title_missing' as ErrorKey,
      message: '헤더 타이틀 "배송대행 신청서" 미노출',
    };
  }
  // 우측 저장 버튼 (Header.tsx 의 Button "저장").
  const saveBtn = page.getByRole('button', { name: /^저장$/ }).first();
  try {
    await saveBtn.waitFor({ state: 'visible', timeout: 5_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'save_button_missing' as ErrorKey,
      message: '헤더 우측 "저장" 버튼 미노출',
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_tosstoss_application: goToTosstossApplicationStep,
  verify_form_header: verifyFormHeaderStep,
};

test('배송대행지 토스토스 신청서 진입 + 헤더 가시', async ({ page }) => {
  test.setTimeout(3 * 60_000);

  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
