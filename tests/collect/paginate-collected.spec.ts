/**
 * 수집상품 목록 페이지네이션 ATC — Playwright spec
 *
 * 대응 ATC: atcs/collect/paginate-collected.atc.yml
 * 용도: "페이지 이동" input 으로 임의의 N 페이지 jump 가 동작하는지 단독 검증.
 *
 * Selector 출처:
 *   sesame PageNavigation 컴포넌트 — "페이지 이동" 라벨 + form + textbox + Enter 시 setPage(N).
 *   숫자 버튼은 화면에 보이는 5개만이라 일반화 안 됨 → input 사용.
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
  goToCollectedProducts,
  goToPage,
} from '../../lib/windly-actions';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'collect',
  'paginate-collected.atc.yml',
);

// login / enter_workspace 는 setup project (tests/auth.setup.ts) 가 처리.

const openCollectedListStep: StepHandler = async (page, _inputs) => {
  await goToCollectedProducts(page);
  return { ok: true as const };
};

const gotoPageStep: StepHandler = async (page, inputs) => {
  const raw = inputs['page_number'];
  const n =
    typeof raw === 'string'
      ? parseInt(raw, 10)
      : typeof raw === 'number'
        ? raw
        : NaN;
  if (!Number.isInteger(n) || n < 1) {
    return {
      ok: false as const,
      error_key: 'missing_input' as ErrorKey,
      message: `inputs.page_number 가 양의 정수가 아님: ${String(raw)}`,
    };
  }
  try {
    await goToPage(page, n);
    return { ok: true as const };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false as const,
      error_key: 'pagination_failed' as ErrorKey,
      message: `${n} 페이지 이동 실패: ${msg}`,
    };
  }
};

const handlers: StepHandlers = {
  open_collected_list: openCollectedListStep,
  goto_page: gotoPageStep,
};

test('수집상품 목록 페이지네이션 이동', async ({ page }) => {
  test.setTimeout(3 * 60_000);

  const atc = loadATC(ATC_PATH);
  // example/hardcoded default 제거 — placeholder 가 silent 하게 실제 값으로 둔갑하는 함정 방지.
  // 빈 값은 핸들러 책임으로 위임.
  const inputs: Record<string, unknown> = {
    page_number: process.env['ATC_INPUT_PAGE_NUMBER'] ?? '',
  };

  const result = await runATC({ atc, page, inputs, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
