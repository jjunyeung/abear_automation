/**
 * 기본설정 톡스토어 리뷰 포인트 탭 — 구매 시 포인트 단위/액 입력 검증.
 *
 * 대응 ATC : atcs/base-setting/talkstore-base-purchase-point-unit-amount.atc.yml
 * TC 원본  : Case No 1050, 1052, 1057, 1060, 1061 / P0 (5건)
 *
 * CASES (각 case 가 do_case_action step 의 분기 입력):
 *   1050 — Dropdown "포인트 적립 단위(원/%)" 에서 "%" 선택
 *   1052/1057 — TextField "포인트 적립액(률)" 에 액 입력 (AMOUNT 모드 가정 — 단위 변경 안 함)
 *   1060/1061 — TextField "포인트 적립액(률)" 에 율 입력 (RATE 모드로 단위 먼저 변경 후 입력)
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import {
  fillInputByLabelStep,
  gotoTalkstoreBaseSettingStep,
  selectDropdownByLabelAndOptionStep,
  toggleOnByLabelStep,
} from './_talkstore-base-handlers';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'base-setting',
  'talkstore-base-purchase-point-unit-amount.atc.yml',
);

type CaseKind = 'select_unit_percent' | 'fill_amount' | 'fill_rate';
interface Case {
  tcNo: number;
  kind: CaseKind;
  /** fill_amount / fill_rate 일 때 입력값. */
  fillValue?: string;
}

const CASES: Case[] = [
  { tcNo: 1050, kind: 'select_unit_percent' },
  { tcNo: 1052, kind: 'fill_amount', fillValue: '500' },
  { tcNo: 1057, kind: 'fill_amount', fillValue: '1000' },
  { tcNo: 1060, kind: 'fill_rate', fillValue: '2' },
  { tcNo: 1061, kind: 'fill_rate', fillValue: '5' },
];

const FIELD_LABEL = '포인트 적립액(률)';
const UNIT_DROPDOWN_LABEL = '포인트 적립 단위(원/%)';

const doCaseActionStep: StepHandler = async (page, inputs) => {
  const kind = inputs['kind'] as CaseKind;
  if (kind === 'select_unit_percent') {
    return selectDropdownByLabelAndOptionStep(UNIT_DROPDOWN_LABEL, '%', 'unit_select')(page, {});
  }
  if (kind === 'fill_amount') {
    // 단위 = AMOUNT (원) 로 먼저 set.
    const setUnit = await selectDropdownByLabelAndOptionStep(UNIT_DROPDOWN_LABEL, '원', 'unit_amount_setup')(page, {});
    if (!setUnit.ok) return setUnit;
    const v = inputs['fill_value'] as string;
    return fillInputByLabelStep(FIELD_LABEL, v, 'fill_amount')(page, {});
  }
  if (kind === 'fill_rate') {
    const setUnit = await selectDropdownByLabelAndOptionStep(UNIT_DROPDOWN_LABEL, '%', 'unit_rate_setup')(page, {});
    if (!setUnit.ok) return setUnit;
    const v = inputs['fill_value'] as string;
    return fillInputByLabelStep(FIELD_LABEL, v, 'fill_rate')(page, {});
  }
  return {
    ok: false as const,
    error_key: 'unknown_case_kind' as ErrorKey,
    message: `Unknown CaseKind: ${kind}`,
  };
};

const handlers: StepHandlers = {
  goto_review_point_tab: gotoTalkstoreBaseSettingStep('REVIEW_POINT'),
  ensure_purchase_point_on: toggleOnByLabelStep('구매 시 포인트 지급 여부 설정', 'ensure_purchase_on'),
  do_case_action: doCaseActionStep,
};

for (const c of CASES) {
  test(`#${c.tcNo} 톡스토어 구매 포인트 — ${c.kind}`, async ({ page }) => {
    test.setTimeout(2 * 60_000);
    const atc = loadATC(ATC_PATH);
    const result = await runATC({
      atc,
      page,
      inputs: {
        kind: c.kind,
        fill_value: c.fillValue ?? '',
      },
      handlers,
    });
    await test.info().attach('atc-result', {
      body: JSON.stringify(result),
      contentType: 'application/json',
    });
    expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
  });
}
