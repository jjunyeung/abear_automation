/**
 * K1. 홈 → 모든 사이드바 메뉴 진입 smoke (e2e) — Playwright spec
 *
 * 대응 ATC: atcs/e2e/shell-menu-smoke-all.atc.yml
 *
 * 매일 회귀 가장 첫 번째 — 라우팅/세션 smoke. 빠르게 fail-fast.
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
import { logger } from '../../lib/logger';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'e2e',
  'shell-menu-smoke-all.atc.yml',
);

const APP_BASE = 'https://app.windly.cc';

/** 페이지를 URL 로 진입한 뒤 텍스트 시그니처 중 하나라도 visible 면 OK. */
function smokeStep(path: string, signatures: RegExp[], errorKey: ErrorKey): StepHandler {
  return async (page) => {
    const url = `${APP_BASE}${path}`;
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        ok: false as const,
        error_key: errorKey,
        message: `${path} goto 실패: ${msg}`,
      };
    }
    // 페이지 마운트 + React render 안정화.
    await page.waitForTimeout(2_500);

    for (const sig of signatures) {
      const cnt = await page.getByText(sig).count().catch(() => 0);
      if (cnt > 0) {
        logger.info(`[${path}] 시그니처 매치: ${sig}`);
        return { ok: true as const };
      }
    }
    // 시그니처 미매치 — body 텍스트 일부 진단 로그.
    const bodyPreview = await page.evaluate(() =>
      (document.body.innerText ?? '').slice(0, 200),
    );
    return {
      ok: false as const,
      error_key: errorKey,
      message: `${path} 마운트 신호 부재. signatures=${signatures.map((s) => s.source).join(' | ')}. body preview: ${bodyPreview}`,
    };
  };
}

const handlers: StepHandlers = {
  smoke_collected_products: smokeStep(
    '/view2/interested-product',
    [/수집상품/, /상품을\s*수집/, /상품\s*코드/],
    'collected_products_mount_failed' as ErrorKey,
  ),
  smoke_registered_products: smokeStep(
    '/view2/registered-product',
    [/등록상품/, /등록된\s*상품/, /상품\s*삭제/],
    'registered_products_mount_failed' as ErrorKey,
  ),
  smoke_product_collect: smokeStep(
    '/view3/product-import',
    [/URL\s*수집/, /엑셀\s*수집/, /상품\s*수집/],
    'product_collect_mount_failed' as ErrorKey,
  ),
  smoke_delivery_agency: smokeStep(
    '/view2/delivery-agency',
    [/배송대행지/, /배대지/, /신청서/],
    'delivery_agency_mount_failed' as ErrorKey,
  ),
  smoke_order_management: smokeStep(
    '/view2/order-management',
    [/주문\s*관리/, /주문\s*동기화/, /주문이\s*없/],
    'order_management_mount_failed' as ErrorKey,
  ),
  smoke_base_setting: smokeStep(
    '/view3/base-setting',
    [/기본\s*설정/, /공통\s*설정/, /연결\s*설정/, /판매가/],
    'base_setting_mount_failed' as ErrorKey,
  ),
};

test('홈 → 모든 메뉴 진입 smoke (e2e)', async ({ page }) => {
  test.setTimeout(5 * 60_000);

  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
