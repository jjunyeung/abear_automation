/**
 * 등록상품 단독 검증 ATC — Playwright spec
 *
 * 대응 ATC: atcs/upload/registered-check.atc.yml
 * 용도: 이미 업로드된 상품이 등록상품 목록에 있는지 단독 확인.
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
  goToRegisteredProducts,
  searchByProductCode,
} from '../../lib/windly-actions';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'upload',
  'registered-check.atc.yml',
);

// login / enter_workspace 는 setup project (tests/auth.setup.ts) 가 처리.

const openRegisteredListStep: StepHandler = async (page, _inputs) => {
  await goToRegisteredProducts(page);
  return { ok: true as const };
};

const verifyInRegisteredStep: StepHandler = async (page, inputs) => {
  const id =
    typeof inputs['source_product_id'] === 'string'
      ? (inputs['source_product_id'] as string)
      : '';
  if (id.length === 0) {
    return {
      ok: false as const,
      error_key: 'missing_input' as ErrorKey,
      message: 'inputs.source_product_id 누락',
    };
  }
  const count = await searchByProductCode(page, id);
  if (count === 0) {
    return {
      ok: false as const,
      error_key: 'not_in_registered_list' as ErrorKey,
      message: `등록상품 목록에서 source_product_id=${id} 매칭 0개`,
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_registered_list: openRegisteredListStep,
  verify_in_registered: verifyInRegisteredStep,
};

test('등록상품 목록 단독 검증', async ({ page }) => {
  test.setTimeout(5 * 60_000);

  const atc = loadATC(ATC_PATH);
  const example = atc.inputs['source_product_id']?.example ?? '';
  const pickFirstNonEmpty = (...vals: (string | undefined)[]): string =>
    vals.find((v) => typeof v === 'string' && v.length > 0) ?? '';
  const inputs: Record<string, unknown> = {
    source_product_id: pickFirstNonEmpty(
      process.env['ATC_INPUT_SOURCE_PRODUCT_ID'],
      example,
    ),
  };

  const result = await runATC({ atc, page, inputs, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
