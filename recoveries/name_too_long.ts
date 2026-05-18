/**
 * Recovery flow: `name_too_long`
 *
 * 윈들리 상품 상세의 마켓별 상품명 입력란에서 해당 마켓 한도를 넘는 (X/Y자 형태로
 * 빨간색 표시되는) 상품명을 한도 길이까지 자른다.
 *
 * 흐름:
 *   1) 화면에서 "X/Y자" 패턴 카운터(over-limit indicator)를 모두 찾는다.
 *   2) 각각에 대해 부모 row 의 textbox 의 value 를 Y 글자로 자른다 (단순 .substring).
 *   3) 다른 곳에서도 over-limit 이 사라질 때까지 반복.
 *
 * 규칙:
 *   - C7: nested recovery 호출 금지 — 본 파일은 다른 recover() 호출 안 함.
 *   - C8: 'name_too_long' 한 종류만 처리.
 *   - D12: 실패 시 throw → runner 가 1회 실패로 기록.
 */

import type { Locator, Page } from '@playwright/test';
import type { RecoveryContext } from '../lib/errors';
import { logger } from '../lib/logger';

interface OverLimitInfo {
  /** "X/Y자" 형태의 카운터 텍스트. */
  counterText: string;
  /** 추출된 한도 Y. */
  limit: number;
  /** 추출된 현재 길이 X. */
  current: number;
  /** 동일 row 의 textbox locator (잘라야 할 입력란). */
  textbox: Locator;
}

async function collectOverLimitFields(page: Page): Promise<OverLimitInfo[]> {
  const counters = page.getByText(/^\d+\s*\/\s*\d+자$/);
  const count = await counters.count();
  const out: OverLimitInfo[] = [];
  for (let i = 0; i < count; i++) {
    const c = counters.nth(i);
    const text = (await c.innerText().catch(() => '')).trim();
    const m = text.match(/^(\d+)\s*\/\s*(\d+)자$/);
    if (m === null) continue;
    const current = Number(m[1]);
    const limit = Number(m[2]);
    if (Number.isNaN(current) || Number.isNaN(limit) || current <= limit) continue;
    // 동일 row 의 textbox: counter 의 형제 또는 부모의 자손 중 input 류.
    // counter 의 부모 generic 안에 textbox 존재.
    const tb = c.locator('xpath=ancestor::*[1]').locator('input[type="text"], textarea').first();
    out.push({ counterText: text, current, limit, textbox: tb });
  }
  return out;
}

export async function recover(page: Page, ctx: RecoveryContext): Promise<void> {
  logger.warn(
    `[recovery:name_too_long] 시작 — last_step=${ctx.last_step_id}, url=${ctx.page_url}`,
  );

  const fields = await collectOverLimitFields(page);
  if (fields.length === 0) {
    throw new Error(
      '[recovery:name_too_long] over-limit 카운터를 찾지 못했음 (이미 수정됐거나 selector 변경)',
    );
  }

  for (const f of fields) {
    const textboxCount = await f.textbox.count();
    if (textboxCount === 0) {
      throw new Error(
        `[recovery:name_too_long] 카운터(${f.counterText}) 옆 textbox 미발견`,
      );
    }
    const value = (await f.textbox.inputValue().catch(() => '')) || '';
    if (value.length === 0) {
      throw new Error(
        `[recovery:name_too_long] 카운터(${f.counterText}) 옆 textbox 값이 비어있음 — over-limit 모순`,
      );
    }
    const trimmed = value.slice(0, f.limit);
    logger.info(
      `[recovery:name_too_long] 자르기: ${f.current}자 → ${f.limit}자 (counter=${f.counterText})`,
    );
    await f.textbox.click();
    await f.textbox.fill('');
    await f.textbox.pressSequentially(trimmed, { delay: 5 });
    // blur 로 onChange/검증 트리거.
    await f.textbox.press('Tab');
  }

  // 저장이 필요한 UI 인지 확인 — 별도 저장 버튼이 없다면 입력만으로 적용됨.
  // 윈들리는 onChange 마다 자동 저장하는 패턴으로 보임 (별도 "저장" 버튼 없이).
  // 안정화 위해 짧게 대기.
  await page.waitForTimeout(1_000);
}
