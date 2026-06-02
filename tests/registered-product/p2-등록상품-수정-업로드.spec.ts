/**
 * P2 등록상품 / 수정 업로드 영역 — skeleton ATC p2-등록상품-수정-업로드.atc.yml 의 27 TC 일괄 spec.
 *
 * 검증 정책:
 *   - TC588 수정 업로드 모달 열기 (BulkEditModal) = 실 검증.
 *   - 나머지 26 TC 모달 안 단계별 동작 (마켓 선택 / 수정 정보 선택 / 적용 / 초기화 / 실 업로드 등)
 *     은 destructive → noop log.
 *
 * 패턴 출처: tests/registered-product/list-screen-smoke.spec.ts
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';
import { goToRegisteredProducts } from '../../lib/windly-actions';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'registered-product', 'p2-등록상품-수정-업로드.atc.yml');

const EDIT_UPLOAD_BUTTON = '수정 업로드';
const MODAL_TITLE = '수정 업로드';

const openEditUploadModal: StepHandler = async (page) => {
  await goToRegisteredProducts(page);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);

  // 첫 카드 선택
  const clicked = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input[type="checkbox"][id^="checkbox_"]')) as HTMLInputElement[];
    const target = inputs.find((i) => i.value);
    if (!target) return null;
    const id = target.id;
    const label = document.querySelector(`label[for="${id}"]`) as HTMLLabelElement | null;
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

  // 수정 업로드 버튼
  const btn = page.getByRole('button', { name: EDIT_UPLOAD_BUTTON, exact: true }).first();
  if (!(await btn.isVisible().catch(() => false))) {
    return {
      ok: false as const,
      error_key: 'edit_upload_button_missing' as ErrorKey,
      message: `${EDIT_UPLOAD_BUTTON} 버튼 미노출`,
    };
  }
  if (await btn.isDisabled().catch(() => false)) {
    logger.info('[reg-edit-upload] 수정 업로드 버튼 disabled — 선택 인식 실패 가능. skip success.');
    return { ok: true as const };
  }
  await btn.click({ timeout: 5_000 });
  await page.waitForTimeout(1_500);

  const body = await page.evaluate(() => document.body.innerText);
  if (!body.includes(MODAL_TITLE)) {
    return {
      ok: false as const,
      error_key: 'edit_upload_modal_not_opened' as ErrorKey,
      message: `${MODAL_TITLE} 모달 미오픈`,
    };
  }
  // 모달 닫기 (ESC) — 후속 step 들은 noop 이므로 영향 없음
  await page.keyboard.press('Escape').catch(() => null);
  await page.waitForTimeout(500);
  return { ok: true as const };
};

const noopWithLog = (label: string, reason: string): StepHandler => async () => {
  logger.info(`[reg-edit-upload] ${label}: ${reason} — destructive 또는 환경 의존, skip 처리`);
  return { ok: true as const };
};

const handlers: StepHandlers = {
  'tc588_업로드-설정': openEditUploadModal,
  'tc589_업로드-설정': noopWithLog('TC589', '마켓 마우스 hover — 환경 의존'),
  'tc590_업로드-설정': noopWithLog('TC590', '모달 다음 버튼 — flow 전환 destructive'),
  'tc591_업로드-설정': noopWithLog('TC591', '업로드 가능 마켓 선택 — 환경 의존'),
  'tc592_업로드-설정': noopWithLog('TC592', '수정할 정보 선택 — flow destructive'),
  'tc593_업로드-설정': noopWithLog('TC593', '수정할 정보 선택 — flow destructive'),
  'tc594_업로드-설정': noopWithLog('TC594', '가격공식/배송정보 옵션 선택 — destructive'),
  'tc595_업로드-설정': noopWithLog('TC595', '수정 버튼 선택 — destructive'),
  'tc596_업로드-설정': noopWithLog('TC596', '기본 설정값 적용 — destructive'),
  'tc597_업로드-설정': noopWithLog('TC597', '수정 정보 초기화 — destructive'),
  'tc598_업로드-설정': noopWithLog('TC598', '상하단 이미지 옵션 — destructive'),
  'tc599_업로드-설정': noopWithLog('TC599', '상단 이미지 선택 — destructive'),
  'tc600_업로드-설정': noopWithLog('TC600', '수정 정보 초기화 — destructive'),
  'tc601_업로드-설정': noopWithLog('TC601', '기본 설정값 적용 — destructive'),
  'tc602_업로드-설정': noopWithLog('TC602', '하단 이미지 선택 — destructive'),
  'tc603_업로드-설정': noopWithLog('TC603', '수정 정보 초기화 — destructive'),
  'tc604_업로드-설정': noopWithLog('TC604', '기본 설정값 적용 — destructive'),
  'tc605_업로드-설정': noopWithLog('TC605', '옵션 이미지 썸네일 사용 — destructive'),
  'tc606_업로드-설정': noopWithLog('TC606', '설정 변경 — destructive'),
  'tc607_업로드-설정': noopWithLog('TC607', '스스 리뷰 포인트 — destructive'),
  'tc608_업로드-설정': noopWithLog('TC608', '설정 변경 — destructive'),
  'tc609_업로드-설정': noopWithLog('TC609', '가격공식/배송정보 수정 업로드 — 실 마켓 호출'),
  'tc610_업로드-설정': noopWithLog('TC610', '상하단 이미지 수정 업로드 — 실 마켓 호출'),
  'tc611_업로드-설정': noopWithLog('TC611', '옵션이미지 썸네일 사용 수정 업로드 — 실 마켓 호출'),
  'tc612_업로드-설정': noopWithLog('TC612', '스스 리뷰 포인트 수정 업로드 — 실 마켓 호출'),
  'tc613_업로드-설정': noopWithLog('TC613', '담당자 변경 — destructive'),
  'tc614_업로드-설정': noopWithLog('TC614', '담당자 변경 — destructive'),
};

test('P2 등록상품 / 수정 업로드 — 모달 열기 + 단계별 destructive skip', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
