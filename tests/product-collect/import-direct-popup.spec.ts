/**
 * 상품 수집 - 마켓 직진입 버튼 popup 검증 (통합본).
 *
 * 대응 ATC: atcs/collect/import-direct-popup.atc.yml
 * 21개 import-direct-<market>-popup.spec.ts 를 1개로 통합.
 * CASES 배열에 21개 마켓 등록. 각 마켓은 별도 test() 로 실행됨.
 *
 * Helper: lib/windly-actions.ts > goToCollectImportMenu, verifySourcingMallPopup
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
  goToCollectImportMenu,
  verifySourcingMallPopup,
} from '../../lib/windly-actions';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'product-collect', 'import-direct-popup.atc.yml');

interface MallCase {
  /** spec 제목용 짧은 식별자 (예: 'taobao', 'amazon-us') */
  id: string;
  /** SourcingMallButton 에 표시되는 라벨 (예: '타오바오', '미국') */
  mall_label: string;
  /** 새 탭의 location.host 가 매칭돼야 할 regex source */
  host_regex: string;
}

const CASES: MallCase[] = [
  { id: '1688',          mall_label: '1688',       host_regex: '(^|\\.)1688\\.com$' },
  { id: '1688-aibuy',    mall_label: '1688 AiBUY', host_regex: '(^|\\.)1688\\.com$' },
  { id: 'aliexpress',    mall_label: '알리',       host_regex: '(^|\\.)aliexpress\\.com$' },
  { id: 'amazon-ca',     mall_label: '캐나다',     host_regex: '(^|\\.)amazon\\.ca$' },
  { id: 'amazon-de',     mall_label: '독일',       host_regex: '(^|\\.)amazon\\.de$' },
  { id: 'amazon-es',     mall_label: '스페인',     host_regex: '(^|\\.)amazon\\.es$' },
  { id: 'amazon-fr',     mall_label: '프랑스',     host_regex: '(^|\\.)amazon\\.fr$' },
  { id: 'amazon-in',     mall_label: '인도',       host_regex: '(^|\\.)amazon\\.in$' },
  { id: 'amazon-it',     mall_label: '이탈리아',   host_regex: '(^|\\.)amazon\\.it$' },
  { id: 'amazon-jp',     mall_label: '일본',       host_regex: '(^|\\.)amazon\\.co\\.jp$' },
  { id: 'amazon-mx',     mall_label: '멕시코',     host_regex: '(^|\\.)amazon\\.com\\.mx$' },
  { id: 'amazon-uk',     mall_label: '영국',       host_regex: '(^|\\.)amazon\\.co\\.uk$' },
  { id: 'amazon-us',     mall_label: '미국',       host_regex: '(^|\\.)amazon\\.com$' },
  { id: 'domeggook',     mall_label: '도매꾹',     host_regex: '(^|\\.)domeggook\\.com$' },
  { id: 'domeme',        mall_label: '도매매',     host_regex: '(^|\\.)domeggook\\.com$' },
  { id: 'ownerclan',     mall_label: '오너클랜',   host_regex: '(^|\\.)ownerclan\\.com$' },
  { id: 'rakuten',       mall_label: '라쿠텐',     host_regex: '(^|\\.)rakuten\\.co\\.jp$' },
  { id: 'taobao',        mall_label: '타오바오',   host_regex: '(^|\\.)taobao\\.com$' },
  { id: 'temu',          mall_label: '테무',       host_regex: '(^|\\.)temu\\.com$' },
  { id: 'tmall',         mall_label: '티몰',       host_regex: '(^|\\.)tmall\\.com$' },
  { id: 'vvic',          mall_label: 'VVIC',       host_regex: '(^|\\.)vvic\\.com$' },
];

function asInput(inputs: Record<string, unknown>, key: string): string {
  const v = inputs[key];
  if (typeof v !== 'string' || v.length === 0) {
    throw new Error(`inputs.${key} 가 string 이 아니거나 비어있음: ${String(v)}`);
  }
  return v;
}

const openCollectMenuStep: StepHandler = async (page) => {
  await goToCollectImportMenu(page);
  return { ok: true as const };
};

const clickMallVerifyPopupStep: StepHandler = async (page, inputs) => {
  const mallLabel = asInput(inputs, 'mall_label');
  const hostRegex = asInput(inputs, 'host_regex');
  const r = await verifySourcingMallPopup(page, mallLabel, new RegExp(hostRegex, 'i'));
  if (r.ok) return { ok: true as const };
  return { ok: false as const, error_key: r.error_key as ErrorKey, message: r.message };
};

const handlers: StepHandlers = {
  open_collect_menu: openCollectMenuStep,
  click_mall_verify_popup: clickMallVerifyPopupStep,
};

// Hybrid mode:
//   - GUI/CLI 가 ATC_INPUT_MALL_LABEL + ATC_INPUT_HOST_REGEX 제공 → 그 1건만 실행
//   - env 미제공 → CASES 21개 마켓 전체 실행
const envMallLabel = process.env['ATC_INPUT_MALL_LABEL'];
const envHostRegex = process.env['ATC_INPUT_HOST_REGEX'];
const singleRun = envMallLabel && envHostRegex;

if (singleRun) {
  test(`상품 수집 - ${envMallLabel} 버튼 새 창 popup 검증 (env 단일 실행)`, async ({ page }) => {
    test.setTimeout(3 * 60_000);
    const atc = loadATC(ATC_PATH);
    const result = await runATC({
      atc,
      page,
      inputs: { mall_label: envMallLabel, host_regex: envHostRegex },
      handlers,
    });
    await test.info().attach('atc-result', {
      body: JSON.stringify(result),
      contentType: 'application/json',
    });
    expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
  });
} else {
  for (const c of CASES) {
    test(`상품 수집 - ${c.mall_label} (${c.id}) 버튼 새 창 popup 검증`, async ({ page }) => {
      test.setTimeout(3 * 60_000);
      const atc = loadATC(ATC_PATH);
      const result = await runATC({
        atc,
        page,
        inputs: { mall_label: c.mall_label, host_regex: c.host_regex },
        handlers,
      });
      await test.info().attach('atc-result', {
        body: JSON.stringify(result),
        contentType: 'application/json',
      });
      expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
    });
  }
}
