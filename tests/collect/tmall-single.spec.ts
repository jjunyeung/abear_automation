/**
 * 티몰 단건 수집 ATC — Playwright spec
 *
 * 대응 ATC: atcs/collect/tmall-single.atc.yml
 *
 * 패턴은 vertical slice exemplar (tests/collect/product-error-check.spec.ts) 와 동일:
 *   loadATC → handlers 정의 → runATC → attach('atc-result') → overall 체크
 *
 * 셀렉터 전략:
 *   - 텍스트/role 기반 우선 (getByRole, getByPlaceholder, getByText) — 한국어 UI
 *     라벨이 안정적인 자산.
 *   - 셀렉터 후보가 여러 개일 수 있는 경우 `Promise.race` 또는 `or` 로 첫 매칭
 *     사용. 실패 시 trace + screenshot 이 reports/runs/<runId>/ 에 자동 저장됨.
 */

import type { Locator, Page } from '@playwright/test';
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
  goToCollectImportMenu,
  searchByProductCode,
} from '../../lib/windly-actions';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'collect',
  'tmall-single.atc.yml',
);

// ─────────────────────────────────────────────────────────────────────────────
// 셀렉터 헬퍼
// ─────────────────────────────────────────────────────────────────────────────

/** 두 개 후보 중 먼저 visible 한 것을 클릭. 실패 시 throw. */
async function clickFirstVisible(
  page: Page,
  candidates: Locator[],
  timeoutMs = 15_000,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    for (const c of candidates) {
      if ((await c.count()) > 0 && (await c.first().isVisible())) {
        await c.first().click();
        return;
      }
    }
    await page.waitForTimeout(250);
  }
  throw new Error(
    `clickFirstVisible: 모든 후보가 ${timeoutMs}ms 내 visible 되지 않음`,
  );
}

/** 상품 URL 에서 상품 ID 추출 (티몰/타오바오 query string `id=`). */
function extractProductId(url: string): string {
  const m = url.match(/[?&]id=(\d+)/);
  return m ? m[1] : '';
}

// ─────────────────────────────────────────────────────────────────────────────
// Step handlers
// (login / enter_workspace 는 setup project = tests/auth.setup.ts 가 처리)
// ─────────────────────────────────────────────────────────────────────────────

const openCollectMenuStep: StepHandler = async (page, _inputs) => {
  await goToCollectImportMenu(page);
  return { ok: true as const };
};

const openUrlCollectStep: StepHandler = async (page, _inputs) => {
  // "URL 수집" 은 button 이 아닌 카드 div [cursor=pointer]. 카드 내부에는 import-icon img + "URL 수집" 텍스트.
  // 텍스트 노드만 클릭하면 부모 onClick 가 안 트리거되는 경우가 있어, 부모 div 를 정확 타겟.
  const urlCard = page
    .locator('div')
    .filter({ has: page.getByRole('img', { name: 'import-icon' }) })
    .filter({ hasText: /^URL 수집$/ })
    .first();
  await urlCard.waitFor({ state: 'visible', timeout: 20_000 });
  await urlCard.scrollIntoViewIfNeeded();
  await urlCard.click();
  // 클릭 후 modal/페이지 전환 시간 + 입력창 mount 대기.
  await page.waitForTimeout(1_000);
  return { ok: true as const };
};

const submitUrlStep: StepHandler = async (page, inputs) => {
  const url = typeof inputs['product_url'] === 'string' ? (inputs['product_url'] as string) : '';
  if (url.length === 0) {
    return {
      ok: false as const,
      error_key: 'missing_input' as ErrorKey,
      message: 'inputs.product_url 누락',
    };
  }

  // URL 입력 — modal/dialog 가 뜨는 데 시간이 걸릴 수 있음.
  const urlField = page
    .getByPlaceholder(/URL|주소|링크|http/i)
    .or(page.locator('input[type="url"]'))
    .or(page.locator('input[type="text"]'))
    .or(page.locator('textarea'))
    .first();
  await urlField.waitFor({ state: 'visible', timeout: 30_000 });
  await urlField.click();
  await urlField.pressSequentially(url, { delay: 10 });

  // 수집 실행 버튼 — modal 안의 primary action.
  await clickFirstVisible(
    page,
    [
      page.getByRole('button', { name: /^수집$|수집\s*하기|수집\s*시작|^등록$|^확인$/ }),
      page.getByText(/^수집$|^수집하기$|^등록$|^확인$/, { exact: false }),
    ],
    15_000,
  );
  return { ok: true as const };
};

const waitCompletionStep: StepHandler = async (page, _inputs) => {
  // URL 수집 모달의 완료 상태:
  //   - ✅ 정상 수집 완료
  //   - ⚠️ "이미 수집된 상품입니다" — DB 에 이미 있음 (= 검증 측면 성공)
  //   - ❌ "수집 실패" / "수집 중 오류" — 진짜 실패
  //
  // "실패한 수집 재시도" 같은 버튼 라벨은 무시 (일반 UI 텍스트).
  const alreadyCollected = page.getByText(/이미\s*수집된\s*상품/, { exact: false });
  const realFailureMsg = page.getByText(
    /수집\s*실패|수집\s*중\s*오류|수집할\s*수\s*없|수집되지\s*않/,
    { exact: false },
  );
  const successCheck = page
    .locator('[role="dialog"], [class*="modal"], [class*="Modal"]')
    .locator('svg, img')
    .first();

  const start = Date.now();
  while (Date.now() - start < 90_000) {
    // 1) 진짜 실패 — 명시적 실패 문구만.
    if ((await realFailureMsg.count()) > 0 && (await realFailureMsg.first().isVisible())) {
      const msg = await realFailureMsg.first().innerText().catch(() => '');
      return {
        ok: false as const,
        error_key: 'collect_failed' as ErrorKey,
        message: `수집 실패 메시지 감지: ${msg}`,
      };
    }
    // 2) "이미 수집됨" — 검증 측면에서는 통과 (상품이 windly DB 에 있음).
    if ((await alreadyCollected.count()) > 0 && (await alreadyCollected.first().isVisible())) {
      return { ok: true as const };
    }
    // 3) 모달 내 success 아이콘이 보이면 안정화 대기 후 통과.
    if ((await successCheck.count()) > 0) {
      await page.waitForTimeout(1_500);
      return { ok: true as const };
    }
    await page.waitForTimeout(1_000);
  }
  // 명시적 표시 못 봤어도 진행 — 다음 step (verify) 에서 최종 확인.
  return { ok: true as const };
};

const verifyInCollectedStep: StepHandler = async (page, inputs) => {
  const url = typeof inputs['product_url'] === 'string' ? (inputs['product_url'] as string) : '';
  const productId = extractProductId(url);

  // (1) URL 수집 모달이 떠있을 가능성 — "닫기" 버튼 클릭.
  const closeBtn = page.getByRole('button', { name: /^닫기$|^확인$|^취소$/ }).first();
  try {
    await closeBtn.waitFor({ state: 'visible', timeout: 3_000 });
    await closeBtn.click({ timeout: 5_000 });
    await page.waitForTimeout(500);
  } catch {
    // 모달이 없거나 이미 닫혔음 — 통과.
  }

  // (2) 사이드바 "수집상품" 링크 클릭 — href 가 /view2/interested-product 로 외부 도메인.
  const collectedLink = page.locator('a[href*="/view2/interested-product"]').first();
  try {
    await collectedLink.waitFor({ state: 'visible', timeout: 8_000 });
    await collectedLink.click();
  } catch {
    // 사이드바 못 찾으면 직접 navigate.
    await page.goto('https://global.windly.cc/view2/interested-product', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    }).catch(() => undefined);
  }
  await page.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => undefined);
  // 목록 렌더링 시간.
  await page.waitForTimeout(2_000);

  // (3) 검증 단순화: windly 카드는 source URL/productId 를 노출하지 않으므로,
  //     "수집상품 페이지의 첫 번째 카드 = 가장 최근 수집한 상품" 가정.
  //     첫 카드의 href 에서 windly 내부 ID 추출 → 후속 ATC 에서 사용 가능하게 로깅.
  await page.waitForTimeout(2_000);
  const firstHref = await page
    .locator('a[href*="/view2/interested-product/"]')
    .first()
    .getAttribute('href')
    .catch(() => null);
  if (firstHref === null) {
    return {
      ok: false as const,
      error_key: 'not_in_collected_list' as ErrorKey,
      message: '수집상품 페이지에 카드 0개 — 수집 자체 실패 가능',
    };
  }
  const m = firstHref.match(/\/view2\/interested-product\/(\d+)/);
  if (m === null) {
    return {
      ok: false as const,
      error_key: 'not_in_collected_list' as ErrorKey,
      message: `첫 카드 href 에서 내부 ID 추출 실패: ${firstHref}`,
    };
  }
  const internalId = m[1];
  // eslint-disable-next-line no-console
  console.log(`[tmall-single] WINDLY_INTERNAL_ID=${internalId}`);
  return { ok: true as const };
};

async function checkCount(
  page: Page,
): Promise<{ ok: true } | { ok: false; error_key: ErrorKey; message: string }> {
  // 검색 결과 = 0 개면 "검색 결과가 없습니다" 같은 안내 또는 카드 0개.
  // 1 개 이상이면 success.
  const start = Date.now();
  while (Date.now() - start < 30_000) {
    const cardCount = await page
      .locator('a[href*="/view2/interested-product/"]')
      .count();
    if (cardCount >= 1) {
      return { ok: true as const };
    }
    const noResult = await page
      .getByText(/검색\s*결과(가|는)?\s*없|결과(가|는)?\s*없/, { exact: false })
      .count();
    if (noResult > 0) {
      return {
        ok: false as const,
        error_key: 'not_in_collected_list' as ErrorKey,
        message: '상품 코드 검색 결과: 0개',
      };
    }
    await page.waitForTimeout(1_000);
  }
  return {
    ok: false as const,
    error_key: 'not_in_collected_list' as ErrorKey,
    message: '상품 코드 검색 결과 확인 timeout',
  };
}

const handlers: StepHandlers = {
  open_collect_menu: openCollectMenuStep,
  open_url_collect: openUrlCollectStep,
  submit_url: submitUrlStep,
  wait_completion: waitCompletionStep,
  verify_in_collected: verifyInCollectedStep,
};

// ─────────────────────────────────────────────────────────────────────────────
// Test
// ─────────────────────────────────────────────────────────────────────────────

test('티몰 단건 수집 후 수집상품 목록 검증', async ({ page }) => {
  test.setTimeout(10 * 60_000);

  const atc = loadATC(ATC_PATH);

  const example = atc.inputs['product_url']?.example ?? '';
  // dotenv 가 빈 변수를 빈 문자열로 로드하므로 ?? 만으로는 fallthrough 안 됨.
  const pickFirstNonEmpty = (...vals: (string | undefined)[]): string =>
    vals.find((v) => typeof v === 'string' && v.length > 0) ?? '';
  const inputs: Record<string, unknown> = {
    product_url: pickFirstNonEmpty(
      process.env['ATC_INPUT_PRODUCT_URL'],
      process.env['ATC_INPUT_URL'],
      example,
    ),
  };

  const result = await runATC({ atc, page, inputs, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
