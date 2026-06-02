/**
 * 상품수집 / 엑셀 + URL 수집 모달 (non-destructive).
 *
 * 대응 ATC : atcs/product-collect/excel-url-import-modals.atc.yml
 * TC 원본  : Case No 1156-1161 / P0 (6건). 실 수집 트리거 destructive skip.
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
  'product-collect',
  'excel-url-import-modals.atc.yml',
);

const EXCEL_URL = 'https://app.windly.cc/view3/product-import?method=EXCEL';
const URL_URL = 'https://app.windly.cc/view3/product-import?method=URL';

const EXCEL_TITLE = '엑셀 수집';
const URL_TITLE = 'URL 수집';
const METHOD_API = '중국몰 수집 방식(API)';
const METHOD_HTML = 'HTML 방식';

const enterExcelImportModalStep: StepHandler = async (page) => {
  await page.goto(EXCEL_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
  return { ok: true as const };
};

const enterUrlImportModalStep: StepHandler = async (page) => {
  await page.goto(URL_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
  return { ok: true as const };
};

function verifyTextPresentStep(text: string, errorKey: string): StepHandler {
  return async (page) => {
    const bodyText = await page.evaluate(() => document.body.innerText);
    if (!bodyText.includes(text)) {
      return {
        ok: false as const,
        error_key: errorKey as ErrorKey,
        message: `"${text}" 미노출`,
      };
    }
    return { ok: true as const };
  };
}

function verifyMethodFormStep(errorKey: string): StepHandler {
  return async (page) => {
    const bodyText = await page.evaluate(() => document.body.innerText);
    const missing: string[] = [];
    if (!bodyText.includes(METHOD_API)) missing.push(METHOD_API);
    if (!bodyText.includes(METHOD_HTML)) missing.push(METHOD_HTML);
    if (missing.length > 0) {
      return {
        ok: false as const,
        error_key: errorKey as ErrorKey,
        message: `ImportMethodForm 옵션 누락: ${missing.join(' / ')}`,
      };
    }
    return { ok: true as const };
  };
}

function closeModalStep(errorKey: string): StepHandler {
  return async (page) => {
    // 모달 leftButton "닫기" 또는 "취소"
    const closeBtn = page.getByRole('button', { name: /^(닫기|취소)$/ }).first();
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click({ timeout: 3_000 }).catch(() => undefined);
    } else {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(800);
    void errorKey; // 실패 보고용 reserved
    return { ok: true as const };
  };
}

const handlers: StepHandlers = {
  enter_excel_import_modal: enterExcelImportModalStep,
  verify_excel_modal_title: verifyTextPresentStep(EXCEL_TITLE, 'excel_modal_title_missing'),
  verify_excel_import_method_form: verifyMethodFormStep('excel_method_form_missing'),
  close_excel_modal: closeModalStep('excel_modal_close_failed'),
  enter_url_import_modal: enterUrlImportModalStep,
  verify_url_modal_title: verifyTextPresentStep(URL_TITLE, 'url_modal_title_missing'),
  verify_url_import_method_form: verifyMethodFormStep('url_method_form_missing'),
  close_url_modal: closeModalStep('url_modal_close_failed'),
};

test('[TC 1156-1161] 상품수집 페이지 → ?method=EXCEL 엑셀 수집 모달 (제목 + 중국몰 API/HTML 방식 옵션) 열기/닫기 → ?method=URL URL 수집 모달 열기/닫기', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
