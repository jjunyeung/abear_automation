#!/usr/bin/env node
/**
 * 기본설정 톡스토어 — 4개 탭 진입 + 패널 타이틀 노출 검증 generator.
 *
 * TC 원본 (P0):
 *   - Case 1015~1017 (배송 정보 탭 진입 + 미연결 시 안내 노출) — 현재 환경 연결됨, 미연결 spec 은 skip
 *   - Case 1044 (리뷰 포인트 탭)
 *   - Case 1066 (상품 속성 탭)
 *   - Case 1069 (상품 노출 및 판매 탭)
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const TABS = [
  { id: 'delivery', category: 'DELIVERY_AND_AS', label: '배송 정보', cases: '1015, 1017 (탭 진입 부분)' },
  { id: 'attribute', category: 'ATTRIBUTE', label: '상품 속성', cases: '1066' },
  { id: 'product-setting', category: 'PRODUCT_SETTING', label: '상품 노출 및 판매', cases: '1069' },
];

function makeAtc(t) {
  return `# 기본설정 톡스토어 ${t.label} 탭 노출.
#
# TC 원본: Case ${t.cases} / 기본설정 › 톡스토어 › ${t.label} / P0

title: 기본설정 톡스토어 ${t.label} 탭

description: |
  /view3/base-setting?setting=TALKSTORE&category=${t.category} 진입 → "${t.label}" 타이틀 노출 검증.
  TC 원본: Case ${t.cases} / P0

inputs: {}

steps:
  - id: goto_tab
    do: 기본설정 톡스토어 ${t.label} 탭 진입

  - id: verify_panel_title
    do: 패널 타이틀 "${t.label}" 노출 검증

expected: ${t.label} 탭 진입. unhandled 0건.
`;
}

function makeSpec(t) {
  return `/**
 * 기본설정 톡스토어 ${t.label} 탭 노출 검증.
 *
 * 대응 ATC: atcs/settings/talkstore-base-${t.id}-tab-visible.atc.yml
 * TC 원본: Case ${t.cases} / 기본설정 › 톡스토어 › ${t.label} / P0
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

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'settings', 'talkstore-base-${t.id}-tab-visible.atc.yml');

const handlers: StepHandlers = {
  goto_tab: gotoTalkstoreBaseSettingStep('${t.category}'),
  verify_panel_title: verifyTabPanelTitleStep(/^${t.label.replace(/ /g, '\\s*')}$/),
};

test('기본설정 톡스토어 ${t.label} 탭', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
`;
}

for (const t of TABS) {
  const atcPath = join(ROOT, 'atcs/settings', `talkstore-base-${t.id}-tab-visible.atc.yml`);
  const specPath = join(ROOT, 'tests/settings', `talkstore-base-${t.id}-tab-visible.spec.ts`);
  writeFileSync(atcPath, makeAtc(t));
  writeFileSync(specPath, makeSpec(t));
  console.log('✓ ' + atcPath);
  console.log('✓ ' + specPath);
}

console.log(`\n생성: ${TABS.length} ATC + ${TABS.length} spec`);
