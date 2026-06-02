/**
 * 기본설정 톡스토어 배송 정보 탭 dropdown 3종 검증.
 *
 * 대응 ATC : atcs/base-setting/talkstore-base-delivery-dropdowns.atc.yml
 * TC 원본  : Case No 1019, 1020, 1021, 1022, 1023, 1024 / P0 (6건)
 *
 * 통합 spec — CASES 배열에 3 dropdown 등록. 각 CASE 가 1회 runATC 호출로 두 step
 * (open → select) 을 수행하여 X19/X21/X23 (드롭다운 클릭) 과 X20/X22/X24 (옵션 선택)
 * 을 동시에 cover.
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
import {
  gotoTalkstoreBaseSettingStep,
  openDropdownByLabelStep,
  selectDropdownByLabelStep,
} from './_talkstore-base-handlers';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'base-setting',
  'talkstore-base-delivery-dropdowns.atc.yml',
);

interface DropdownCase {
  tcOpen: number;     // 드롭다운 클릭 TC#
  tcSelect: number;   // 옵션 선택 TC#
  label: string;      // dropdown label (Dropdown 컴포넌트의 LabelBox 텍스트)
  errorKeyPrefix: string;
}

const CASES: DropdownCase[] = [
  { tcOpen: 1019, tcSelect: 1020, label: '출고지 목록', errorKeyPrefix: 'shipping_place' },
  { tcOpen: 1021, tcSelect: 1022, label: '반품지 목록', errorKeyPrefix: 'return_place' },
  { tcOpen: 1023, tcSelect: 1024, label: '택배사 목록', errorKeyPrefix: 'courier' },
];

function asInput(inputs: Record<string, unknown>, key: string): string {
  const v = inputs[key];
  if (typeof v !== 'string' || v.length === 0) {
    throw new Error(`inputs.${key} 가 string 이 아니거나 비어있음: ${String(v)}`);
  }
  return v;
}

const openDropdownStep: StepHandler = async (page, inputs) => {
  const label = asInput(inputs, 'label');
  const prefix = asInput(inputs, 'error_key_prefix');
  return openDropdownByLabelStep(label, prefix)(page, inputs);
};

const selectFirstOptionStep: StepHandler = async (page, inputs) => {
  const label = asInput(inputs, 'label');
  const prefix = asInput(inputs, 'error_key_prefix');
  return selectDropdownByLabelStep(label, prefix)(page, inputs);
};

const handlers: StepHandlers = {
  goto_delivery_tab: gotoTalkstoreBaseSettingStep('DELIVERY_AND_AS'),
  open_dropdown: openDropdownStep,
  select_first_option: selectFirstOptionStep,
};

// Hybrid mode:
//   - GUI/CLI 가 ATC_INPUT_LABEL + ATC_INPUT_ERROR_KEY_PREFIX 제공 → 1건만
//   - 미제공 → CASES 3건 전부
const envLabel = process.env['ATC_INPUT_LABEL'];
const envPrefix = process.env['ATC_INPUT_ERROR_KEY_PREFIX'];
const singleRun = envLabel && envPrefix;

if (singleRun) {
  test(`톡스토어 배송 dropdown "${envLabel}" 열림+선택 (env 단일 실행)`, async ({ page }) => {
    test.setTimeout(2 * 60_000);
    const atc = loadATC(ATC_PATH);
    const result = await runATC({
      atc,
      page,
      inputs: { label: envLabel, error_key_prefix: envPrefix },
      handlers,
    });
    await test.info().attach('atc-result', {
      body: JSON.stringify(result),
      contentType: 'application/json',
    });
    expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
  });
} else {
  for (const c of CASES) {
    test(`#${c.tcOpen}/#${c.tcSelect} 톡스토어 ${c.label} 열림+선택`, async ({ page }) => {
      test.setTimeout(2 * 60_000);
      const atc = loadATC(ATC_PATH);
      const result = await runATC({
        atc,
        page,
        inputs: { label: c.label, error_key_prefix: c.errorKeyPrefix },
        handlers,
      });
      await test.info().attach('atc-result', {
        body: JSON.stringify(result),
        contentType: 'application/json',
      });
      expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
    });
  }
}
