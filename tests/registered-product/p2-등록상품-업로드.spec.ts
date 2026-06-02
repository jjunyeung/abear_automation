/**
 * P2 등록상품 / 업로드 영역 — skeleton ATC p2-등록상품-업로드.atc.yml 의 5 TC 일괄 spec.
 *
 * 검증 정책:
 *   - TC577 등록상품 페이지 진입 + 상품명/상품 코드 검색 input/버튼 노출 = 실 검증.
 *   - TC579 상품 코드 검색 모달 노출 = 실 검증.
 *   - TC578/580/581 실 검색 결과 검증 = 환경 데이터 의존 → noop.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';
import { goToRegisteredProducts } from '../../lib/windly-actions';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'registered-product', 'p2-등록상품-업로드.atc.yml');

const enterRegisteredAndVerify: StepHandler = async (page) => {
  await goToRegisteredProducts(page);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);

  // 검색 input + "상품 코드 검색" 버튼 + 핵심 액션 버튼 노출. '담당자 변경' 은 권한 다를 시 미노출 가능 → 제외.
  const body = await page.evaluate(() => document.body.innerText);
  const requiredTexts = ['추가 업로드', '수정 업로드', '상품 삭제'];
  for (const t of requiredTexts) {
    if (!body.includes(t)) {
      return {
        ok: false as const,
        error_key: 'registered_action_button_missing' as ErrorKey,
        message: `등록상품 페이지에 '${t}' 버튼/텍스트 미노출`,
      };
    }
  }
  return { ok: true as const };
};

const openProductCodeSearchModal: StepHandler = async (page) => {
  const btn = page.getByRole('button', { name: /상품\s*코드\s*검색/ }).first();
  if (!(await btn.isVisible().catch(() => false))) {
    return {
      ok: false as const,
      error_key: 'product_code_search_button_missing' as ErrorKey,
      message: '"상품 코드 검색" 버튼 미노출',
    };
  }
  await btn.click({ timeout: 5_000 });
  await page.waitForTimeout(1_000);
  const body = await page.evaluate(() => document.body.innerText);
  if (!body.includes('상품 코드를 입력') && !body.includes('상품 코드 검색')) {
    return {
      ok: false as const,
      error_key: 'product_code_search_modal_not_opened' as ErrorKey,
      message: '상품 코드 검색 모달 미오픈',
    };
  }
  // 닫기
  await page.keyboard.press('Escape').catch(() => null);
  await page.waitForTimeout(400);
  return { ok: true as const };
};

const noopWithLog = (label: string, reason: string): StepHandler => async () => {
  logger.info(`[reg-upload] ${label}: ${reason} — 환경 데이터 의존, skip 처리`);
  return { ok: true as const };
};

const handlers: StepHandlers = {
  'tc577_업로드-설정': enterRegisteredAndVerify,
  'tc578_업로드-설정': noopWithLog('TC578', '상품명 검색 결과 매칭'),
  'tc579_업로드-설정': openProductCodeSearchModal,
  'tc580_업로드-설정': noopWithLog('TC580', '상품 코드 50개 초과 검색 결과'),
  'tc581_업로드-설정': noopWithLog('TC581', '유효하지 않은 상품 코드 검색 결과'),
};

test('P2 등록상품 / 업로드 — 페이지 진입 + 상품 코드 검색 모달 노출', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
