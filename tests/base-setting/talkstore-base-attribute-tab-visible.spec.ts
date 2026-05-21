/**
 * 기본설정 톡스토어 상품 속성 탭 노출 검증.
 *
 * 대응 ATC: atcs/settings/talkstore-base-attribute-tab-visible.atc.yml
 * TC 원본: Case 1066 / 기본설정 › 톡스토어 › 상품 속성 / P0
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
  verifyTabPanelTitleStep,
} from './_talkstore-base-handlers';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'base-setting', 'talkstore-base-attribute-tab-visible.atc.yml');

const handlers: StepHandlers = {
  goto_tab: gotoTalkstoreBaseSettingStep('ATTRIBUTE'),
  verify_panel_title: verifyTabPanelTitleStep(/^상품\s*속성$/),
};

test('기본설정 톡스토어 상품 속성 탭', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
