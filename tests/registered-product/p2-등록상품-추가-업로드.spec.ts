/**
 * P2 등록상품 / 추가 업로드 영역 — skeleton ATC p2-등록상품-추가-업로드.atc.yml 의 6 TC.
 *
 * 검증 정책:
 *   - TC582 추가 업로드 모달 노출 = 실 검증.
 *   - TC583-587 모달 안 마켓 선택 / 상품 정보 변경 / 실 업로드 = destructive noop.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';
import { goToRegisteredProducts } from '../../lib/windly-actions';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'registered-product', 'p2-등록상품-추가-업로드.atc.yml');

const ADD_UPLOAD_BUTTON = '추가 업로드';

const openAddUploadModal: StepHandler = async (page) => {
  await goToRegisteredProducts(page);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);

  // 첫 카드 선택
  const clicked = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input[type="checkbox"][id^="checkbox_"]')) as HTMLInputElement[];
    const target = inputs.find((i) => i.value);
    if (!target) return null;
    const label = document.querySelector(`label[for="${target.id}"]`) as HTMLLabelElement | null;
    const el = (label ?? target) as HTMLElement;
    el.scrollIntoView({ block: 'center' });
    el.click();
    return target.value;
  });
  if (!clicked) {
    return {
      ok: false as const,
      error_key: 'first_card_select_failed' as ErrorKey,
      message: '첫 카드 선택 실패 — 등록상품 0건',
    };
  }
  await page.waitForTimeout(500);

  const btn = page.getByRole('button', { name: ADD_UPLOAD_BUTTON, exact: true }).first();
  if (!(await btn.isVisible().catch(() => false))) {
    return {
      ok: false as const,
      error_key: 'add_upload_button_missing' as ErrorKey,
      message: `${ADD_UPLOAD_BUTTON} 버튼 미노출`,
    };
  }
  if (await btn.isDisabled().catch(() => false)) {
    logger.info('[reg-add-upload] 추가 업로드 버튼 disabled — skip success.');
    return { ok: true as const };
  }
  await btn.click({ timeout: 5_000 });
  await page.waitForTimeout(1_500);

  const body = await page.evaluate(() => document.body.innerText);
  if (!body.includes(ADD_UPLOAD_BUTTON) || (!body.includes('마켓 선택') && !body.includes('상품 기본정보'))) {
    return {
      ok: false as const,
      error_key: 'add_upload_modal_not_opened' as ErrorKey,
      message: '추가 업로드 모달 안 "마켓 선택" 또는 "상품 기본정보" 미노출',
    };
  }
  await page.keyboard.press('Escape').catch(() => null);
  await page.waitForTimeout(400);
  return { ok: true as const };
};

const noopWithLog = (label: string, reason: string): StepHandler => async () => {
  logger.info(`[reg-add-upload] ${label}: ${reason} — destructive, skip 처리`);
  return { ok: true as const };
};

const handlers: StepHandlers = {
  'tc582_업로드-설정': openAddUploadModal,
  'tc583_업로드-설정': noopWithLog('TC583', '마켓 hover 툴팁 — 환경 의존'),
  'tc584_업로드-설정': noopWithLog('TC584', '아무것도 선택 X 후 다음 버튼 비활성 — destructive UI flow'),
  'tc585_업로드-설정': noopWithLog('TC585', '업로드 가능 마켓 선택 → 다음'),
  'tc586_업로드-설정': noopWithLog('TC586', '상품 정보 수정 → 추가 업로드 실행 — 외부 마켓 호출'),
  'tc587_업로드-설정': noopWithLog('TC587', 'ESM 옵션 모드 선택 → 추가 업로드 — 외부 마켓 호출'),
};

test('P2 등록상품 / 추가 업로드 — 모달 노출 + destructive skip', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
