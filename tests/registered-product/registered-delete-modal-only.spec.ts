/**
 * 등록상품 삭제 모달 — 단일 마켓 체크 후 삭제 버튼 활성 검증 (통합본).
 *
 * 대응 ATC : atcs/upload/registered-delete-modal-only.atc.yml
 * TC 원본  : Case 948~962 / 등록상품 › 상품 삭제 › 상품리스크진단 / P0 (15건)
 *
 * 5개 registered-delete-modal-only-<market>.spec.ts 를 1개로 통합.
 * CASES 배열에 5 마켓 등록.
 *
 * Hybrid 모드:
 *   - ATC_INPUT_MARKET_KEY 제공 시 → 그 1 마켓만 실행
 *   - env 미제공 → CASES 5개 마켓 전체 실행
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
  openRegisteredListStep,
  selectFirstProductStep,
} from '../smartstore-customs-tax/_bulk-edit-handlers';
import {
  clickDeleteToolbarStep,
  checkOnlyMarketStep,
  verifyDeleteEnabledStep,
  closeDeleteModalStep,
  MARKET_LABEL,
} from './_delete-modal-handlers';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'registered-product', 'registered-delete-modal-only.atc.yml');

interface DeleteCase {
  /** spec 제목용 식별자 (예: 'coupang', 'lotte-on') */
  id: string;
  /** MARKET_LABEL 키 (예: 'coupang', 'lotteOn' — camelCase) */
  market_key: keyof typeof MARKET_LABEL;
  /** 원본 spec 의 TC 번호 (3건씩 묶음) */
  tcNos: number[];
}

const CASES: DeleteCase[] = [
  { id: 'smartstore', market_key: 'smartstore', tcNos: [948, 949, 950] },
  { id: 'coupang',    market_key: 'coupang',    tcNos: [951, 952, 953] },
  { id: 'esm',        market_key: 'esm',        tcNos: [954, 955, 956] },
  { id: 'street',     market_key: 'street',     tcNos: [957, 958, 959] },
  { id: 'lotte-on',   market_key: 'lotteOn',    tcNos: [960, 961, 962] },
];

function asInput(inputs: Record<string, unknown>, key: string): string {
  const v = inputs[key];
  if (typeof v !== 'string' || v.length === 0) {
    throw new Error(`inputs.${key} 가 string 이 아니거나 비어있음: ${String(v)}`);
  }
  return v;
}

function buildHandlersFor(marketKey: string): StepHandlers {
  const label = (MARKET_LABEL as Record<string, RegExp | undefined>)[marketKey];
  if (!label) {
    throw new Error(`MARKET_LABEL 에 없는 market_key: ${marketKey} (사용 가능: ${Object.keys(MARKET_LABEL).join(', ')})`);
  }
  return {
    open_registered_list: openRegisteredListStep,
    select_first_product: selectFirstProductStep,
    open_delete_modal: clickDeleteToolbarStep,
    check_only_market: checkOnlyMarketStep(label),
    verify_delete_enabled: verifyDeleteEnabledStep,
    close_modal: closeDeleteModalStep,
  };
}

/**
 * Resolve market_key from runtime inputs.
 * Used by handler-less step injection — but here we build handlers per-case
 * since check_only_market binds the market label at handler-build time.
 */
const validateMarketKeyStep: StepHandler = async (_page, inputs) => {
  const k = asInput(inputs, 'market_key');
  if (!(k in MARKET_LABEL)) {
    return {
      ok: false as const,
      error_key: 'invalid_market_key' as ErrorKey,
      message: `MARKET_LABEL 에 없는 market_key: ${k}`,
    };
  }
  return { ok: true as const };
};
void validateMarketKeyStep; // 현재는 buildHandlersFor 에서 검증 — 미래 dynamic 분기용

// Hybrid mode 체크
const envMarketKey = process.env['ATC_INPUT_MARKET_KEY'];

if (envMarketKey) {
  test(`등록상품 삭제 모달 — ${envMarketKey} 단독 (env 단일 실행)`, async ({ page }) => {
    test.setTimeout(3 * 60_000);
    const atc = loadATC(ATC_PATH);
    const result = await runATC({
      atc,
      page,
      inputs: { market_key: envMarketKey },
      handlers: buildHandlersFor(envMarketKey),
    });
    await test.info().attach('atc-result', {
      body: JSON.stringify(result),
      contentType: 'application/json',
    });
    expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
  });
} else {
  for (const c of CASES) {
    test(`등록상품 삭제 모달 — ${c.id} 단독 (TC#${c.tcNos.join(',')})`, async ({ page }) => {
      test.setTimeout(3 * 60_000);
      const atc = loadATC(ATC_PATH);
      const result = await runATC({
        atc,
        page,
        inputs: { market_key: c.market_key },
        handlers: buildHandlersFor(c.market_key),
      });
      await test.info().attach('atc-result', {
        body: JSON.stringify(result),
        contentType: 'application/json',
      });
      expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
    });
  }
}
