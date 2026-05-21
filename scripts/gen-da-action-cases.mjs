#!/usr/bin/env node
/**
 * Tosstoss 신청서 드롭다운 + 클릭/체크 P0 batch generator.
 *
 * 각 케이스 정의:
 *   - type: 'dropdown' (placeholder 매칭 후 첫 옵션) | 'cascade' (이전 dropdown(s) 선택 후) |
 *           'toggle' (label 텍스트 매칭 후 click) | 'visible' (label 가시만)
 *
 * 사용: node scripts/gen-da-action-cases.mjs
 */

import { writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const CASES = [
  // === 드롭다운 (cascade 포함) ===
  {
    caseNo: 1398, slug: 'dropdown-shipping', field: '운송방법', type: 'cascade',
    cascade: [{
      placeholderRe: '지점을\\s*선택해\\s*주세요',
      optionTextRe: '^(칭다오|광저우|웨이하이B2B|오리건|캘리포니아|영국|독일|도쿄)$',
    }],
    placeholderRe: '운송방법을\\s*선택해\\s*주세요',
    optionTextRe: '^(허브넷해상|자이언트해상|항공|평택해운|알뜰항공|해운)$',
  },
  {
    caseNo: 1399, slug: 'dropdown-customs', field: '통관방법', type: 'cascade',
    cascade: [
      { placeholderRe: '지점을\\s*선택해\\s*주세요', optionTextRe: '^(칭다오|광저우|웨이하이B2B|오리건|캘리포니아|영국|독일|도쿄)$' },
      { placeholderRe: '운송방법을\\s*선택해\\s*주세요', optionTextRe: '^(허브넷해상|자이언트해상|항공|평택해운|알뜰항공|해운)$' },
    ],
    placeholderRe: '통관방법을\\s*선택해\\s*주세요',
    optionTextRe: '^(목록통관|일반통관|사업자통관|화물사업자통관)$',
  },
  {
    caseNo: 1454, slug: 'dropdown-shop', field: '국내 쇼핑몰', type: 'dropdown',
    placeholderRe: '쇼핑몰\\s*선택',
    // DOMESTIC_POST_COMPANY_OPTION_SET 의 일반적 옵션 — 직접입력 외 첫 매치.
    optionTextRe: '^(네이버|쿠팡|11번가|G마켓|옥션|티몰|타오바오|스마트스토어|인스타|블로그|이메일|문자|배송|기타)$',
  },

  // === 체크박스 / 라디오 (label 텍스트 클릭) ===
  {
    caseNo: 1452, slug: 'toggle-fta', field: 'FTA 세율 적용', type: 'toggle',
    labelRe: '현지\\s*FTA\\s*세율\\s*적용\\s*여부',
  },
  {
    caseNo: 1453, slug: 'radio-duty-sms', field: '관부가세 안내문자 수령인', type: 'toggle',
    labelRe: '^\\s*수령인\\s*$',
  },
  {
    caseNo: 1451, slug: 'radio-weight-prepaid', field: '중량선불', type: 'toggle',
    labelRe: '^\\s*중량선불\\s*$',
  },
  {
    caseNo: 1456, slug: 'toggle-caution-agree', field: '주의사항 동의', type: 'toggle',
    labelRe: '모든\\s*내용을\\s*확인했으며',
  },

  // === 가시 검증 (click 안 함, 위험 회피) ===
  {
    caseNo: 1457, slug: 'submit-button-visible', field: '신청완료 버튼 가시', type: 'visible',
    labelRe: '^\\s*저장\\s*$',
  },
];

function makeYaml(c) {
  let stepBlock = `  - id: open_tosstoss_application
    do: app.windly.cc/view3/delivery-agency/application?agency=tosstoss 직접 이동

  - id: add_manual_form
    do: 수동으로 추가하기 버튼 클릭
`;
  if (c.type === 'cascade') {
    c.cascade.forEach((s, i) => {
      stepBlock += `
  - id: cascade_step_${i + 1}
    do: 선행 드롭다운 ${i + 1} 선택 (placeholder ${s.placeholderRe})
`;
    });
    stepBlock += `
  - id: select_target_dropdown
    do: ${c.field} 드롭다운 클릭 후 첫 옵션 선택
    expect: SelectedBox 텍스트 변경
`;
  } else if (c.type === 'dropdown') {
    stepBlock += `
  - id: select_target_dropdown
    do: ${c.field} 드롭다운 클릭 후 첫 옵션 선택
    expect: SelectedBox 텍스트 변경
`;
  } else if (c.type === 'toggle') {
    stepBlock += `
  - id: toggle_target
    do: ${c.field} 라벨 텍스트 클릭 (체크박스/라디오 토글)
    expect: 클릭 동작 성공
`;
  } else if (c.type === 'visible') {
    stepBlock += `
  - id: verify_visible
    do: ${c.field} 가시 검증 (클릭 안 함)
    expect: 라벨 텍스트 visible
`;
  }
  return `# Tosstoss 신청서 ${c.field} 동작 검증.
#
# 출처: TC export Case ${c.caseNo} "${c.field}" (P0)
# 코드 출처: windly-frontend-web/src/features/DeliveryAgencyApplication/Tosstoss/...

title: 배송대행지 토스토스 신청서 ${c.field} 검증

description: |
  ${c.field} 동작 검증. (자동 생성)
  TC 원본: Case No ${c.caseNo} / 배송대행지 › 신청서 작성 / P0

inputs: {}

steps:
${stepBlock}
expected: ${c.field} 동작. unhandled 0건.
`;
}

function makeSpec(c) {
  const errKey = c.slug.replace(/-/g, '_');
  let extraImports = '';
  let stepHandlers = '';
  let handlersMap = '';
  if (c.type === 'cascade') {
    extraImports = `selectDropdownOption,`;
    c.cascade.forEach((s, i) => {
      stepHandlers += `
const cascadeStep${i + 1}: StepHandler = async (page) => {
  const r = await selectDropdownOption(page, /${s.placeholderRe}/, /${s.optionTextRe}/);
  if (!r.ok) return { ok: false as const, error_key: 'cascade_${i + 1}_failed' as ErrorKey, message: r.reason };
  await page.waitForTimeout(800);
  return { ok: true as const };
};`;
      handlersMap += `\n  cascade_step_${i + 1}: cascadeStep${i + 1},`;
    });
    stepHandlers += `
const selectTargetDropdownStep: StepHandler = async (page) => {
  const r = await selectDropdownOption(page, /${c.placeholderRe}/, /${c.optionTextRe}/);
  if (!r.ok) return { ok: false as const, error_key: '${errKey}_failed' as ErrorKey, message: r.reason };
  return { ok: true as const };
};`;
    handlersMap += `\n  select_target_dropdown: selectTargetDropdownStep,`;
  } else if (c.type === 'dropdown') {
    extraImports = `selectDropdownOption,`;
    stepHandlers = `
const selectTargetDropdownStep: StepHandler = async (page) => {
  const r = await selectDropdownOption(page, /${c.placeholderRe}/, /${c.optionTextRe}/);
  if (!r.ok) return { ok: false as const, error_key: '${errKey}_failed' as ErrorKey, message: r.reason };
  return { ok: true as const };
};`;
    handlersMap = `\n  select_target_dropdown: selectTargetDropdownStep,`;
  } else if (c.type === 'toggle') {
    extraImports = `toggleByLabelText,`;
    stepHandlers = `
const toggleTargetStep: StepHandler = async (page) => {
  const r = await toggleByLabelText(page, /${c.labelRe}/);
  if (!r.ok) return { ok: false as const, error_key: '${errKey}_failed' as ErrorKey, message: r.reason };
  return { ok: true as const };
};`;
    handlersMap = `\n  toggle_target: toggleTargetStep,`;
  } else if (c.type === 'visible') {
    stepHandlers = `
const verifyVisibleStep: StepHandler = async (page) => {
  const el = page.getByText(/${c.labelRe}/).first();
  try {
    await el.waitFor({ state: 'visible', timeout: 5_000 });
    return { ok: true as const };
  } catch {
    return { ok: false as const, error_key: '${errKey}_missing' as ErrorKey, message: 'label 텍스트 미노출' };
  }
};`;
    handlersMap = `\n  verify_visible: verifyVisibleStep,`;
  }

  return `/**
 * Tosstoss 신청서 ${c.field} 검증.
 *
 * 대응 ATC : atcs/settings/da-${c.slug}.atc.yml
 * TC 원본  : Case No ${c.caseNo} / 배송대행지 › 신청서 작성 / P0
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
  ${extraImports}
} from './_da-application-handlers';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'settings', 'da-${c.slug}.atc.yml');
${stepHandlers}

const handlers: StepHandlers = {
  open_tosstoss_application: goToTosstossApplicationStep,
  add_manual_form: addManualFormStep,${handlersMap}
};

test('토스토스 신청서 ${c.field}', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
`;
}

for (const c of CASES) {
  writeFileSync(join(ROOT, 'atcs/settings', `da-${c.slug}.atc.yml`), makeYaml(c), 'utf8');
  writeFileSync(join(ROOT, 'tests/settings', `da-${c.slug}.spec.ts`), makeSpec(c), 'utf8');
}
process.stdout.write(`Generated ${CASES.length} ATC + spec pairs.\n`);
