/**
 * Tosstoss 신청서 옵션 조건부 cascade 검증 (통합본).
 *
 * 대응 ATC : atcs/settings/da-cascade.atc.yml
 * TC 원본  : Case No 1412~1438 / 배송대행지 › 신청서 작성 › 옵션 조건부 선택 / P0 (27건)
 *
 * 27개 da-cascade-NNNN.spec.ts 를 1개로 통합. CASES 배열에 27 조합 등록.
 * 각 조합은 별도 test() 로 실행되므로 Playwright 리포트에서 개별 결과 확인 가능.
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
  goToTosstossApplicationStep,
  addManualFormStep,
  selectDropdownOption,
} from './_da-application-handlers';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'delivery-agency', 'da-cascade.atc.yml');

interface CascadeCase {
  tcNo: number;
  region: string;    // regex source (alternation 가능: '웨이하이B2B|웨이하이|B2B')
  shipping: string;
  customs: string;
}

const CASES: CascadeCase[] = [
  { tcNo: 1412, region: '칭다오', shipping: '허브넷해상|해운', customs: '목록통관' },
  { tcNo: 1413, region: '칭다오', shipping: '허브넷해상|해운', customs: '일반통관|사업자통관' },
  { tcNo: 1414, region: '칭다오', shipping: '허브넷해상|해운', customs: '화물사업자통관' },
  { tcNo: 1415, region: '칭다오', shipping: '자이언트해상', customs: '목록통관' },
  { tcNo: 1416, region: '칭다오', shipping: '자이언트해상', customs: '일반통관|사업자통관' },
  { tcNo: 1417, region: '칭다오', shipping: '항공', customs: '목록통관' },
  { tcNo: 1418, region: '칭다오', shipping: '항공', customs: '일반통관|사업자통관' },
  { tcNo: 1419, region: '광저우', shipping: '해운', customs: '목록통관' },
  { tcNo: 1420, region: '광저우', shipping: '해운', customs: '일반통관|사업자통관' },
  { tcNo: 1421, region: '광저우', shipping: '해운', customs: '화물사업자통관' },
  { tcNo: 1422, region: '광저우', shipping: '항공', customs: '목록통관' },
  { tcNo: 1423, region: '광저우', shipping: '항공', customs: '일반통관|사업자통관' },
  { tcNo: 1424, region: '광저우', shipping: '알뜰항공', customs: '목록통관' },
  { tcNo: 1425, region: '광저우', shipping: '알뜰항공', customs: '일반통관|사업자통관' },
  { tcNo: 1426, region: '웨이하이B2B|웨이하이|B2B', shipping: '해운', customs: '목록통관' },
  { tcNo: 1427, region: '웨이하이B2B|웨이하이|B2B', shipping: '해운', customs: '일반통관|사업자통관' },
  { tcNo: 1428, region: '웨이하이B2B|웨이하이|B2B', shipping: '해운', customs: '화물사업자통관' },
  { tcNo: 1429, region: '웨이하이B2B|웨이하이|B2B', shipping: '평택해운', customs: '목록통관' },
  { tcNo: 1430, region: '웨이하이B2B|웨이하이|B2B', shipping: '평택해운', customs: '일반통관|사업자통관' },
  { tcNo: 1431, region: '웨이하이B2B|웨이하이|B2B', shipping: '항공', customs: '목록통관' },
  { tcNo: 1432, region: '웨이하이B2B|웨이하이|B2B', shipping: '항공', customs: '일반통관|사업자통관' },
  { tcNo: 1433, region: '오리건', shipping: '항공', customs: '목록통관|일반통관|사업자통관' },
  { tcNo: 1434, region: '캘리포니아', shipping: '항공', customs: '목록통관|일반통관|사업자통관' },
  { tcNo: 1435, region: '영국', shipping: '항공', customs: '목록통관|일반통관|사업자통관' },
  { tcNo: 1436, region: '독일', shipping: '항공', customs: '목록통관|일반통관|사업자통관' },
  { tcNo: 1437, region: '도쿄', shipping: '항공', customs: '목록통관|일반통관' },
  { tcNo: 1438, region: '도쿄', shipping: '항공', customs: '사업자통관' },
];

function asInput(inputs: Record<string, unknown>, key: string): string {
  const v = inputs[key];
  if (typeof v !== 'string' || v.length === 0) {
    throw new Error(`inputs.${key} 가 string 이 아니거나 비어있음: ${String(v)}`);
  }
  return v;
}

const selectRegionStep: StepHandler = async (page, inputs) => {
  const region = asInput(inputs, 'region');
  const r = await selectDropdownOption(page, /지점을\s*선택해\s*주세요/, new RegExp(`^(${region})$`));
  if (!r.ok) return { ok: false as const, error_key: 'region_select_failed' as ErrorKey, message: r.reason };
  await page.waitForTimeout(800);
  return { ok: true as const };
};

const selectShippingStep: StepHandler = async (page, inputs) => {
  const shipping = asInput(inputs, 'shipping');
  const r = await selectDropdownOption(page, /운송방법을\s*선택해\s*주세요/, new RegExp(`^(${shipping})$`));
  if (!r.ok) return { ok: false as const, error_key: 'shipping_select_failed' as ErrorKey, message: r.reason };
  await page.waitForTimeout(600);
  return { ok: true as const };
};

const selectCustomsStep: StepHandler = async (page, inputs) => {
  const customs = asInput(inputs, 'customs');
  const r = await selectDropdownOption(page, /통관방법을\s*선택해\s*주세요/, new RegExp(`^(${customs})$`));
  if (!r.ok) return { ok: false as const, error_key: 'customs_select_failed' as ErrorKey, message: r.reason };
  await page.waitForTimeout(600);
  return { ok: true as const };
};

const verifyAdditionalDisabledStep: StepHandler = async (page) => {
  const header = page.getByText(/부가\s*서비스\s*요청/).first();
  try {
    await header.waitFor({ state: 'visible', timeout: 5_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'additional_service_section_missing' as ErrorKey,
      message: '부가 서비스 요청 섹션 미노출',
    };
  }
  const disabledCnt = await page.locator('input[type="checkbox"]:disabled, input[type="radio"]:disabled').count();
  if (disabledCnt < 1) {
    return {
      ok: false as const,
      error_key: 'no_disabled_options' as ErrorKey,
      message: 'disabled checkbox/radio 0건 (기대 ≥1, 조건부 비활성 옵션 미반영)',
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_tosstoss_application: goToTosstossApplicationStep,
  add_manual_form: addManualFormStep,
  select_region: selectRegionStep,
  select_shipping: selectShippingStep,
  select_customs: selectCustomsStep,
  verify_additional_disabled: verifyAdditionalDisabledStep,
};

// Hybrid mode:
//   - GUI 또는 CLI 가 ATC_INPUT_REGION/SHIPPING/CUSTOMS 모두 제공 → 그 1건만 실행
//   - env 미제공 (npx playwright test 직접 호출) → CASES 27건 전체 실행
const envRegion = process.env['ATC_INPUT_REGION'];
const envShipping = process.env['ATC_INPUT_SHIPPING'];
const envCustoms = process.env['ATC_INPUT_CUSTOMS'];
const singleRun = envRegion && envShipping && envCustoms;

if (singleRun) {
  test(`토스토스 ${envRegion}/${envShipping}/${envCustoms} 옵션 (env 단일 실행)`, async ({ page }) => {
    test.setTimeout(3 * 60_000);
    const atc = loadATC(ATC_PATH);
    const result = await runATC({
      atc,
      page,
      inputs: { region: envRegion, shipping: envShipping, customs: envCustoms },
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
    test(`#${c.tcNo} 토스토스 ${c.region}/${c.shipping}/${c.customs} 옵션`, async ({ page }) => {
      test.setTimeout(3 * 60_000);
      const atc = loadATC(ATC_PATH);
      const result = await runATC({
        atc,
        page,
        inputs: { region: c.region, shipping: c.shipping, customs: c.customs },
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
