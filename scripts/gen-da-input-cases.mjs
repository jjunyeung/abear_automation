#!/usr/bin/env node
/**
 * Tosstoss 신청서 단순 입력 P0 17건 generator.
 *
 * 각 케이스 = (1) 페이지 진입 (2) 수동 추가 (3) placeholder input fill + value 검증.
 * placeholder 매핑은 windly_repo/.../Tosstoss/{Product/components/InputForm.tsx, Receiver/index.tsx} 에서 직접 확인.
 *
 * 사용: node scripts/gen-da-input-cases.mjs
 *   atcs/settings/da-input-*.atc.yml  17개
 *   tests/settings/da-input-*.spec.ts 17개 생성.
 */

import { writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Case definitions. `slug` 로 파일명 + ATC title, `caseNo` 로 TC 참조,
 * `field` 는 사람이 보는 라벨, `placeholderRe` 는 selector, `value` 는 테스트 입력값.
 */
const CASES = [
  { caseNo: 1384, slug: 'purchase-url',       field: '구매 사이트 URL',  placeholderRe: '원본\\s*상품의\\s*URL', value: 'https://item.taobao.com/item.htm?id=12345' },
  { caseNo: 1385, slug: 'purchase-order-no',  field: '구매 주문번호',     placeholderRe: '구매한\\s*주문번호',     value: 'PO-987654' },
  { caseNo: 1386, slug: 'tracking-number',    field: '트래킹번호',       placeholderRe: '중국\\s*운송사의\\s*운송번호', value: 'CN1234567890' },
  // 카테고리는 search dropdown — value 검증이 다르므로 skip (별도 케이스).
  // 1389/1390 영문/영중문 상품명: readonly — 카테고리 선택 후 자동 채워짐. 직접 입력 자동화 불가능.
  //   별도 케이스 (category-select-fills-name) 로 분리해야 함. 17건 batch 에서 제외.
  { caseNo: 1391, slug: 'unit-price',         field: '단가',           placeholderRe: '단가를\\s*입력해주세요\\.\\s*\\(CNY\\)', value: '100' },
  { caseNo: 1392, slug: 'quantity',           field: '수량',           placeholderRe: '수량을\\s*입력해주세요\\.$', value: '5' },
  { caseNo: 1393, slug: 'brand-model',        field: '브랜드 및 모델명',  placeholderRe: 'Apple\\s*2023\\s*MacBook', value: 'Apple Test Model 2026' },
  { caseNo: 1394, slug: 'color',              field: '색상',           placeholderRe: '색상을\\s*입력해\\s*주세요', value: 'Red' },
  { caseNo: 1395, slug: 'size',               field: '사이즈',          placeholderRe: '사이즈를\\s*입력해\\s*주세요', value: 'M' },
  { caseNo: 1400, slug: 'receiver-name',      field: '이름 (수령인)',    placeholderRe: '이름을\\s*입력해주세요',  value: '홍길동' },
  // 연락처 input 은 dash 자동 strip 또는 format 변형 가능. 숫자만으로 입력.
  { caseNo: 1401, slug: 'receiver-phone',     field: '연락처',          placeholderRe: '연락처를\\s*입력해주세요', value: '01012345678' },
  { caseNo: 1402, slug: 'customs-id',         field: '개인통관고유부호',  placeholderRe: '개인통관고유부호',       value: 'P123456789012' },
  { caseNo: 1404, slug: 'zip-code',           field: '우편번호',         placeholderRe: '우편번호를\\s*입력해주세요', value: '12345' },
  { caseNo: 1405, slug: 'address',            field: '주소',           placeholderRe: '주소를\\s*입력해주세요',  value: '서울시 강남구 테헤란로 123' },
  { caseNo: 1406, slug: 'address-detail',     field: '상세주소',        placeholderRe: '상세주소를\\s*입력해주세요', value: '4층 401호' },
  { caseNo: 1408, slug: 'free-text-request',  field: '직접입력 요청사항',  placeholderRe: '직접입력\\s*선택\\s*시\\s*입력', value: '깨지지 않게 포장' },
];

function makeYaml(c) {
  return `# Tosstoss 신청서 ${c.field} 입력 검증.
#
# 출처: TC export Case ${c.caseNo} "${c.field}" (P0)
# 코드 출처: windly-frontend-web/src/features/DeliveryAgencyApplication/Tosstoss/...
# selector: placeholder regex 매칭.

title: 배송대행지 토스토스 신청서 ${c.field} 입력 검증

description: |
  Tosstoss 신청서 진입 + 수동 양식 추가 → ${c.field} 입력 필드에 값 입력 → 입력값 검증.
  TC 원본: Case No ${c.caseNo} / 배송대행지 › 신청서 작성 › ${c.field} / P0

inputs: {}

steps:
  - id: open_tosstoss_application
    do: app.windly.cc/view3/delivery-agency/application?agency=tosstoss 직접 이동

  - id: add_manual_form
    do: 수동으로 추가하기 버튼 클릭

  - id: fill_and_verify
    do: ${c.field} 입력 필드에 테스트 값 입력 후 inputValue 검증
    expect: 입력값 일치

expected: ${c.field} 입력 동작. unhandled 0건.
`;
}

function makeSpec(c) {
  return `/**
 * Tosstoss 신청서 ${c.field} 입력 검증.
 *
 * 대응 ATC : atcs/settings/da-input-${c.slug}.atc.yml
 * TC 원본  : Case No ${c.caseNo} / 배송대행지 › 신청서 작성 › ${c.field} / P0
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
  fillInputByPlaceholder,
} from './_da-application-handlers';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'settings',
  'da-input-${c.slug}.atc.yml',
);

const PLACEHOLDER_RE = /${c.placeholderRe}/;
const VALUE = ${JSON.stringify(c.value)};

const fillAndVerifyStep: StepHandler = async (page) => {
  const r = await fillInputByPlaceholder(page, PLACEHOLDER_RE, VALUE);
  if (!r.ok) {
    return {
      ok: false as const,
      error_key: '${c.slug.replace(/-/g, '_')}_fill_failed' as ErrorKey,
      message: r.reason,
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_tosstoss_application: goToTosstossApplicationStep,
  add_manual_form: addManualFormStep,
  fill_and_verify: fillAndVerifyStep,
};

test('토스토스 신청서 ${c.field} 입력', async ({ page }) => {
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
  const yml = makeYaml(c);
  const spec = makeSpec(c);
  const ymlPath = join(ROOT, 'atcs/settings', `da-input-${c.slug}.atc.yml`);
  const specPath = join(ROOT, 'tests/settings', `da-input-${c.slug}.spec.ts`);
  writeFileSync(ymlPath, yml, 'utf8');
  writeFileSync(specPath, spec, 'utf8');
}

process.stdout.write(`Generated ${CASES.length} ATC + spec pairs in atcs/settings + tests/settings.\n`);
