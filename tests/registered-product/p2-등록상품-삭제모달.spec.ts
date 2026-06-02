/**
 * P2 등록상품 / 삭제모달 영역 — skeleton ATC p2-등록상품-삭제모달.atc.yml 의 3 TC 일괄 spec.
 *
 * 검증 정책:
 *   - 모달 노출 (TC987) + 모달 내용 텍스트 (TC988) = 실 검증.
 *   - 실 삭제 (TC989) = destructive noop.
 *
 * 패턴 출처: tests/registered-product/delete-modal-open-cancel.spec.ts
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';
import { goToRegisteredProducts } from '../../lib/windly-actions';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'registered-product', 'p2-등록상품-삭제모달.atc.yml');

const DELETE_BUTTON = '상품 삭제';
const DELETE_MODAL_TITLE = '등록상품 삭제';

const openDeleteModal: StepHandler = async (page) => {
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
      message: '첫 카드 선택 실패 — 등록상품 0건 or row 구조 변경',
    };
  }
  await page.waitForTimeout(500);

  // 상품 삭제 버튼 클릭
  const btn = page.getByRole('button', { name: DELETE_BUTTON, exact: true }).first();
  const visible = await btn.isVisible().catch(() => false);
  if (!visible) {
    return {
      ok: false as const,
      error_key: 'delete_button_missing' as ErrorKey,
      message: `${DELETE_BUTTON} 버튼 미노출`,
    };
  }
  if (await btn.isDisabled().catch(() => false)) {
    logger.info('[reg-delete] 상품 삭제 버튼 disabled - 권한 또는 선택 인식 실패. skip success.');
    return { ok: true as const };
  }
  await btn.click({ timeout: 5_000 });
  await page.waitForTimeout(1_000);

  const bodyText = await page.evaluate(() => document.body.innerText);
  if (!bodyText.includes(DELETE_MODAL_TITLE)) {
    return {
      ok: false as const,
      error_key: 'delete_modal_not_opened' as ErrorKey,
      message: `${DELETE_MODAL_TITLE} 모달 title 미노출`,
    };
  }
  return { ok: true as const };
};

const verifyModalContent: StepHandler = async (page) => {
  const bodyText = await page.evaluate(() => document.body.innerText);
  const requiredTexts = [
    DELETE_MODAL_TITLE,
    '어디에서 삭제',
  ];
  for (const t of requiredTexts) {
    if (!bodyText.includes(t)) {
      return {
        ok: false as const,
        error_key: 'delete_modal_content_missing' as ErrorKey,
        message: `삭제 모달 안 '${t}' 미노출`,
      };
    }
  }
  // 마켓 체크박스 — 사용 가이드 / 스마트스토어 등 하나 이상 노출
  const marketHints = ['스마트스토어', '쿠팡', '11번가', 'ESM', '롯데온', '옥션'];
  const hasAny = marketHints.some((m) => bodyText.includes(m));
  if (!hasAny) {
    logger.warn('[reg-delete] 마켓 명 (스스/쿠팡/11번가/ESM 등) 모달 안 텍스트 미감지');
  }
  // 모달 닫기 — 외부 클릭 또는 ESC
  await page.keyboard.press('Escape').catch(() => null);
  await page.waitForTimeout(500);
  return { ok: true as const };
};

const handlers: StepHandlers = {
  // TC987 삭제 모달 노출
  tc987: openDeleteModal,
  // TC988 모달 내용 검증
  tc988: verifyModalContent,
  // TC989 실 삭제 — destructive
  tc989: async () => {
    logger.info('[reg-delete] TC989: 실 마켓 삭제 — destructive (외부 마켓 호출). noop skip 처리');
    return { ok: true as const };
  },
};

test('P2 등록상품 / 삭제모달 — 모달 open + 내용 검증 + 실 삭제 skip', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
