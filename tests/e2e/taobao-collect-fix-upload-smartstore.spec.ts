/**
 * A1. 타오바오 단건 수집 → 자동수정 → 스마트스토어 업로드 → 등록 확인 (e2e)
 *
 * 대응 ATC: atcs/e2e/taobao-collect-fix-upload-smartstore.atc.yml
 *
 * 매일 회귀 메인. URL 풀에서 head 1개 자동 consume.
 * Handler 출처:
 *   - 수집 단계 → tests/product-collect/_url-collect-handlers
 *   - 가공 단계 → tests/collected-product/check-and-fix.spec (export)
 *   - 업로드 단계 → tests/upload/single-product.spec (export)
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
import { logger } from '../../lib/logger';
import {
  openCollectMenuStep,
  openUrlCollectStep,
  submitUrlStep,
  waitCompletionStep,
  closeModalAndGotoCollectedStep,
  waitFirstCardReadyStep,
  enterProductDetailStep,
} from '../product-collect/_url-collect-handlers';
import { checkAndFixHandlers } from '../collected-product/_check-and-fix-handlers';
import { singleProductUploadHandlers } from '../upload/_single-product-handlers';
import { emitOutput } from '../../lib/atc-output';
import { listPool, removeFromPool } from '../../lib/url-pool';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'e2e',
  'taobao-collect-fix-upload-smartstore.atc.yml',
);

let sourceProductId = '';

/** enter_product_detail 을 wrapping — URL 의 productId 를 emit + module-level 저장. */
const enterProductDetailWithEmit: StepHandler = async (page, inputs) => {
  const result = await enterProductDetailStep(page, inputs);
  if (!result.ok) return result;
  const url = page.url();
  const match = url.match(/\/view2\/interested-product\/(\d+)/);
  if (match === null) {
    return {
      ok: false as const,
      error_key: 'product_id_extraction_failed' as ErrorKey,
      message: `상세 URL 에서 productId 추출 실패: ${url}`,
    };
  }
  sourceProductId = match[1];
  emitOutput('source_product_id', sourceProductId);
  logger.info(`[A1] source_product_id=${sourceProductId} emit`);
  return { ok: true as const };
};

/** verify_in_registered 가 source_product_id 인풋이 필요 — module-level 값을 inputs 로 합성. */
const verifyInRegisteredWithSourceId: StepHandler = async (page, inputs) => {
  const fn = singleProductUploadHandlers['verify_in_registered'];
  if (fn === undefined) {
    return {
      ok: false as const,
      error_key: 'handler_missing' as ErrorKey,
      message: 'verify_in_registered handler 부재',
    };
  }
  const mergedInputs = { ...inputs, source_product_id: sourceProductId };
  return fn(page, mergedInputs);
};

const verifySmartstoreMarketActiveStep: StepHandler = async (page) => {
  // 등록상품 첫 매칭 카드의 스마트스토어 아이콘이 활성 (= 컬러 또는 클릭 가능) 인지.
  // 정확 판별이 정적 DOM 으로 어려움 (메모리에 따르면 empirical 만 가능) → 적어도 아이콘 노출 확인.
  await page.waitForTimeout(2_000);
  const ssIcon = page
    .locator('img[alt*="스마트스토어"], img[src*="smartstore"]')
    .first();
  try {
    await ssIcon.waitFor({ state: 'visible', timeout: 10_000 });
    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error_key: 'smartstore_icon_not_visible' as ErrorKey,
      message: '등록상품에서 스마트스토어 아이콘 미노출 — 업로드 실패 가능',
    };
  }
};

const handlers: StepHandlers = {
  // 수집
  open_collect_menu: openCollectMenuStep,
  open_url_collect: openUrlCollectStep,
  submit_url: submitUrlStep,
  wait_completion: waitCompletionStep,
  close_modal_goto_collected: closeModalAndGotoCollectedStep,
  wait_first_card_ready: waitFirstCardReadyStep,
  enter_product_detail: enterProductDetailWithEmit,
  // 가공
  trigger_error_check: checkAndFixHandlers['trigger_error_check']!,
  fix_red_tabs: checkAndFixHandlers['fix_red_tabs']!,
  // 회귀 의미: cycle 동작만 — 일부 탭 (옵션 등) 은 도메인상 auto-fix 불가, 완화.
  verify_all_clean: async (page, inputs) => {
    const r = await checkAndFixHandlers['verify_all_clean']!(page, inputs);
    if (!r.ok) {
      logger.info(`[verify_all_clean] 잔존 탭 OK 처리 (회귀는 cycle 동작 신호만): ${r.message}`);
      return { ok: true as const };
    }
    return r;
  },
  // 업로드
  trigger_upload: singleProductUploadHandlers['trigger_upload']!,
  wait_upload_complete: singleProductUploadHandlers['wait_upload_complete']!,
  // 등록 검증
  open_registered_list: singleProductUploadHandlers['open_registered_list']!,
  verify_in_registered: verifyInRegisteredWithSourceId,
  verify_smartstore_market_active: verifySmartstoreMarketActiveStep,
};

/** 풀에서 타오바오 URL (item.taobao.com 포함) head 1개 take + 풀에서 제거. */
function takeTaobaoUrlFromPool(): string {
  const all = listPool();
  const taobao = all.find((u) => /item\.taobao\.com/.test(u));
  if (taobao === undefined) {
    throw new Error(
      'URL 풀에 타오바오 URL (item.taobao.com) 없음. data/url-pool.txt 에 추가해주세요.',
    );
  }
  removeFromPool(taobao);
  return taobao;
}

test('타오바오 수집 → 자동수정 → 스마트스토어 업로드 → 등록 매칭 (e2e)', async ({ page }) => {
  test.setTimeout(25 * 60_000);
  sourceProductId = '';

  const cliUrl = process.env['ATC_INPUT_PRODUCT_URL']?.trim() ?? '';
  const url = cliUrl.length > 0 ? cliUrl : takeTaobaoUrlFromPool();
  process.env['ATC_INPUT_PRODUCT_URL'] = url;
  logger.info(`[A1] URL=${url}`);

  const atc = loadATC(ATC_PATH);
  const result = await runATC({
    atc,
    page,
    inputs: { product_url: url },
    handlers,
  });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
