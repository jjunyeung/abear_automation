/**
 * 기본설정 톡스토어 A/S 전화번호 입력 검증.
 *
 * 대응 ATC: atcs/settings/talkstore-base-as-phone-input.atc.yml
 * TC 원본: Case No 1039 / 기본설정 › 톡스토어 › a/s 정보 / P0
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import {
  runATC,
  type StepHandlers,
} from '../../lib/runner';
import {
  gotoTalkstoreBaseSettingStep,
  fillInputByLabelStep,
} from './_talkstore-base-handlers';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'base-setting', 'talkstore-base-as-phone-input.atc.yml');

const handlers: StepHandlers = {
  goto_delivery_tab: gotoTalkstoreBaseSettingStep('DELIVERY_AND_AS'),
  input_as_phone: fillInputByLabelStep('A/S 전화번호', '010-1234-5678', 'as_phone'),
};

test('기본설정 톡스토어 A/S 전화번호 입력', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
