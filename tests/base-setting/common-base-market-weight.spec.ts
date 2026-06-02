/**
 * 공통설정 / 마켓별 판매가 가중치 영역 노출 (non-destructive).
 *
 * 대응 ATC : atcs/base-setting/common-base-market-weight.atc.yml
 * TC 원본  : Case No 1013, 1014 / P0 (2건). 입력값 변경은 destructive skip.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'base-setting',
  'common-base-market-weight.atc.yml',
);

const PAGE_URL =
  'https://app.windly.cc/view3/base-setting?setting=COMMON&category=MARKET_WEIGHT';

const SECTION_TITLE = '마켓별 판매가 가중치';
const MARKET_LABELS = ['스마트스토어', '쿠팡', '11번가', 'ESM 2.0', '롯데온', '톡스토어'];

const enterMarketWeightTabStep: StepHandler = async (page) => {
  await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
  await page
    .getByText(/공통설정/)
    .first()
    .waitFor({ state: 'visible', timeout: 15_000 })
    .catch(() => undefined);
  return { ok: true as const };
};

const verifyWeightSectionVisibleStep: StepHandler = async (page) => {
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (!bodyText.includes(SECTION_TITLE)) {
    return {
      ok: false as const,
      error_key: 'market_weight_section_missing' as ErrorKey,
      message: `${SECTION_TITLE} FormField title 미노출`,
    };
  }
  return { ok: true as const };
};

const verifySixMarketLabelsVisibleStep: StepHandler = async (page) => {
  const bodyText = await page.evaluate(() => document.body.innerText);
  const missing = MARKET_LABELS.filter((l) => !bodyText.includes(l));
  if (missing.length > 0) {
    return {
      ok: false as const,
      error_key: 'market_weight_labels_missing' as ErrorKey,
      message: `마켓 label 누락: ${missing.join(' / ')}`,
    };
  }
  return { ok: true as const };
};

const verifyTalkstoreInputEditableStep: StepHandler = async (page) => {
  // 톡스토어 label TextField 의 input disabled / readonly 검사.
  const status = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    const labelElt = all.find((el) => {
      for (const child of Array.from(el.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE) {
          const t = (child.nodeValue ?? '').trim();
          if (t === '톡스토어') return true;
        }
      }
      return false;
    });
    if (!labelElt) return { found: false };
    let cur: Element | null = labelElt.parentElement;
    while (cur) {
      const inp = cur.querySelector('input:not([type="checkbox"]):not([type="radio"])') as HTMLInputElement | null;
      if (inp) return { found: true, disabled: inp.disabled, readonly: inp.readOnly };
      cur = cur.parentElement;
    }
    return { found: false };
  });
  if (!status.found) {
    return {
      ok: false as const,
      error_key: 'talkstore_weight_input_not_found' as ErrorKey,
      message: '톡스토어 가중치 input 매칭 실패',
    };
  }
  if (status.disabled || status.readonly) {
    return {
      ok: false as const,
      error_key: 'talkstore_weight_input_not_editable' as ErrorKey,
      message: `톡스토어 가중치 input disabled=${status.disabled} readonly=${status.readonly}`,
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  enter_market_weight_tab: enterMarketWeightTabStep,
  verify_weight_section_visible: verifyWeightSectionVisibleStep,
  verify_six_market_labels_visible: verifySixMarketLabelsVisibleStep,
  verify_talkstore_input_editable: verifyTalkstoreInputEditableStep,
};

test('[TC 1013/1014] 기본설정 → 공통 → [마켓별 판매가 가중치] 탭 → 6 마켓 input (스마트스토어/쿠팡/11번가/ESM 2.0/롯데온/톡스토어) 노출 + 톡스토어 input 편집 가능 확인 (onBlur 저장 destructive 라 입력 X)', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
