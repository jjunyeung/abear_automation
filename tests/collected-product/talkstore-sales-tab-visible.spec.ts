/**
 * 수집상품 판매가 탭 진입 검증.
 *
 * 대응 ATC: atcs/collect/talkstore-sales-tab-visible.atc.yml
 * TC 원본: Case No 1089 / 수집상품 › 톡스토어 › 판매가 / P0
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
} from './_talkstore-handlers';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'collected-product', 'talkstore-sales-tab-visible.atc.yml');

const verifySalesTabStep: StepHandler = async (page) => {
  // 판매가 탭 진입 시 보통 "판매가" 또는 "공급가" 같은 가격 관련 텍스트 노출.
  const indicator = page.getByText(/^판매가\s*설정$|^마켓\s*판매가$|^원가$|^마진율$|^배송비$/).first();
  try {
    await indicator.waitFor({ state: 'visible', timeout: 10_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'sales_tab_indicator_missing' as ErrorKey,
      message: '판매가 탭 진입 지표 미노출',
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  open_first_collected_product: openFirstCollectedProductStep,
  click_sales_tab: clickTabByLabelStep(/^판매가$/),
  verify_sales_tab: verifySalesTabStep,
};

test('수집상품 판매가 탭 진입', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
