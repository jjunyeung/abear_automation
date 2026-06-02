/**
 * 스마트스토어 업로드 설정 진입 (non-destructive).
 *
 * 대응 ATC : atcs/base-setting/smartstore-base-upload-method.atc.yml
 * TC 원본  : Case No 3494 / P0 (1건).
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
  'smartstore-base-upload-method.atc.yml',
);

const PAGE_URL = 'https://app.windly.cc/view3/base-setting?setting=SMARTSTORE&category=UPLOAD';

const enterSmartStoreUploadSettingStep: StepHandler = async (page) => {
  await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
  return { ok: true as const };
};

const verifyUploadMethodRadiosStep: StepHandler = async (page) => {
  const bodyText = await page.evaluate(() => document.body.innerText);
  const missing: string[] = [];
  if (!bodyText.includes('판매자센터 로그인 방식')) missing.push('판매자센터 로그인 방식');
  if (!bodyText.includes('서버 방식')) missing.push('서버 방식');
  if (missing.length > 0) {
    return {
      ok: false as const,
      error_key: 'smartstore_upload_radios_missing' as ErrorKey,
      message: `Radio 라벨 누락: ${missing.join(' / ')}`,
    };
  }
  return { ok: true as const };
};

const handlers: StepHandlers = {
  enter_smartstore_upload_setting: enterSmartStoreUploadSettingStep,
  verify_upload_method_radios: verifyUploadMethodRadiosStep,
};

test('[TC 3494] 기본설정 → 스마트스토어 → [업로드 방식] 탭 진입 → 2 Radio (판매자센터 로그인 방식 / 서버 방식) 라벨 노출 (선택 destructive 라 skip)', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
