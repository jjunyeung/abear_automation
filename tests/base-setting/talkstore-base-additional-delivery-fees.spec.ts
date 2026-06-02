/**
 * 기본설정 톡스토어 배송 정보 탭 — 추가 배송비 검증.
 *
 * 대응 ATC : atcs/base-setting/talkstore-base-additional-delivery-fees.atc.yml
 * TC 원본  : Case No 1026, 1032, 1038 / P0 (3건)
 *
 * CASES:
 *   1026 — 도서산간 추가 배송비 입력 (TextField, "배송 가능" 모드)
 *   1032 — 제주 지역 추가 배송비 입력 (TextField, "배송 가능" 모드)
 *   1038 — "배송 불가" SegmentedButton 클릭 (fee TextField 들 사라짐 검증)
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import {
  clickSegmentedButtonByTextStep,
  fillInputByLabelStep,
  gotoTalkstoreBaseSettingStep,
} from './_talkstore-base-handlers';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'base-setting',
  'talkstore-base-additional-delivery-fees.atc.yml',
);

type CaseKind = 'fee_input' | 'disable';
interface FeeCase {
  tcNo: number;
  kind: CaseKind;
  /** fee_input 일 때 사용 — TextField label. */
  fieldLabel?: string;
  /** fee_input 일 때 사용 — 입력값 (10원 단위). */
  fillValue?: string;
}

const CASES: FeeCase[] = [
  { tcNo: 1026, kind: 'fee_input', fieldLabel: '도서산간 추가 배송비', fillValue: '3000' },
  { tcNo: 1032, kind: 'fee_input', fieldLabel: '제주 지역 추가 배송비', fillValue: '5000' },
  { tcNo: 1038, kind: 'disable' },
];

const ensureDeliveryEnabledStep: StepHandler = async (page) => {
  // "배송 가능" SegmentedButton 클릭으로 enabled 상태 강제 (idempotent — 이미 selected 면 noop).
  await clickSegmentedButtonByTextStep('배송 가능', 'ensure_enabled')(page, {});
  return { ok: true as const };
};

const verifyFeeFieldsHiddenStep: StepHandler = async (page) => {
  // "배송 불가" 선택 후 — fee TextField 들이 사라져야 함 (조건부 렌더).
  // label 텍스트가 DOM 에서 사라졌는지 확인.
  const labels = ['도서산간 추가 배송비', '제주 지역 추가 배송비'];
  for (const lab of labels) {
    const cnt = await page.getByText(lab, { exact: true }).count();
    if (cnt > 0) {
      return {
        ok: false as const,
        error_key: 'fee_field_still_visible' as ErrorKey,
        message: `"배송 불가" 선택 후 "${lab}" 가 여전히 노출됨 (조건부 hide 동작 X)`,
      };
    }
  }
  return { ok: true as const };
};

const doCaseActionStep: StepHandler = async (page, inputs) => {
  const kind = inputs['kind'] as CaseKind;
  if (kind === 'fee_input') {
    const label = inputs['field_label'] as string;
    const value = inputs['fill_value'] as string;
    await ensureDeliveryEnabledStep(page, {});
    const r = await fillInputByLabelStep(label, value, `fee_${label}`)(page, {});
    return r;
  }
  if (kind === 'disable') {
    const click = await clickSegmentedButtonByTextStep('배송 불가', 'disable_delivery')(page, {});
    if (!click.ok) return click;
    return verifyFeeFieldsHiddenStep(page, {});
  }
  return {
    ok: false as const,
    error_key: 'unknown_case_kind' as ErrorKey,
    message: `Unknown CaseKind: ${kind}`,
  };
};

const handlers: StepHandlers = {
  goto_delivery_tab: gotoTalkstoreBaseSettingStep('DELIVERY_AND_AS'),
  do_case_action: doCaseActionStep,
};

for (const c of CASES) {
  test(`#${c.tcNo} 톡스토어 추가 배송비 — ${c.kind === 'disable' ? '배송 불가 토글' : c.fieldLabel + ' 입력'}`, async ({ page }) => {
    test.setTimeout(2 * 60_000);
    const atc = loadATC(ATC_PATH);
    const result = await runATC({
      atc,
      page,
      inputs: {
        kind: c.kind,
        field_label: c.fieldLabel ?? '',
        fill_value: c.fillValue ?? '',
      },
      handlers,
    });
    await test.info().attach('atc-result', {
      body: JSON.stringify(result),
      contentType: 'application/json',
    });
    // 배송 불가 케이스 종료 후 다시 "배송 가능" 으로 복원 — 다른 case 영향 방지.
    if (c.kind === 'disable') {
      await clickSegmentedButtonByTextStep('배송 가능', 'restore_enabled')(page, {}).catch(() => undefined);
    }
    expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
  });
}
