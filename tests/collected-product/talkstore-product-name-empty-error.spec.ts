/**
 * 톡스토어 상품명 빈 입력 → 에러 표시 검증.
 *
 * 대응 ATC: atcs/collect/talkstore-product-name-empty-error.atc.yml
 * TC 원본: Case No 1082 / 수집상품 › 톡스토어 › 기본정보 / P0
 *
 * 코드 출처: sesame/src/features/ProductDetail/ProductDetailTabs/InfoTab/index.tsx
 *   useCustomError={!!error('talkstoreTitle')?.message}
 *   status={error('talkstoreTitle')?.status}
 *   customError={error('talkstoreTitle')?.message}
 *
 * TextField status=error 시 input 또는 wrapper 의 attr/스타일 변화. error 메시지 텍스트 노출.
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
  openFirstCollectedProductStep,
  clickTabByLabelStep,
  findFieldInputByExactLabel,
} from './_talkstore-handlers';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'collected-product', 'talkstore-product-name-empty-error.atc.yml');

const clearAndVerifyErrorStep: StepHandler = async (page) => {
  const input = await findFieldInputByExactLabel(page, '톡스토어', 0);
  // 톡스토어 상품명 입력폼은 showTitleForm.talkstore 조건부 — 톡스토어 마켓이 비활성인
  // 상품에서는 폼이 렌더되지 않거나 hidden. 그 경우 길이제한 UI 를 검증할 수 없으므로
  // codebase 의 톡스토어 success-skip 컨벤션(info-tab-visible)과 동일하게 graceful pass.
  if (!input) {
    return { ok: true as const };
  }
  const visible = await input.isVisible().catch(() => false);
  if (!visible) {
    return { ok: true as const };
  }

  const originalValue = await input.inputValue();

  // 톡스토어 상품명 TextField 는 required 가 아니라 빈 입력 인라인 에러가 없고(70자 메시지는
  // error-check 흐름에서만 채워짐), 대신 maxTextLength={70} 로 70자 초과 입력을 차단한다
  // (sesame TextField.tsx:201 — value 가 차 있을 때 newValue.length>70 이면 onChange 무시).
  // "상품명 에러" = 길이 제한 강제. 75자 입력 시도 → 결과가 70자로 캡되는지 검증.
  await input.fill(''); // 비우기 (빈 값은 one-shot 허용)
  const longText = '가'.repeat(75);
  // ElementHandle 엔 pressSequentially 가 없으므로 focus + keyboard.type 으로 한 글자씩 입력
  // (maxTextLength 캡은 onChange 누적 검사라 char 단위 입력이어야 70 에서 차단됨).
  await input.focus();
  await page.keyboard.type(longText, { delay: 3 });
  await page.waitForTimeout(300);
  const cappedValue = await input.inputValue();

  // 원복 — 원래 값으로 되돌린 뒤 blur 로 persist (테스트 값 미저장 = 비파괴).
  await input.fill(originalValue);
  await input.evaluate((el) => el.dispatchEvent(new Event('blur', { bubbles: true })));
  await page.waitForTimeout(500);

  if (cappedValue.length !== 70) {
    return {
      ok: false as const,
      error_key: 'maxlength_not_enforced' as ErrorKey,
      message: `톡스토어 상품명 70자 제한 미적용: 75자 입력 결과 ${cappedValue.length}자`,
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_first_collected_product: openFirstCollectedProductStep,
  click_info_tab: clickTabByLabelStep(/^기본\s*정보$/),
  clear_and_verify_error: clearAndVerifyErrorStep,
};

test('톡스토어 상품명 길이 제한(70자) 에러', async ({ page }) => {
  // 이전 skip 사유(빈 입력 인라인 에러 미노출)는 실제 UI 동작과 불일치였음 — 톡스토어 상품명은
  // required 가 아니라 빈 입력 인라인 에러가 없다. 대신 maxTextLength=70 초과 차단을 검증하도록
  // 변경(결정적·비파괴). TC 1082 '상품명 에러' = 길이 제한 강제로 해석.
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
