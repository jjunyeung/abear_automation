/**
 * Vertical slice exemplar — Playwright spec for `atcs/collect/product-error-check.atc.yml`
 *
 * Fulfills R-A2.2 (디렉토리 구조 = 소스 미러):
 *   given: ATC = atcs/collect/product-error-check.atc.yml
 *   when:  /atc-new 가 spec 을 생성 (또는 사람이 직접 작성)
 *   then:  대응 spec = tests/collect/product-error-check.spec.ts
 *          atc-loader 로 YAML 로드 → runner.runATC() 호출
 *
 * Fulfills R-A2.3 (예제 spec — 표준 패턴):
 *   given: 위 ATC 파일 존재
 *   when:  본 파일을 보면
 *   then:  "loadATC → handlers 정의 → runATC → attach('atc-result')" 의
 *          3블록 표준 패턴이 보이고, 새 ATC 추가 시 이 파일을 그대로
 *          템플릿으로 복사하면 됨.
 *
 * 핵심 패턴:
 *   1. ATC YAML 로드  : `loadATC(ATC_PATH)`
 *   2. step handlers  : ATC step.id ↔ Playwright 액션 매핑 (handler 가 throw 대신
 *                       `{ ok:false, error_key }` 로 에러를 보고 — runner 가 D5 매칭/D11 unhandled/D12 복구를 처리)
 *   3. 실행 + 리포팅 : `runATC(...)` 호출 → 결과를 `atc-result` attachment 로
 *                       reporter (reporters/atc-reporter.ts) 에 전달
 *   4. pass/fail 신호 : `result.overall !== 'success'` 면 throw → Playwright FAIL
 *
 * 새 ATC 추가 시:
 *   - 본 파일을 `tests/<domain>/<name>.spec.ts` 로 복사
 *   - ATC_PATH 만 새 YAML 경로로 변경
 *   - handlers 객체에 ATC.steps[i].id 마다 하나씩 핸들러 추가
 *   - 그 외 변경 불필요 (loadATC / runATC / attach 형식은 고정)
 */

import { join } from 'path';
import { test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import {
  runATC,
  type StepHandler,
  type StepHandlers,
} from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';

/** ATC YAML path. tests/ 와 atcs/ 는 sibling — `../../atcs/<domain>/<name>.atc.yml`. */
const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'collected-product',
  'product-error-check.atc.yml',
);

// ─────────────────────────────────────────────────────────────────────────────
// Step handlers
// ─────────────────────────────────────────────────────────────────────────────
//
// ATC YAML 의 step.do 는 한국어 자연어. 그 의도를 실제 Playwright 호출로 옮기는
// 곳이 여기. runner 는 step.id 로 핸들러를 lookup 하므로, key 가 정확히 일치해야 함.
//
// 핸들러 계약 (lib/runner.ts 의 `StepHandler`):
//   (page, inputs) => Promise<{ok:true} | {ok:false, error_key, message?}>
//   - 정상: `{ ok: true }`
//   - 알려진 에러: `{ ok: false, error_key: <ErrorKey>, message? }`
//   - throw 도 허용되지만 (runner 가 catch 해서 'failed' 로 기록), 가급적
//     명시적 outcome 반환을 권장 (T3 learning).

/**
 * step `collect` — 윈들리 수집 페이지 진입 → URL 입력 → 수집 버튼 클릭 → 완료 대기.
 *
 * MVP: 실제 윈들리 UI 미구현 — `inputs.url` 검증만 수행하고 OK 반환. 사용자가
 * 채워 넣을 자리는 TODO 블록.
 */
const collectStep: StepHandler = async (_page, inputs) => {
  const rawUrl = inputs['url'];
  const url = typeof rawUrl === 'string' ? rawUrl : '';
  if (url.length === 0) {
    return {
      ok: false as const,
      error_key: 'missing_input' as ErrorKey,
      message: 'inputs.url 누락',
    };
  }

  // TODO: 실제 윈들리 수집 자동화
  //   await _page.goto(`${process.env.WINDLY_BASE_URL ?? 'https://app.windly.cc'}/collect`);
  //   await _page.locator('[name="url"]').fill(url);
  //   await _page.locator('[data-action="collect"]').click();
  //   await _page.waitForLoadState('networkidle');

  return { ok: true as const };
};

/**
 * step `open_detail` — 수집된 상품의 상세 페이지로 이동.
 * MVP: 미구현 — 항상 OK.
 */
const openDetailStep: StepHandler = async (_page, _inputs) => {
  // TODO: 수집 결과 목록의 첫 항목 클릭 또는 직접 URL 이동
  //   await _page.locator('[data-test="collected-product"]').first().click();
  //   await _page.waitForLoadState('networkidle');
  return { ok: true as const };
};

/**
 * step `error_check` — 에러체크 실행.
 *
 * MVP 데모: vertical slice 의 분기 흐름을 보여주기 위해 의도적으로 항상
 * `missing_image` 에러를 반환 → runner 가 on_error 매칭 →
 * `recoveries/missing_image.ts` 호출 → (현재) 미구현 throw → D12 경로로
 * 리포트에 "recovery attempt failed" 기록.
 *
 * 사용자가 recoveries/missing_image.ts 의 TODO 를 채우면 다음 흐름이 됨:
 *   error_check (FAIL: missing_image)
 *     → recover() 성공
 *     → on_recovery.restart_from='error_check' 로 복귀
 *     → error_check 재시도
 *
 * 이 함수도 사용자가 실제 윈들리 에러체크 결과 파싱으로 대체하면 됨.
 */
const errorCheckStep: StepHandler = async (_page, _inputs) => {
  // TODO: 실제 윈들리 에러체크 후 결과 파싱
  //   await _page.locator('[data-action="error-check"]').click();
  //   const errors = await _page.locator('[data-test="error-row"]').all();
  //   if (errors.length === 0) return { ok: true as const };
  //   const firstKey = await errors[0].getAttribute('data-error-key');
  //   return { ok: false as const, error_key: firstKey as ErrorKey };

  // 데모용 시뮬레이션 — 항상 missing_image 반환.
  return {
    ok: false as const,
    error_key: 'missing_image' as ErrorKey,
    message: '데모 시뮬레이션 — 항상 missing_image 반환 (실제 에러체크 로직으로 교체할 자리)',
  };
};

const handlers: StepHandlers = {
  collect: collectStep,
  open_detail: openDetailStep,
  error_check: errorCheckStep,
};

// ─────────────────────────────────────────────────────────────────────────────
// Test
// ─────────────────────────────────────────────────────────────────────────────

test('상품을 수집하고 에러체크를 수행한다 (vertical slice)', async ({ page }) => {
  // 1) ATC 로드 (zod 검증 포함 — R-A1.4)
  const atc = loadATC(ATC_PATH);

  // 2) 입력 주입 — example 폴백 제거 (GUI placeholder 가 silent 하게 실제 값으로 둔갑하는 함정 방지).
  //    빈 값이면 핸들러에서 명시 fail. GUI 큐의 from: previous 자동 주입은 env 로 도착하므로 그대로 동작.
  const inputs: Record<string, unknown> = {
    url: process.env['ATC_INPUT_URL'] ?? '',
  };

  // 3) 실행 (runner 는 throw 안 함 — 모든 결과는 RunResult 안에)
  const result = await runATC({
    atc,
    page,
    inputs,
    handlers,
  });

  // 4) reporter 에 결과 전달 (atc-reporter.ts 가 'atc-result' attachment 를 수집)
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  // 5) Playwright pass/fail 신호 — overall === 'success' 면 통과
  if (result.overall !== 'success') {
    throw new Error(
      `ATC 실패 — 단계별 결과는 reports/runs/<runId>/ 의 .md / .json 리포트 참조`,
    );
  }
});
