/**
 * 복구: URL 수집이 실패(수집된 상품이 안 생김)했을 때 URL 풀의 "다음 리스트" URL 로
 *       재시도. 최대 2회.
 *
 * 트리거 키: collect_failed
 *   - 대상 플로우: URL 풀 기반 BulkImport 수집 (_url-collect-handlers.ts 의 wait_completion).
 *     모달의 BulkImportTable row 가 error 아이콘(a.fail) 으로 끝나 상품이 하나도 안 생긴 경우.
 *   - 원 URL 이 판매종료/삭제/봇차단 등 외부 요인으로 수집 불가여도, 풀의 다음 URL 은
 *     정상일 수 있으므로 자동으로 다음 URL 을 뽑아 재수집한다.
 *
 * 스코프 가드 (중요):
 *   collect_failed 은 tmall-single.spec.ts 도 emit 하지만, 그건 "특정 tmall URL 을
 *   검증" 하는 ATC 라 풀의 임의 URL 로 바꿔 수집하면 뒤 verify step 이 원 상품 ID 를
 *   못 찾아 오히려 깨진다. 그래서 이 복구는 BulkImportTable(a.importing/a.success/a.fail)
 *   컨텍스트일 때만 재시도하고, 아니면 no-op 로 빠져 기존 동작(미실행)을 유지한다.
 *
 * 재개(D4):
 *   - restart_from 미지정(기본) → runner 가 실패한 step(wait_completion) 을 재실행.
 *   - 재시도 성공 시: 새 URL 이 수집되어 모달이 a.success 상태로 남으므로 재실행이 통과.
 *   - 재시도 소진/풀 소진 시: 마지막 실패 모달 상태로 남으므로 재실행이 다시 collect_failed
 *     → collect_failed 은 NOT_EXECUTED_KEYS 라 최종 '미실행(skipped)' 으로 분류(기존과 동일).
 *     (D12: 같은 (step, key) 복구는 1회만 — 두 번째 collect_failed 는 복구 없이 skipped.)
 *
 * 실패 정책:
 *   - 풀 소진/재시도 소진은 throw 하지 않는다(외부 요인이라 실패가 아니라 미실행 처리 대상).
 *   - 개별 attempt 의 일시 오류(카드 미노출 등)는 삼켜서 다음 attempt 로 넘어가되,
 *     성공을 가장하지 않는다 — 마지막까지 성공 못 하면 조용히 return 하여 runner 가
 *     재실행으로 최종 상태를 재판정하게 둔다.
 */

import type { Page } from '@playwright/test';
import type { RecoveryContext } from '../lib/errors';
import { logger } from '../lib/logger';
import { goToCollectImportMenu } from '../lib/windly-actions';
import { headPop } from '../lib/url-pool';

/** 풀의 "다음 리스트" URL 로 재시도할 최대 횟수 (사용자 지정: 2번까지). */
const MAX_RETRY_URLS = 2;

type Terminal = 'success' | 'fail' | 'timeout';

/** 상품 수집 페이지에서 "URL 수집" 카드를 클릭해 모달을 연다 (_url-collect-handlers 와 동일 selector). */
async function openUrlCollectCard(page: Page): Promise<void> {
  const urlCard = page
    .locator('div')
    .filter({ has: page.getByRole('img', { name: 'import-icon' }) })
    .filter({ hasText: /^URL 수집$/ })
    .first();
  await urlCard.waitFor({ state: 'visible', timeout: 20_000 });
  await urlCard.scrollIntoViewIfNeeded();
  await urlCard.click();
  await page.waitForTimeout(1_000);
}

/** URL 입력 후 "수집하기" 클릭 (_url-collect-handlers.submitUrlStep 과 동일 selector). */
async function submitUrl(page: Page, url: string): Promise<void> {
  const urlField = page
    .getByPlaceholder(/URL|주소|링크|http/i)
    .or(page.locator('textarea'))
    .or(page.locator('input[type="url"]'))
    .or(page.locator('input[type="text"]'))
    .first();
  await urlField.waitFor({ state: 'visible', timeout: 30_000 });
  await urlField.click();
  await urlField.pressSequentially(url, { delay: 10 });

  const submitBtn = page.getByRole('button', { name: /^수집하기$/ }).first();
  await submitBtn.waitFor({ state: 'visible', timeout: 15_000 });
  await submitBtn.click();
}

/**
 * BulkImportTable row 로 종료 상태를 판정 (_url-collect-handlers.waitCompletionStep 미러).
 *   a.success ≥ 1 && a.fail === 0 → 'success'
 *   a.fail ≥ 1 (또는 종료인데 success 0) → 'fail'
 *   5분 내 스피너(a.importing) 안 사라지면 → 'timeout'
 */
async function waitTerminal(page: Page): Promise<Terminal> {
  const importingRow = page.locator('a.importing');
  const successRow = page.locator('a.success');
  const failRow = page.locator('a.fail');

  // (1) 첫 row 등장 대기 (submit → importing 전환 + BulkImportTable mount).
  const firstStart = Date.now();
  while (Date.now() - firstStart < 30_000) {
    const total =
      (await importingRow.count()) +
      (await successRow.count()) +
      (await failRow.count());
    if (total >= 1) break;
    await page.waitForTimeout(400);
  }

  // (2) 스피너 사라질 때까지 폴링 (최대 5분).
  const completeStart = Date.now();
  while (Date.now() - completeStart < 5 * 60_000) {
    if ((await importingRow.count()) === 0) break;
    await page.waitForTimeout(800);
  }
  if ((await importingRow.count()) > 0) return 'timeout';

  // (3) 종료 상태 판정 — Badge mount 안정화 후.
  await page.waitForTimeout(500);
  const fails = await failRow.count();
  const successes = await successRow.count();
  if (fails > 0) return 'fail';
  if (successes === 0) return 'fail';
  return 'success';
}

export async function recover(page: Page, _ctx: RecoveryContext): Promise<void> {
  // 스코프 가드: BulkImportTable(URL 풀) 컨텍스트가 아니면 재시도하지 않는다.
  const inBulkImportContext =
    (await page.locator('a.fail, a.importing, a.success').count()) > 0;
  if (!inBulkImportContext) {
    logger.warn(
      '[recover collect_failed] BulkImport(URL 풀) 컨텍스트 아님 → 풀 재시도 생략 (기존대로 미실행 유지)',
    );
    return;
  }

  for (let attempt = 1; attempt <= MAX_RETRY_URLS; attempt += 1) {
    const nextUrl = headPop();
    if (nextUrl === null) {
      logger.warn(
        `[recover collect_failed] URL 풀 소진 — 더 이상 재시도할 URL 없음 (attempt ${attempt}/${MAX_RETRY_URLS}) → 미실행 처리`,
      );
      return;
    }

    logger.warn(
      `[recover collect_failed] 재시도 ${attempt}/${MAX_RETRY_URLS} — 다음 풀 URL 로 재수집: ${nextUrl.slice(0, 70)}...`,
    );

    try {
      // 모달/상태를 확실히 리셋: 수집 메뉴로 하드 내비게이션 후 카드 재오픈 → 새 URL 제출.
      await goToCollectImportMenu(page);
      await openUrlCollectCard(page);
      await submitUrl(page, nextUrl);
      const outcome = await waitTerminal(page);

      if (outcome === 'success') {
        logger.info(
          `[recover collect_failed] 재시도 ${attempt} 수집 성공 → wait_completion 재실행이 통과할 상태`,
        );
        return;
      }
      logger.warn(
        `[recover collect_failed] 재시도 ${attempt} 결과=${outcome} — 다음 URL 로 진행`,
      );
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      logger.warn(
        `[recover collect_failed] 재시도 ${attempt} 중 일시 오류(${err.message}) — 다음 URL 로 진행`,
      );
    }
  }

  logger.warn(
    `[recover collect_failed] ${MAX_RETRY_URLS}회 재시도 모두 수집 실패 → 미실행(skipped) 로 처리 (외부 요인)`,
  );
}
