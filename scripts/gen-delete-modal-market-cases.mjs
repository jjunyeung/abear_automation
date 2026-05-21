#!/usr/bin/env node
/**
 * 등록상품 삭제 모달 — 단일 마켓 체크 후 삭제 버튼 활성 검증 generator.
 *
 * TC 원본 (P0, 등록상품 › 상품 삭제 › 상품리스크진단):
 *   - 948,949,950 스마트스토어 (사전조건 다름, 모달 동작 동일)
 *   - 951,952,953 쿠팡
 *   - 954,955,956 ESM 2.0
 *   - 957,958,959 11번가
 *   - 960,961,962 롯데온
 *
 * 자동화 범위 = 모달 진입 + 단일 마켓 체크 + 삭제 버튼 활성 검증 + 취소로 닫음.
 * 실제 삭제는 트리거하지 않음 (외부 마켓 시스템 의존 + 데이터 손실 위험).
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const MARKETS = [
  { id: 'smartstore', label: '스마트스토어', keyConst: 'smartstore', cases: [948, 949, 950] },
  { id: 'coupang', label: '쿠팡', keyConst: 'coupang', cases: [951, 952, 953] },
  { id: 'esm', label: 'ESM 2.0', keyConst: 'esm', cases: [954, 955, 956] },
  { id: 'street', label: '11번가', keyConst: 'street', cases: [957, 958, 959] },
  { id: 'lotte-on', label: '롯데온', keyConst: 'lotteOn', cases: [960, 961, 962] },
];

function makeAtc(m) {
  const caseList = m.cases.join(', ');
  return `# 등록상품 삭제 모달 — ${m.label} 단독 체크 후 삭제 버튼 활성 검증.
#
# TC 원본: Case ${caseList} / 등록상품 › 상품 삭제 › 상품리스크진단 / P0
#   (3 케이스 모두 사전조건만 다르고 모달 동작 자체는 동일)
#
# 자동화 범위: 모달 진입 + ${m.label} 단독 체크 + 삭제 버튼 활성 검증 + 취소로 닫음.
# 실제 삭제는 트리거하지 않음 (외부 마켓 시스템 + 데이터 손실 위험).

title: 등록상품 삭제 모달 — ${m.label} 단독 선택

description: |
  등록상품 첫 페이지 전체 선택 → 상품 삭제 → 모달에서 ${m.label} 만 체크 →
  삭제 버튼 활성 확인 → 취소로 닫음.
  TC 원본: Case ${caseList} (사전조건만 다른 P0 3건 cover)

inputs: {}

steps:
  - id: open_registered_list
    do: 등록상품 목록 페이지 진입

  - id: select_first_product
    do: 헤더 전체 선택 체크박스 클릭하여 1페이지 상품 모두 선택

  - id: open_delete_modal
    do: 툴바의 상품 삭제 버튼 클릭 → 모달 노출

  - id: check_only_market
    do: 모달에서 ${m.label} 체크박스만 체크
    expect: ${m.label} 만 체크된 상태

  - id: verify_delete_enabled
    do: 삭제 버튼 활성 확인 (클릭 X)
    expect: 마켓 1개 체크된 상태에서 삭제 버튼이 활성화됨

  - id: close_modal
    do: 취소 버튼 클릭하여 모달 닫음

expected: ${m.label} 단독 체크 + 삭제 버튼 활성 확인. 실제 삭제는 발생하지 않음.
`;
}

function makeSpec(m) {
  return `/**
 * 등록상품 삭제 모달 — ${m.label} 단독 체크 후 삭제 버튼 활성 검증.
 *
 * 대응 ATC: atcs/upload/registered-delete-modal-only-${m.id}.atc.yml
 * TC 원본: Case ${m.cases.join(', ')} / 등록상품 › 상품 삭제 › 상품리스크진단 / P0
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import {
  runATC,
  type StepHandlers,
} from '../../lib/runner';
import {
  openRegisteredListStep,
  selectFirstProductStep,
} from './_bulk-edit-handlers';
import {
  clickDeleteToolbarStep,
  checkOnlyMarketStep,
  verifyDeleteEnabledStep,
  closeDeleteModalStep,
  MARKET_LABEL,
} from './_delete-modal-handlers';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'upload', 'registered-delete-modal-only-${m.id}.atc.yml');

const handlers: StepHandlers = {
  open_registered_list: openRegisteredListStep,
  select_first_product: selectFirstProductStep,
  open_delete_modal: clickDeleteToolbarStep,
  check_only_market: checkOnlyMarketStep(MARKET_LABEL.${m.keyConst}),
  verify_delete_enabled: verifyDeleteEnabledStep,
  close_modal: closeDeleteModalStep,
};

test('등록상품 삭제 모달 — ${m.label} 단독', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
`;
}

for (const m of MARKETS) {
  const atcPath = join(ROOT, 'atcs/upload', `registered-delete-modal-only-${m.id}.atc.yml`);
  const specPath = join(ROOT, 'tests/upload', `registered-delete-modal-only-${m.id}.spec.ts`);
  writeFileSync(atcPath, makeAtc(m));
  writeFileSync(specPath, makeSpec(m));
  console.log('✓ ' + atcPath);
  console.log('✓ ' + specPath);
}

console.log(`\n생성 완료: ${MARKETS.length} ATC + ${MARKETS.length} spec`);
