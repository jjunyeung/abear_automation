/**
 * 수집상품 / 톡스토어 영역 P1 — ProductDetail 탭 노출 검증 (5건).
 *
 * 대응 ATC : atcs/collected-product/p1-수집상품-톡스토어.atc.yml
 * TC 원본  : Case No 1073~1077 / P1 — 이미지/옵션/판매가/상품 속성/상세페이지 탭
 *
 * 탭 라벨 출처: windly_repo/sesame/src/features/ProductDetail/ProductDetail.const.ts
 *   image=이미지 / option=옵션 / sales=판매가 / attribute=상품 속성 / detail-page=상세페이지
 *
 * non-destructive: 수집상품 첫 카드 상세 진입 후 각 탭을 클릭하여 라벨 노출(=탭 존재)을 검증.
 * 탭은 마켓 활성 여부와 무관하게 항상 렌더링되는 ProductDetail 최상위 탭이다.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import {
  openFirstCollectedProductStep,
  clickTabByLabelStep,
} from './_talkstore-handlers';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'collected-product',
  'p1-수집상품-톡스토어.atc.yml',
);

// 상세 진입은 1회만 — 탭 5개가 동일 상세 페이지에서 전환된다.
let detailOpen = false;
const ensureDetailStep: StepHandler = async (page, inputs) => {
  if (detailOpen) return { ok: true as const };
  const r = await openFirstCollectedProductStep(page, inputs);
  if (r.ok) detailOpen = true;
  return r;
};

/** 상세 진입(idempotent) 후 해당 탭 라벨 클릭 → 노출 검증 (라벨 미노출 시 fail). */
const tabStep = (labelRe: RegExp): StepHandler => async (page, inputs) => {
  const e = await ensureDetailStep(page, inputs);
  if (!e.ok) return e;
  return clickTabByLabelStep(labelRe)(page, inputs);
};

const handlers: StepHandlers = {
  tc1073: tabStep(/^이미지$/),
  tc1074: tabStep(/^옵션$/),
  tc1075: tabStep(/^판매가$/),
  'tc1076_상품-속성': tabStep(/^상품 속성$/),
  tc1077: tabStep(/^상세페이지$/),
};

test('수집상품 상세 → 이미지/옵션/판매가/상품 속성/상세페이지 탭 노출 (TC 1073~1077)', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  detailOpen = false;
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
