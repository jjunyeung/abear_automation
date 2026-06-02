/**
 * 기본설정 톡스토어 상품 속성 — 원산지 dropdown 선택 검증.
 *
 * 대응 ATC : atcs/base-setting/talkstore-base-attribute-origin-dropdown.atc.yml
 * TC 원본  : Case No 1068 / P0
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandlers } from '../../lib/runner';
import {
  gotoTalkstoreBaseSettingStep,
  selectDropdownByLabelStep,
} from './_talkstore-base-handlers';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'base-setting',
  'talkstore-base-attribute-origin-dropdown.atc.yml',
);

const handlers: StepHandlers = {
  goto_attribute_tab: gotoTalkstoreBaseSettingStep('ATTRIBUTE'),
  select_origin_first: selectDropdownByLabelStep('원산지', 'origin'),
};

test('[TC 1068] 기본설정 → 톡스토어 → [상품 속성] 탭 → 원산지 dropdown 열기 → 키보드 옵션 선택 → 선택 동작 확인', async ({ page }) => {
  test.setTimeout(90_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
