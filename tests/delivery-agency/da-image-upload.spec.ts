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

// 1x1 transparent png (base64).
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgAAIAAAUAAeImBZsAAAAASUVORK5CYII=';

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
  await chooser.setFiles({
    name: 'tiny.png',
    mimeType: 'image/png',
    buffer: Buffer.from(TINY_PNG_BASE64, 'base64'),
  });
  // 업로드 응답 후 UploadImage 가 <Image src={productImageUrl}> 로 swap. selector: img[alt="" 또는 src*=upload-image-server].
  // 정확한 src host 모르므로 일단 img[src^="http"] 매칭.
  const img = page.locator('img[src^="http"]').first();
  try {
    await img.waitFor({ state: 'visible', timeout: 20_000 });
    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error_key: 'image_not_rendered' as ErrorKey,
      message: '업로드 후 img[src^="http"] 미노출 — 업로드 API 실패 가능',
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
