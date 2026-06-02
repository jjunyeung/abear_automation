/**
 * A2. 티몰 단건 수집 → 옵션가격 수정 → 톡스토어 업로드 → 등록 확인 (e2e)
 *
 * 대응 ATC: atcs/e2e/tmall-collect-fix-upload-talkstore.atc.yml
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
import { singleProductUploadHandlers } from '../upload/_single-product-handlers';
import { editOptionPriceHandlers } from '../collected-product/_edit-option-price-handlers';
import { emitOutput } from '../../lib/atc-output';
import { listPool, removeFromPool } from '../../lib/url-pool';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'e2e',
  'tmall-collect-fix-upload-talkstore.atc.yml',
);

let sourceProductId = '';

const enterDetailWithEmit: StepHandler = async (page, inputs) => {
  const r = await enterProductDetailStep(page, inputs);
  if (!r.ok) return r;
  const m = page.url().match(/\/view2\/interested-product\/(\d+)/);
  if (m === null) {
    return {
      ok: false as const,
      error_key: 'product_id_extraction_failed' as ErrorKey,
      message: `productId 추출 실패: ${page.url()}`,
    };
  }
  sourceProductId = m[1];
  emitOutput('source_product_id', sourceProductId);
  return { ok: true as const };
};

const bumpOptionPriceStep: StepHandler = async (page) => {
  // 옵션 탭 진입.
  const optionTab = page.getByRole('button', { name: /^옵션$/ }).first();
  try {
    await optionTab.waitFor({ state: 'visible', timeout: 10_000 });
    await optionTab.click();
  } catch {
    return {
      ok: false as const,
      error_key: 'option_tab_not_found' as ErrorKey,
      message: '옵션 탭 버튼 미발견',
    };
  }
  await page.waitForTimeout(1_500);

  // 첫 옵션의 가격 input — placeholder "원" 또는 label "가격" 등.
  // 첫 numeric input 의 값을 +100 한다.
  const priceInput = page
    .locator('input[type="number"], input[inputmode="numeric"]')
    .first();
  if ((await priceInput.count()) === 0) {
    return {
      ok: false as const,
      error_key: 'option_price_input_not_found' as ErrorKey,
      message: '옵션 가격 input 미발견',
    };
  }
  const before = (await priceInput.inputValue()) || '0';
  const after = String(parseInt(before.replace(/,/g, ''), 10) + 100);
  await priceInput.click();
  await priceInput.fill('');
  await priceInput.pressSequentially(after, { delay: 10 });
  await page.keyboard.press('Tab');
  await page.waitForTimeout(800);

  // 저장 버튼.
  const saveBtn = page.getByRole('button', { name: /^저장$/ }).first();
  if ((await saveBtn.count()) > 0 && (await saveBtn.isVisible().catch(() => false))) {
    await saveBtn.click({ timeout: 5_000 }).catch(() => undefined);
    await page.waitForTimeout(1_500);
  }
  logger.info(`[bump_option_price] ${before} → ${after}`);
  return { ok: true as const };
};

const verifyInRegisteredWithSourceId: StepHandler = async (page, inputs) => {
  const fn = singleProductUploadHandlers['verify_in_registered']!;
  return fn(page, { ...inputs, source_product_id: sourceProductId });
};

const verifyTalkstoreActiveStep: StepHandler = async (page) => {
  await page.waitForTimeout(2_000);
  const tsIcon = page
    .locator('img[alt*="톡스토어"], img[alt*="카카오"], img[src*="talkstore"], img[src*="kakao"]')
    .first();
  try {
    await tsIcon.waitFor({ state: 'visible', timeout: 10_000 });
    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error_key: 'talkstore_icon_not_visible' as ErrorKey,
      message: '등록상품에서 톡스토어 아이콘 미노출',
    };
  }
};

const handlers: StepHandlers = {
  open_collect_menu: openCollectMenuStep,
  open_url_collect: openUrlCollectStep,
  submit_url: submitUrlStep,
  wait_completion: waitCompletionStep,
  close_modal_goto_collected: closeModalAndGotoCollectedStep,
  wait_first_card_ready: waitFirstCardReadyStep,
  enter_product_detail: enterDetailWithEmit,
  // editOptionPriceHandlers 의 bump_option_price 가 판매가 탭 진입 + 첫 가격 input + reload 검증까지 완비.
  bump_option_price: editOptionPriceHandlers['bump_option_price']!,
  trigger_upload: singleProductUploadHandlers['trigger_upload']!,
  wait_upload_complete: singleProductUploadHandlers['wait_upload_complete']!,
  open_registered_list: singleProductUploadHandlers['open_registered_list']!,
  verify_in_registered: verifyInRegisteredWithSourceId,
  verify_talkstore_active: verifyTalkstoreActiveStep,
};

function takeTmallUrlFromPool(): string {
  const url = listPool().find((u) => /detail\.tmall\.com/.test(u));
  if (url === undefined) {
    throw new Error('URL 풀에 티몰 URL (detail.tmall.com) 없음. data/url-pool.txt 에 추가.');
  }
  removeFromPool(url);
  return url;
}

test('티몰 수집 → 옵션가 수정 → 톡스토어 업로드 (e2e)', async ({ page }) => {
  test.setTimeout(25 * 60_000);
  sourceProductId = '';

  const cliUrl = process.env['ATC_INPUT_PRODUCT_URL']?.trim() ?? '';
  const url = cliUrl.length > 0 ? cliUrl : takeTmallUrlFromPool();
  process.env['ATC_INPUT_PRODUCT_URL'] = url;
  logger.info(`[A2] URL=${url}`);

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
