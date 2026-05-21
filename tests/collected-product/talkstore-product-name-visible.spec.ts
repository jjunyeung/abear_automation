/**
 * 톡스토어 상품명 input 노출 + 기본값 검증.
 *
 * 대응 ATC: atcs/collect/talkstore-product-name-visible.atc.yml
 * TC 원본: Case No 1079, 1080 / 수집상품 › 톡스토어 › 기본정보 / P0
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

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'collected-product', 'talkstore-product-name-visible.atc.yml');

const verifyTalkstoreNameInputStep: StepHandler = async (page) => {
  // "톡스토어" label 정확히 일치하는 div + 그 ancestor 안 input.
  // InfoTab 에는 상품명 (TextField label="톡스토어") 와 카테고리 (Dropdown label) 두 곳 있음.
  // 첫 번째 = 상품명.
  const input = await findFieldInputByExactLabel(page, '톡스토어', 0);
  if (!input) {
    return {
      ok: false as const,
      error_key: 'talkstore_name_input_missing' as ErrorKey,
      message: '톡스토어 label 의 input 매칭 X',
    };
  }
  // value 또는 placeholder 둘 중 하나는 있어야 함 (TextField 가 talkstoreTitle 로 채워짐).
  const { value, placeholder } = await input.evaluate((el) => {
    const inp = el as HTMLInputElement;
    return { value: inp.value, placeholder: inp.placeholder };
  });
  if ((!value || !value.trim()) && (!placeholder || !placeholder.trim())) {
    return {
      ok: false as const,
      error_key: 'talkstore_name_value_and_placeholder_empty' as ErrorKey,
      message: '톡스토어 상품명 input value/placeholder 모두 빈 상태',
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_first_collected_product: openFirstCollectedProductStep,
  click_info_tab: clickTabByLabelStep(/^기본\s*정보$/),
  verify_talkstore_name_input: verifyTalkstoreNameInputStep,
};

test('톡스토어 상품명 input 노출', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
