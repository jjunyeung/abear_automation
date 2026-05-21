/**
 * 기본 설정 > 공통설정 > 판매가 — 3개 필드를 1 step 만큼만 변경 후 저장/영속성 검증.
 *
 * 대응 ATC: atcs/e2e/edit-base-common-price.atc.yml
 *
 * Selector 출처 (windly-frontend-web):
 *   - src/features/BaseSetting/Common/PriceSettingTab/PriceAndProfit/index.tsx
 *       3개 TextField — label "판매가 단위(올림)" / "판매처 수수료" / "판매가 할인율"
 *   - src/components/Field/index.tsx
 *       <FieldWrapper> 안에 <LabelBox>{label}</LabelBox> 와 input 이 형제. label 을
 *       getByText 로 잡고 ancestor (= FieldWrapper) 에서 input 을 찾는 패턴 사용.
 *
 * "1 step 만큼만 변동" 의도:
 *   formattingOptions.ts 의 unit (SalesPriceRoundingMultipleOption=100,
 *   NaverSmartStoreFeeOption=0.01, DiscountRateOption=1) 만큼 ±. max 면 -, 그 외에는 +.
 *   화면에 표시되는 값(% 의 경우 fraction × 100)을 기준으로 동작.
 */

import { join } from 'path';
import type { Locator, Page } from '@playwright/test';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'base-setting',
  'edit-base-common-price.atc.yml',
);

const PRICE_URL =
  'https://app.windly.cc/view3/base-setting?setting=COMMON&category=PRICE_SETTING';

// ─────────────────────────────────────────────────────────────────────────────
// 필드 메타 — label, step (unit), min/max, 표시값 파서, 새 값 → 입력 문자열
// ─────────────────────────────────────────────────────────────────────────────

type FieldKey =
  | 'rounding'
  | 'market_fee'
  | 'discount_rate'
  | 'alipay_fee'
  | 'third_party_shipping'
  | 'margin'
  | 'tariff_rate'
  | 'tariff_base_price';

interface FieldMeta {
  label: string;
  /** unit 'percent' | 'krw' | 'auto' (auto = 화면의 SupportTextBox 텍스트로 감지 — 마진). */
  kind: 'percent' | 'krw' | 'auto';
  /** auto 인 경우 무시. percent → 1, krw → 100. */
  step?: number;
  min: number;
  max: number;
  /** 소수 자리수 (display 기준). 사용자 요청: 정수 step 만 — 모두 0. */
  decimals: number;
}

// 변동량은 사용자 의도에 맞춰 통일: 원 = +100, % = +1.
// (formattingOptions.ts 의 unit 보다 커도 PRICE 의 100 / PERCENT 의 1 은
//  여전히 작은 변동이며 clamp/round 규칙도 그대로 만족.)
//
// 환율 설정(ExchangeRate)은 통화별 dynamic 이고 수집가격 계산에 직결되어 영향이 커서 제외.
// 마진(margin) 은 marginType=RATE/AMOUNT 에 따라 unit 이 % 또는 원 으로 바뀌어 화면에서 동적 결정.
const FIELDS: Record<FieldKey, FieldMeta> = {
  rounding:             { label: '판매가 단위(올림)',  kind: 'krw',     step: 100, min: 100, max: 10_000,    decimals: 0 },
  market_fee:           { label: '판매처 수수료',      kind: 'percent', step: 1,   min: 0,   max: 100,       decimals: 0 },
  discount_rate:        { label: '판매가 할인율',      kind: 'percent', step: 1,   min: 0,   max: 99,        decimals: 0 },
  alipay_fee:           { label: '구매처 수수료',      kind: 'percent', step: 1,   min: 0,   max: 100,       decimals: 0 },
  third_party_shipping: { label: '해외배송비(배대지)', kind: 'krw',     step: 100, min: 0,   max: 1_000_000, decimals: 0 },
  margin:               { label: '마진',               kind: 'auto',                min: 0,   max: 1_000_000, decimals: 0 },
  tariff_rate:          { label: '관세(%)',            kind: 'percent', step: 1,   min: 0,   max: 100,       decimals: 0 },
  tariff_base_price:    { label: '관세 적용 기준가',   kind: 'krw',     step: 100, min: 0,   max: 1_000_000, decimals: 0 },
};

const ALL_KEYS: FieldKey[] = [
  'rounding',
  'market_fee',
  'discount_rate',
  'alipay_fee',
  'third_party_shipping',
  'margin',
  'tariff_rate',
  'tariff_base_price',
];

/** "1,000" / "5" / "5.5" 같은 표시값 → number. 콤마 제거 후 parseFloat. */
function parseDisplayed(raw: string): number {
  const cleaned = raw.replace(/,/g, '').trim();
  if (cleaned === '') return NaN;
  return parseFloat(cleaned);
}

/** 표시값에 step을 더해서 새 값 결정. max 일 때만 -step. clamp(min, max) 적용. */
function bumpValue(current: number, meta: FieldMeta, effectiveStep: number, effectiveMax: number): number {
  const next = current >= effectiveMax ? current - effectiveStep : current + effectiveStep;
  const clamped = Math.min(effectiveMax, Math.max(meta.min, next));
  const factor = Math.pow(10, meta.decimals);
  return Math.round(clamped * factor) / factor;
}

/** number → input 에 fill 할 plain string (콤마 없음). decimals 만큼 trailing 0 유지 안 함. */
function toInputString(value: number, decimals: number): string {
  if (decimals === 0) return String(Math.round(value));
  // 0.01 step 이면 "5.01" / "5.5" / "5" 등. trailing 0 trim.
  return parseFloat(value.toFixed(decimals)).toString();
}

/**
 * label 텍스트에서 같은 FieldWrapper 안의 input 까지 도달.
 *
 * Field/index.tsx:
 *   <FieldWrapper>
 *     <LabelBox>{label}</LabelBox>     ← getByText 매치
 *     <FieldContainer>
 *       <input>                          ← 우리가 원하는 것
 *     </FieldContainer>
 *   </FieldWrapper>
 *
 * label 의 ancestor 중 "input 을 자손으로 가지는 가장 가까운 것" = FieldWrapper.
 */
function fieldInputByLabel(page: Page, label: string): Locator {
  return page
    .getByText(label, { exact: true })
    .locator('xpath=./ancestor::*[descendant::input][1]')
    .locator('input')
    .first();
}

/** label 텍스트 → 같은 FieldWrapper. SupportTextBox 의 unit ("원" 또는 "%") 검출 시 사용. */
function fieldWrapperByLabel(page: Page, label: string): Locator {
  return page
    .getByText(label, { exact: true })
    .locator('xpath=./ancestor::*[descendant::input][1]');
}

/**
 * 마진 같은 dynamic-unit 필드의 unit 감지. SupportTextBox 안 단독 "원" / "%" 텍스트.
 * Field/index.tsx: <SupportTextBox>{unit}</SupportTextBox>.
 */
async function detectFieldUnit(page: Page, label: string): Promise<'krw' | 'percent' | 'unknown'> {
  const wrapper = fieldWrapperByLabel(page, label);
  // SupportTextBox 의 단독 unit 텍스트만 매치 (label 텍스트와 충돌 X).
  const won = wrapper.getByText('원', { exact: true });
  const pct = wrapper.getByText('%', { exact: true });
  if ((await won.count()) > 0 && (await won.first().isVisible().catch(() => false))) return 'krw';
  if ((await pct.count()) > 0 && (await pct.first().isVisible().catch(() => false))) return 'percent';
  return 'unknown';
}

/** input 마운트 + 값 채워질 때까지 polling. */
async function waitInputLoaded(input: Locator, timeoutMs = 30_000): Promise<string> {
  await input.waitFor({ state: 'visible', timeout: timeoutMs });
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const v = await input.inputValue().catch(() => '');
    if (v.trim() !== '') return v;
    await input.page().waitForTimeout(300);
  }
  return await input.inputValue();
}

/** 한 필드를 1 step 만큼 변동 + 검증. 성공 시 { new: <표시 string> } 반환. */
async function bumpField(
  page: Page,
  key: FieldKey,
): Promise<
  | { ok: true; newValue: number; newDisplay: string }
  | { ok: false; error_key: ErrorKey; message: string }
> {
  const meta = FIELDS[key];
  const input = fieldInputByLabel(page, meta.label);

  const currentRaw = await waitInputLoaded(input);
  const current = parseDisplayed(currentRaw);
  if (!Number.isFinite(current)) {
    return {
      ok: false,
      error_key: 'price_input_unreadable' as ErrorKey,
      message: `"${meta.label}" 현재값 파싱 실패: "${currentRaw}"`,
    };
  }

  // step / max 결정 — 'auto' 인 경우 화면의 unit 텍스트로 판정.
  let effectiveStep: number;
  let effectiveMax: number;
  if (meta.kind === 'auto') {
    const detected = await detectFieldUnit(page, meta.label);
    if (detected === 'unknown') {
      return {
        ok: false,
        error_key: 'price_unit_undetectable' as ErrorKey,
        message: `"${meta.label}" 의 unit (원/%) 감지 실패`,
      };
    }
    effectiveStep = detected === 'percent' ? 1 : 100;
    // marginRate max 1000, marginAmount max 1000000 — meta.max 는 큰 값 (1000000) 으로 둠.
    effectiveMax = detected === 'percent' ? 1000 : meta.max;
  } else {
    effectiveStep = meta.step ?? 1;
    effectiveMax = meta.max;
  }

  const newValue = bumpValue(current, meta, effectiveStep, effectiveMax);
  if (newValue === current) {
    return {
      ok: false,
      error_key: 'price_bump_noop' as ErrorKey,
      message: `"${meta.label}" 새 값이 현재값과 동일 (range 또는 step 문제): current=${current}, step=${effectiveStep}, max=${effectiveMax}`,
    };
  }

  const newInputStr = toInputString(newValue, meta.decimals);
  logger.info(
    `[base-price] ${meta.label}: current="${currentRaw}" (${current}) → new="${newInputStr}" (${newValue})`,
  );

  // fill('') 후 fill(newInputStr). focus → blur 트리거를 위해 Tab.
  await input.click();
  await input.fill('');
  await input.fill(newInputStr);
  await input.press('Tab');

  // onBlur → handleUpdateBaseSetting(API) → state 갱신 → input reformat. 1.5 초 대기 후 polling.
  const start = Date.now();
  let after = '';
  while (Date.now() - start < 8_000) {
    await page.waitForTimeout(500);
    after = await input.inputValue().catch(() => '');
    const parsed = parseDisplayed(after);
    if (Math.abs(parsed - newValue) < effectiveStep / 2) {
      return { ok: true, newValue, newDisplay: after };
    }
  }
  return {
    ok: false,
    error_key: 'price_save_not_reflected' as ErrorKey,
    message: `"${meta.label}" 저장 후 input 값 미반영. expected≈${newValue}, actual="${after}"`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 새 값 기록용 컨텍스트 (verify_persist 에서 비교)
// ─────────────────────────────────────────────────────────────────────────────

const recorded: Partial<Record<FieldKey, number>> = {};

// ─────────────────────────────────────────────────────────────────────────────
// Step handlers
// ─────────────────────────────────────────────────────────────────────────────

const openBaseSettingPriceStep: StepHandler = async (page, _inputs) => {
  await page.goto(PRICE_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForTimeout(1_500);

  // 모든 input 마운트 + 비어있지 않은 값 도달 확인.
  for (const key of ALL_KEYS) {
    const meta = FIELDS[key];
    const input = fieldInputByLabel(page, meta.label);
    try {
      await waitInputLoaded(input, 30_000);
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      return {
        ok: false as const,
        error_key: 'price_form_not_loaded' as ErrorKey,
        message: `"${meta.label}" input 미로드: ${err}`,
      };
    }
  }
  return { ok: true as const };
};

function makeBumpStep(key: FieldKey): StepHandler {
  return async (page, _inputs) => {
    const r = await bumpField(page, key);
    if (!r.ok) return r;
    recorded[key] = r.newValue;
    return { ok: true as const };
  };
}

const verifyPersistStep: StepHandler = async (page, _inputs) => {
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30_000 });
  // React Query 의 GET 응답으로 form value 가 늦게 set 될 수 있음 — open 시와 동일하게 마운트 대기.
  await page.waitForTimeout(1_500);

  const mismatches: string[] = [];

  for (const key of ALL_KEYS) {
    const expected = recorded[key];
    if (expected === undefined) {
      return {
        ok: false as const,
        error_key: 'price_persist_missing_record' as ErrorKey,
        message: `"${FIELDS[key].label}" 의 기록된 새 값이 없음 (이전 step 미실행?)`,
      };
    }
    const meta = FIELDS[key];
    const tolerance = meta.kind === 'auto' ? 0.5 : (meta.step ?? 1) / 2;
    const input = fieldInputByLabel(page, meta.label);

    // expected 값 도달 polling. waitInputLoaded 는 비어있지 않은 값을 기다리지만,
    // React Query 캐시→fetch 2단계 갱신을 고려하여 expected 와 매치될 때까지 추가 polling.
    let raw = '';
    let actual = NaN;
    const start = Date.now();
    while (Date.now() - start < 10_000) {
      raw = await input.inputValue().catch(() => '');
      actual = parseDisplayed(raw);
      if (Number.isFinite(actual) && Math.abs(actual - expected) < tolerance) break;
      await page.waitForTimeout(500);
    }

    if (!Number.isFinite(actual) || Math.abs(actual - expected) >= tolerance) {
      const msg = `"${meta.label}" mismatch: expected=${expected}, actual="${raw}"`;
      logger.error(`[base-price] persist FAIL: ${msg}`);
      mismatches.push(msg);
    } else {
      logger.info(`[base-price] persist OK: ${meta.label} → "${raw}" (= ${expected})`);
    }
  }

  if (mismatches.length > 0) {
    return {
      ok: false as const,
      error_key: 'price_persist_mismatch' as ErrorKey,
      message: `새로고침 후 ${mismatches.length}개 필드 불일치: ${mismatches.join(' | ')}`,
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_base_setting_price:    openBaseSettingPriceStep,
  bump_rounding_multiple:     makeBumpStep('rounding'),
  bump_market_fee:            makeBumpStep('market_fee'),
  bump_discount_rate:         makeBumpStep('discount_rate'),
  bump_alipay_fee:            makeBumpStep('alipay_fee'),
  bump_third_party_shipping:  makeBumpStep('third_party_shipping'),
  bump_margin:                makeBumpStep('margin'),
  bump_tariff_rate:           makeBumpStep('tariff_rate'),
  bump_tariff_base_price:     makeBumpStep('tariff_base_price'),
  verify_persist:             verifyPersistStep,
};

test('기본 설정 > 공통설정 > 판매가 — 8개 필드 step 변경 후 영속성 검증', async ({ page }) => {
  test.setTimeout(3 * 60_000);

  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
