/**
 * Tosstoss 신청서 이미지 업로드 검증.
 *
 * 대응 ATC : atcs/settings/da-image-upload.atc.yml
 * TC 원본  : Case No 1382 / 배송대행지 › 신청서 작성 › 이미지 업로드 / P0
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
  goToTosstossApplicationStep,
  addManualFormStep,
} from './_da-application-handlers';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'delivery-agency', 'da-image-upload.atc.yml');

// 실제 내용/크기가 있는 PNG fixture (128x128 RGBA).
// 1x1 투명 PNG 는 윈들리 이미지 서버 처리(uploadAndGetImageUrl)가 실패해 productImageUrl 이
// 채워지지 않으므로, 정상 업로드를 위해 실 이미지를 쓴다.
const SAMPLE_IMAGE_PATH = join(__dirname, '..', 'fixtures', 'da-image-upload-sample.png');

const uploadImageStep: StepHandler = async (page) => {
  // UploadImage Container: onClick={() => inputRef.click()}. "이미지 업로드" 텍스트 클릭 →
  // filechooser 이벤트. waitForEvent('filechooser') 로 잡고 setFiles.
  const uploadTrigger = page.getByText(/^이미지\s*업로드$/).first();
  try {
    await uploadTrigger.waitFor({ state: 'visible', timeout: 5_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'upload_trigger_missing' as ErrorKey,
      message: '"이미지 업로드" 트리거 텍스트 미노출',
    };
  }
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 5_000 }),
    uploadTrigger.click(),
  ]);
  await chooser.setFiles(SAMPLE_IMAGE_PATH);
  // 업로드 성공 시 UploadImage 가 <Image src={productImageUrl}> 로 swap.
  // src = 윈들리 media 호스트 (예: https://global.windly.cc/media/d-...).
  // 주의: 페이지에 Facebook 트래킹 픽셀 등 다른 img[src^="http"] 가 섞여 있어
  //       src^="http" .first() 로 잡으면 hidden 픽셀에 걸려 실패한다 → /media/ 로 한정.
  const uploadedImg = page.locator('img[src*="/media/"]').first();
  try {
    await uploadedImg.waitFor({ state: 'visible', timeout: 20_000 });
    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error_key: 'image_not_rendered' as ErrorKey,
      message: '업로드 후 media 이미지(img[src*="/media/"]) 미노출 — 업로드 API 실패 가능',
    };
  }
};

const handlers: StepHandlers = {
  open_tosstoss_application: goToTosstossApplicationStep,
  add_manual_form: addManualFormStep,
  upload_image: uploadImageStep,
};

test('토스토스 신청서 이미지 업로드', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
