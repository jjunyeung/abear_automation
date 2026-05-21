/**
 * Tosstoss 신청서 필드 입력 검증 (통합본).
 *
 * 대응 ATC: atcs/settings/da-input.atc.yml
 * TC 원본 : Case No 1384~1410 / 배송대행지 › 신청서 작성 / P0 (16건)
 *
 * 16개 da-input-<field>.spec.ts 를 1개로 통합. CASES 배열에 16개 필드 등록.
 * 각 필드는 별도 test() 로 실행됨.
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

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'delivery-agency', 'da-input.atc.yml');

interface InputCase {
  tcNo: number;
  /** spec 제목용 짧은 식별자 (예: 'address', 'brand-model') */
  id: string;
  /** placeholder 매칭 regex source */
  placeholder_regex: string;
  /** 입력할 테스트 값 */
  value: string;
  /** 실패 시 reporter 에 기록할 error key */
  error_key: string;
}

const CASES: InputCase[] = [
  { tcNo: 1384, id: 'purchase-url',       placeholder_regex: '원본\\s*상품의\\s*URL',              value: 'https://item.taobao.com/item.htm?id=12345', error_key: 'purchase_url_fill_failed' },
  { tcNo: 1385, id: 'purchase-order-no',  placeholder_regex: '구매한\\s*주문번호',                 value: 'PO-987654',                                  error_key: 'purchase_order_no_fill_failed' },
  { tcNo: 1386, id: 'tracking-number',    placeholder_regex: '중국\\s*운송사의\\s*운송번호',       value: 'CN1234567890',                               error_key: 'tracking_number_fill_failed' },
  { tcNo: 1391, id: 'unit-price',         placeholder_regex: '단가를\\s*입력해주세요\\.\\s*\\(CNY\\)', value: '100',                                      error_key: 'unit_price_fill_failed' },
  { tcNo: 1392, id: 'quantity',           placeholder_regex: '수량을\\s*입력해주세요\\.$',         value: '5',                                          error_key: 'quantity_fill_failed' },
  { tcNo: 1393, id: 'brand-model',        placeholder_regex: 'Apple\\s*2023\\s*MacBook',          value: 'Apple Test Model 2026',                      error_key: 'brand_model_fill_failed' },
  { tcNo: 1394, id: 'color',              placeholder_regex: '색상을\\s*입력해\\s*주세요',         value: 'Red',                                        error_key: 'color_fill_failed' },
  { tcNo: 1395, id: 'size',               placeholder_regex: '사이즈를\\s*입력해\\s*주세요',       value: 'M',                                          error_key: 'size_fill_failed' },
  { tcNo: 1400, id: 'receiver-name',      placeholder_regex: '이름을\\s*입력해주세요',             value: '홍길동',                                     error_key: 'receiver_name_fill_failed' },
  { tcNo: 1401, id: 'receiver-phone',     placeholder_regex: '연락처를\\s*입력해주세요',           value: '01012345678',                                error_key: 'receiver_phone_fill_failed' },
  { tcNo: 1402, id: 'customs-id',         placeholder_regex: '개인통관고유부호',                   value: 'P123456789012',                              error_key: 'customs_id_fill_failed' },
  { tcNo: 1404, id: 'zip-code',           placeholder_regex: '우편번호를\\s*입력해주세요',         value: '12345',                                      error_key: 'zip_code_fill_failed' },
  { tcNo: 1405, id: 'address',            placeholder_regex: '주소를\\s*입력해주세요',             value: '서울시 강남구 테헤란로 123',                 error_key: 'address_fill_failed' },
  { tcNo: 1406, id: 'address-detail',     placeholder_regex: '상세주소를\\s*입력해주세요',         value: '4층 401호',                                  error_key: 'address_detail_fill_failed' },
  { tcNo: 1408, id: 'free-text-request',  placeholder_regex: '직접입력\\s*선택\\s*시\\s*입력',     value: '깨지지 않게 포장',                           error_key: 'free_text_request_fill_failed' },
  { tcNo: 1410, id: 'center-request',     placeholder_regex: '요청\\s*사항이\\s*있다면\\s*입력해\\s*주세요', value: '특별 포장 부탁',                       error_key: 'center_request_fill_failed' },
];

function asInput(inputs: Record<string, unknown>, key: string): string {
  const v = inputs[key];
  if (typeof v !== 'string' || v.length === 0) {
    throw new Error(`inputs.${key} 가 string 이 아니거나 비어있음: ${String(v)}`);
  }
  return v;
}

const fillAndVerifyStep: StepHandler = async (page, inputs) => {
  const placeholderRegex = asInput(inputs, 'placeholder_regex');
  const value = asInput(inputs, 'value');
  const errorKey = asInput(inputs, 'error_key');
  const r = await fillInputByPlaceholder(page, new RegExp(placeholderRegex), value);
  if (!r.ok) {
    return { ok: false as const, error_key: errorKey as ErrorKey, message: r.reason };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_tosstoss_application: goToTosstossApplicationStep,
  add_manual_form: addManualFormStep,
  fill_and_verify: fillAndVerifyStep,
};

// Hybrid mode:
//   - GUI/CLI 가 ATC_INPUT_PLACEHOLDER_REGEX + ATC_INPUT_VALUE + ATC_INPUT_ERROR_KEY 제공 → 그 1건만 실행
//   - env 미제공 → CASES 16개 필드 전체 실행
const envPlaceholderRegex = process.env['ATC_INPUT_PLACEHOLDER_REGEX'];
const envValue = process.env['ATC_INPUT_VALUE'];
const envErrorKey = process.env['ATC_INPUT_ERROR_KEY'];
const singleRun = envPlaceholderRegex && envValue && envErrorKey;

if (singleRun) {
  test(`토스토스 신청서 입력 (env 단일 실행: /${envPlaceholderRegex}/ = ${envValue})`, async ({ page }) => {
    test.setTimeout(3 * 60_000);
    const atc = loadATC(ATC_PATH);
    const result = await runATC({
      atc,
      page,
      inputs: { placeholder_regex: envPlaceholderRegex, value: envValue, error_key: envErrorKey },
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
    test(`#${c.tcNo} 토스토스 신청서 ${c.id} 입력`, async ({ page }) => {
      test.setTimeout(3 * 60_000);
      const atc = loadATC(ATC_PATH);
      const result = await runATC({
        atc,
        page,
        inputs: { placeholder_regex: c.placeholder_regex, value: c.value, error_key: c.error_key },
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
