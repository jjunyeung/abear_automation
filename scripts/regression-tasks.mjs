/**
 * Regression task lists — Tier 별 자동 회귀 대상 ATC.
 *
 * `install-regression-launchd.mjs` 가 이 목록을 base64 인코딩해서 plist 에 박는다.
 * 신규 e2e 추가/삭제 시 여기만 갱신 → install 재실행.
 *
 * Tier 분류 근거: e2e-regression-plan.md 참고.
 */

import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

/** ATC 상대경로 → 절대경로 + 빈 inputs. atc-multi 가 받는 task shape. */
function task(relPath) {
  return { atcPath: path.join(REPO_ROOT, relPath), inputs: {} };
}

/** Tier 1 — 매일 회귀. 실제 수정/액션 동작 검증. 18분. */
export const TIER1_DAILY = [
  task('atcs/e2e/shell-menu-smoke-all.atc.yml'),
  task('atcs/e2e/url-collect-detail-smoke.atc.yml'),
  task('atcs/e2e/registered-delete-cascade.atc.yml'),
  task('atcs/e2e/red-tab-detect-fix-recheck.atc.yml'),
  task('atcs/e2e/option-normalize-then-pass-check.atc.yml'),
  task('atcs/e2e/ai-category-then-pass-check.atc.yml'),
  task('atcs/e2e/ai-name-suggest-apply-save.atc.yml'),
  task('atcs/e2e/ai-category-suggest-apply.atc.yml'),
  task('atcs/e2e/verify-base-setting-on-product.atc.yml'),
  task('atcs/e2e/verify-talkstore-points-on-product.atc.yml'),
  task('atcs/e2e/bulk-customs-tax-edit-then-upload.atc.yml'),
  task('atcs/e2e/da-application-submit-end-to-end.atc.yml'),
  task('atcs/e2e/registered-edit-name-reupload-verify.atc.yml'),
];

/** Tier 2 — 주 1회 sweep. 페이지 마운트 smoke. 14분. */
export const TIER2_WEEKLY_SWEEP = [
  task('atcs/e2e/verify-stock-on-product.atc.yml'),
  task('atcs/e2e/verify-market-weights-on-product.atc.yml'),
  task('atcs/e2e/verify-customs-tax-on-product.atc.yml'),
  task('atcs/e2e/verify-delivery-fee-on-product.atc.yml'),
  task('atcs/e2e/verify-product-attribute-on-product.atc.yml'),
  task('atcs/e2e/verify-ai-translation-on-product.atc.yml'),
  task('atcs/e2e/verify-watermark-on-product.atc.yml'),
  task('atcs/e2e/order-sync-list-detail.atc.yml'),
  task('atcs/e2e/order-instruct-delivery-da-form.atc.yml'),
  task('atcs/e2e/order-cancel-exchange-return.atc.yml'),
  task('atcs/e2e/plan-payment-modal-open.atc.yml'),
  task('atcs/e2e/staff-account-permission.atc.yml'),
  task('atcs/e2e/signup-onboarding-home.atc.yml'),
  task('atcs/e2e/popular-product-recommend-collect.atc.yml'),
  task('atcs/e2e/ai-global-collect-modal-send.atc.yml'),
  task('atcs/e2e/ai-thumbnail-generate-apply-upload.atc.yml'),
  task('atcs/e2e/excel-bulk-collect-pick-upload.atc.yml'),
  task('atcs/e2e/registered-option-price-sync.atc.yml'),
];

/** 주간 sweep = Tier 1 + Tier 2 (망가진 거 한 번에 확인). 32분. */
export const WEEKLY_FULL_SWEEP = [...TIER1_DAILY, ...TIER2_WEEKLY_SWEEP];

/** base64 인코딩 — atc-multi 의 --tasks 인자 형식. */
export function encodeTasks(tasks) {
  return Buffer.from(JSON.stringify(tasks), 'utf8').toString('base64');
}
