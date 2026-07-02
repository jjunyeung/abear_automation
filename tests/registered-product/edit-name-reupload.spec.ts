/**
 * 등록상품 상세 상품명 수정 후 재업로드 ATC — Playwright spec
 *
 * 대응 ATC: atcs/upload/edit-name-reupload.atc.yml
 *
 * 핵심 step 노트:
 *   - search_product / open_detail : 등록상품 페이지에서 동작. searchByProductCode 는
 *     interested + registered 두 href 패턴을 모두 카운트하므로 그대로 재사용.
 *     상세 진입은 등록상품 href 전용으로 인라인 처리.
 *   - edit_name : 상품 상세 화면 최상단의 큰 상품명 textbox/textarea/contenteditable 를
 *     찾아 새 값으로 교체. 셀렉터 후보 다중 시도.
 *   - trigger_upload : single-product.spec.ts 와 동일하게 체크마크 svg 오른쪽 아이콘 클릭.
 *   - confirm_upload_modal : "업로드 하기" 또는 그에 준하는 progress 버튼 클릭.
 *     (등록상품 재업로드 시 모달 문구가 다를 수 있어 regex 폭을 넓혀둔다.)
 *   - wait_upload_complete : single-product 와 동일한 polling 패턴.
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
  goToRegisteredProducts,
  searchByProductCode,
} from '../../lib/windly-actions';
import { closeUploadResultModal, waitUploadComplete } from '../../lib/upload-actions';
import { logger } from '../../lib/logger';

const ATC_PATH = join(
  __dirname,
  '..',
  '..',
  'atcs',
  'registered-product',
  'edit-name-reupload.atc.yml',
);

// ─────────────────────────────────────────────────────────────────────────────
// Step handlers
// (login / enter_workspace 는 setup project = tests/auth.setup.ts 가 처리)
// ─────────────────────────────────────────────────────────────────────────────

const openRegisteredListStep: StepHandler = async (page, _inputs) => {
  await goToRegisteredProducts(page);
  return { ok: true as const };
};

const searchProductStep: StepHandler = async (page, inputs) => {
  const id =
    typeof inputs['source_product_id'] === 'string'
      ? (inputs['source_product_id'] as string)
      : '';
  if (id.length === 0) {
    return {
      ok: false as const,
      error_key: 'missing_input' as ErrorKey,
      message: 'inputs.source_product_id 누락',
    };
  }
  const count = await searchByProductCode(page, id);
  if (count === 0) {
    return {
      ok: false as const,
      error_key: 'product_not_found' as ErrorKey,
      message: `상품 코드 ${id} 검색 결과 0개`,
    };
  }
  return { ok: true as const };
};

const openDetailStep: StepHandler = async (page, _inputs) => {
  const card = page
    .locator('a[href*="/view2/registered-product/"]')
    .first();
  const cnt = await card.count();
  if (cnt === 0) {
    return {
      ok: false as const,
      error_key: 'detail_open_failed' as ErrorKey,
      message: '등록상품 카드 0개 — 검색 결과 없음',
    };
  }
  await card.click();
  await page
    .waitForURL(/\/view2\/registered-product\/\d+/, { timeout: 30_000 })
    .catch(() => undefined);
  await page
    .waitForLoadState('domcontentloaded', { timeout: 30_000 })
    .catch(() => undefined);
  await page.waitForTimeout(1_500);
  return { ok: true as const };
};

/**
 * 상품명 input 모두 탐색 + 교체.
 *
 * 윈들리 상품 상세 "기본 정보" 탭에는 1) 기본 상품명 textbox + 2) 마켓별 상품명 textbox
 * 들이 함께 노출된다 (스마트스토어/쿠팡/11번가/ESM 2.0/롯데온/톡스토어 등). 상세 페이지
 * 첫 진입 시 모든 마켓별 상품명은 기본 상품명과 동일한 값을 갖는다.
 *
 * 따라서 전략:
 *   1) 페이지 상단의 textbox 중 가장 긴 value 를 "원본 상품명" 으로 식별.
 *   2) value 가 동일하거나 원본의 앞 20자 prefix 를 포함하는 모든 input/textarea 를
 *      후보로 모은다 (마켓별 length-limit 으로 잘려있어도 prefix 매칭).
 *   3) 각 후보를 새 값으로 일괄 교체.
 *
 * 1개도 갱신 못 하면 fail. 전부 성공해야 ok.
 */
const editNameStep: StepHandler = async (page, inputs) => {
  const newName =
    typeof inputs['new_name'] === 'string' ? (inputs['new_name'] as string) : '';
  if (newName.length === 0) {
    return {
      ok: false as const,
      error_key: 'missing_input' as ErrorKey,
      message: 'inputs.new_name 누락',
    };
  }

  // 1) 원본 상품명 식별: 페이지 안 모든 textbox 중 value 가 가장 긴 (그리고 길이 ≥10) 것.
  const originalName = await page.evaluate(() => {
    const els = Array.from(
      document.querySelectorAll('input[type="text"], input:not([type]), textarea'),
    ) as (HTMLInputElement | HTMLTextAreaElement)[];
    let best = '';
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const cs = window.getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      const v = el.value ?? '';
      if (v.length > best.length) best = v;
    }
    return best;
  });

  if (originalName.length < 5) {
    return {
      ok: false as const,
      error_key: 'name_input_not_found' as ErrorKey,
      message: `원본 상품명 식별 실패 (가장 긴 textbox value 길이 ${originalName.length})`,
    };
  }
  logger.info(
    `[edit_name] 원본 상품명 식별 (길이 ${originalName.length}): "${originalName.slice(0, 30)}..."`,
  );

  // 마켓별 상품명 필드는 페이지 하단의 collapsed section 안에 있을 수 있어, 전체 스크롤
  // + 가능한 expand 트리거를 발생시킨 뒤 수집한다.
  await page.evaluate(async () => {
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    // 메인 스크롤 컨테이너 추론: body/html 또는 가장 큰 overflow:auto element.
    const root =
      document.scrollingElement ?? document.documentElement ?? document.body;
    const total = root.scrollHeight;
    const step = Math.max(400, window.innerHeight - 100);
    for (let y = 0; y <= total; y += step) {
      root.scrollTop = y;
      window.scrollTo(0, y);
      await sleep(120);
    }
    // 다시 위로.
    root.scrollTop = 0;
    window.scrollTo(0, 0);
    await sleep(200);
  });

  // 디버그: 페이지 안 모든 input/textarea 의 value 길이 + visibility 상태 dump.
  const allTextboxes = await page.evaluate(() => {
    const els = Array.from(
      document.querySelectorAll('input[type="text"], input:not([type]), textarea'),
    ) as (HTMLInputElement | HTMLTextAreaElement)[];
    return els.map((el, i) => {
      const r = el.getBoundingClientRect();
      const cs = window.getComputedStyle(el);
      return {
        i,
        len: (el.value ?? '').length,
        valuePreview: (el.value ?? '').slice(0, 25),
        visible:
          r.width > 0 &&
          r.height > 0 &&
          cs.visibility !== 'hidden' &&
          cs.display !== 'none',
        y: Math.round(r.y),
        x: Math.round(r.x),
        tag: el.tagName,
      };
    });
  });
  logger.info(
    `[edit_name][debug] 전체 textbox ${allTextboxes.length}개:\n` +
      allTextboxes
        .map(
          (t) =>
            `  #${t.i} ${t.tag} y=${t.y} vis=${t.visible} len=${t.len} val="${t.valuePreview}"`,
        )
        .join('\n'),
  );

  // 2) 모든 input/textarea 순회하며 매칭 후보 추출 (DOM idx 기준).
  const matchPrefix = originalName.slice(0, Math.min(20, originalName.length));
  const targetIndices = await page.evaluate(
    ({ prefix, full }: { prefix: string; full: string }) => {
      const els = Array.from(
        document.querySelectorAll('input[type="text"], input:not([type]), textarea'),
      ) as (HTMLInputElement | HTMLTextAreaElement)[];
      const out: number[] = [];
      for (let i = 0; i < els.length; i++) {
        const el = els[i];
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const cs = window.getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none') continue;
        const v = el.value ?? '';
        if (v.length === 0) continue;
        if (v === full || (v.length >= 10 && v.includes(prefix))) {
          out.push(i);
        }
      }
      return out;
    },
    { prefix: matchPrefix, full: originalName },
  );

  if (targetIndices.length === 0) {
    return {
      ok: false as const,
      error_key: 'name_input_not_found' as ErrorKey,
      message: '원본 상품명 매칭 input 0개 — 셀렉터/원본 식별 재확인',
    };
  }
  logger.info(`[edit_name] 매칭 input ${targetIndices.length}개`);

  // 3) 각 후보 교체.
  const allInputs = page.locator(
    'input[type="text"], input:not([type]), textarea',
  );
  const failures: string[] = [];
  let updateCount = 0;
  for (const idx of targetIndices) {
    const input = allInputs.nth(idx);
    try {
      await input.scrollIntoViewIfNeeded({ timeout: 2_000 }).catch(() => undefined);
      await input.waitFor({ state: 'visible', timeout: 5_000 });
      const before = await input.inputValue().catch(() => '');
      await input.click({ timeout: 5_000 });
      await input.press('Meta+A').catch(() => undefined);
      await input.press('Control+A').catch(() => undefined);
      await input.fill('');
      await input.pressSequentially(newName, { delay: 5 });
      await input.press('Tab');
      const after = await input.inputValue().catch(() => '');
      if (after !== newName) {
        failures.push(
          `input#${idx}: 교체 후 값 불일치. before="${before.slice(0, 20)}..." after="${after}"`,
        );
        continue;
      }
      updateCount += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      failures.push(`input#${idx}: ${msg}`);
    }
  }

  await page.waitForTimeout(800);
  logger.info(
    `[edit_name] visible 교체 완료 ${updateCount}/${targetIndices.length}개. fail=${failures.length}`,
  );

  // 4) 마켓별 상품명 동기화 — "상품명으로 초기화" 버튼 클릭.
  //    윈들리 UX: 기본 상품명을 변경한 후 이 버튼을 누르면 마켓별 상품명들이
  //    기본 상품명 값으로 일괄 reset 된다 (마켓별 length-limit 까지 자동 truncate).
  //    버튼이 visible 이 아닐 수도 있으므로 (특정 product 만 노출 등) 못 찾으면 skip.
  const resetBtn = page
    .getByRole('button', { name: /상품명으로\s*초기화/ })
    .first();
  const resetCount = await resetBtn.count();
  if (resetCount > 0 && (await resetBtn.isVisible().catch(() => false))) {
    await resetBtn.scrollIntoViewIfNeeded().catch(() => undefined);
    await resetBtn.click({ timeout: 5_000 }).catch(() => undefined);
    await page.waitForTimeout(800);
    // 확인 모달이 뜰 수도 있음.
    const okBtn = page
      .getByRole('button', { name: /^확인$|^적용$|^예$/ })
      .first();
    if ((await okBtn.count()) > 0 && (await okBtn.isVisible().catch(() => false))) {
      await okBtn.click({ timeout: 5_000 }).catch(() => undefined);
      await page.waitForTimeout(800);
    }
    logger.info('[edit_name] "상품명으로 초기화" 버튼 클릭 → 마켓별 상품명 동기화');
  } else {
    logger.info('[edit_name] "상품명으로 초기화" 버튼 미발견 — skip');
  }

  // 5) hidden + visible 모든 input/textarea 중 prefix 매칭하는 것을 React-compatible
  //    setter 로 한 번 더 강제 동기화 (혹시 #1 같은 hidden 것이 React 상태에 남아있을 경우).
  const forceSet = await page.evaluate(
    ({ prefix, full, newVal }: { prefix: string; full: string; newVal: string }) => {
      const els = Array.from(
        document.querySelectorAll('input[type="text"], input:not([type]), textarea'),
      ) as (HTMLInputElement | HTMLTextAreaElement)[];
      let n = 0;
      const inputProto =
        Object.getPrototypeOf(document.createElement('input')) as HTMLInputElement;
      const textareaProto = Object.getPrototypeOf(
        document.createElement('textarea'),
      ) as HTMLTextAreaElement;
      const inputSetter = Object.getOwnPropertyDescriptor(inputProto, 'value')?.set;
      const textareaSetter = Object.getOwnPropertyDescriptor(textareaProto, 'value')
        ?.set;
      for (const el of els) {
        const v = el.value ?? '';
        const matches =
          v === full || (v.length >= 10 && v.includes(prefix)) || v === newVal;
        if (!matches) continue;
        if (v === newVal) continue; // 이미 변경됨 — skip
        const setter =
          el.tagName === 'TEXTAREA' ? textareaSetter : inputSetter;
        if (setter !== undefined) {
          setter.call(el, newVal);
        } else {
          el.value = newVal;
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        n += 1;
      }
      return n;
    },
    { prefix: matchPrefix, full: originalName, newVal: newName },
  );
  if (forceSet > 0) {
    logger.info(`[edit_name] React-set 으로 추가 동기화 ${forceSet}개`);
  }
  await page.waitForTimeout(800);

  if (updateCount === 0 && forceSet === 0) {
    return {
      ok: false as const,
      error_key: 'name_input_mismatch' as ErrorKey,
      message: `상품명 교체 0건 성공. errors: ${failures.slice(0, 3).join(' | ')}`,
    };
  }
  return { ok: true as const };
};

/**
 * 업로드 트리거 — single-product.spec.ts 와 동일 패턴 (체크마크 오른쪽 icon-only button).
 */
const triggerUploadStep: StepHandler = async (page, _inputs) => {
  const CHECKMARK_PATH_SIG = 'M9 16.17L4.83 12L3.41 13.41L9 19L21 7';

  const targetIdx = await page.evaluate((sig: string) => {
    const btns = Array.from(document.querySelectorAll('button'));
    const meta = btns.map((btn, idx) => {
      const r = btn.getBoundingClientRect();
      const svg = btn.querySelector('svg');
      return {
        idx,
        text: (btn.textContent ?? '').trim(),
        x: Math.round(r.x),
        y: Math.round(r.y),
        svgHtml: svg?.outerHTML ?? '',
      };
    });
    const topIcons = meta.filter(
      (b) => b.y < 80 && b.text.length === 0 && b.svgHtml.length > 0,
    );
    const checkmark = topIcons.find((b) => b.svgHtml.includes(sig));
    if (checkmark === undefined) return -1;
    const right = topIcons
      .filter((b) => b.x > checkmark.x)
      .sort((a, b) => a.x - b.x);
    if (right.length === 0) return -1;
    return right[0].idx;
  }, CHECKMARK_PATH_SIG);

  if (targetIdx < 0) {
    return {
      ok: false as const,
      error_key: 'upload_btn_not_found' as ErrorKey,
      message: '체크마크 오른쪽 업로드 아이콘 미발견',
    };
  }

  const uploadBtn = page.locator('button').nth(targetIdx);
  await uploadBtn.waitFor({ state: 'visible', timeout: 5_000 });
  await uploadBtn.scrollIntoViewIfNeeded();
  await uploadBtn.click({ timeout: 5_000 });
  await page.waitForTimeout(1_500);
  return { ok: true as const };
};

/**
 * 모달 진행 버튼 클릭. 등록상품 재업로드 흐름:
 *   1) 업로드 아이콘 클릭 → "업로드 마켓 선택" 모달 (체크박스 + 업로드 하기 버튼)
 *   2) 업로드 하기 클릭 → "마지막 모달" (유의사항/확인 류) → 업로드 하기 한 번 더
 *   3) 업로드 시작 → 토스트/진행 모달
 *
 * 사용자 안내: "마지막 모달에서 업로드하기 버튼" → 모달 두 번 클릭 필요.
 * 매 사이클 visible 한 진행 버튼이 있는 동안 계속 클릭. 최대 4 사이클.
 */
const confirmUploadModalStep: StepHandler = async (page, _inputs) => {
  const buttonCandidates: RegExp[] = [
    /^업로드\s*하기$/,
    /^수정\s*업로드$/,
    /^재업로드$/,
    /^다시\s*업로드$/,
    /^업로드\s*진행$/,
    /^진행$/,
    /^계속$/,
    /^확인$/,
  ];

  // 첫 번째 모달은 trigger_upload 직후 노출. 잠깐 대기.
  await page.waitForTimeout(1_000);

  let totalClicks = 0;
  for (let cycle = 0; cycle < 4; cycle++) {
    let clickedInCycle = false;
    for (const re of buttonCandidates) {
      const btn = page.getByRole('button', { name: re }).first();
      if ((await btn.count()) === 0) continue;
      if (!(await btn.isVisible().catch(() => false))) continue;
      logger.info(
        `[confirm_upload_modal cycle ${cycle + 1}] 버튼 매칭 + 클릭: ${re}`,
      );
      await btn.click({ timeout: 8_000 }).catch(() => undefined);
      clickedInCycle = true;
      totalClicks += 1;
      break;
    }

    if (!clickedInCycle) {
      logger.info(
        `[confirm_upload_modal cycle ${cycle + 1}] 진행 버튼 없음 → 모든 모달 처리 완료`,
      );
      break;
    }

    // 클릭 후 다음 모달 mount / 진행 시작까지 잠깐 대기.
    await page.waitForTimeout(1_500);
  }

  if (totalClicks === 0) {
    return {
      ok: false as const,
      error_key: 'upload_confirm_btn_not_found' as ErrorKey,
      message: '진행 버튼 후보 0회 클릭 — 모달이 안 떴거나 버튼명이 다름',
    };
  }
  logger.info(`[confirm_upload_modal] 총 ${totalClicks}회 클릭`);
  return { ok: true as const };
};

/**
 * 업로드 완료 대기.
 *
 * 등록상품 재업로드는 신규 업로드와 다르게 두 가지 완료 시그널 중 하나가 나타날 수 있다:
 *   (A) 진행 모달 — 마켓별 행에 "성공" / "실패" 텍스트가 안정화 (single-product 패턴)
 *   (B) 토스트 / 스낵바 — 우하단에 "업로드 실패 상품 확인 필요" / "업로드 완료" 등 표시
 *       (진행 모달 없이 백그라운드에서 끝나는 경우)
 *
 * 둘 중 하나라도 잡히면 성공/실패 판정. 두 시그널 모두 0 이고 시간이 충분히 흘렀으면
 * 'upload_timeout' 으로 fail.
 */
const waitUploadCompleteStep: StepHandler = async (page, _inputs) => {
  // 감지 로직은 lib/upload-actions.ts::waitUploadComplete 단일 소스 (진행 모달 성공/실패 행 +
  // 우하단 토스트 둘 다). 예전엔 여기·single-product·registered _handlers 에 인라인 복사본이
  // 흩어져 있었다.
  const r = await waitUploadComplete(page, { timeoutMs: 180_000 });
  logger.info(
    `[wait_upload_complete] ok=${r.ok} success=${r.result.success} fail=${r.result.fail}`,
  );
  await closeUploadResultModal(page);
  if (r.ok) return { ok: true as const };
  return {
    ok: false as const,
    error_key: r.error_key as ErrorKey,
    message: r.message,
  };
};

const handlers: StepHandlers = {
  open_registered_list: openRegisteredListStep,
  search_product: searchProductStep,
  open_detail: openDetailStep,
  edit_name: editNameStep,
  trigger_upload: triggerUploadStep,
  confirm_upload_modal: confirmUploadModalStep,
  wait_upload_complete: waitUploadCompleteStep,
};

// ─────────────────────────────────────────────────────────────────────────────
// Test
// ─────────────────────────────────────────────────────────────────────────────

test('등록상품 상품명 수정 후 재업로드', async ({ page }) => {
  test.setTimeout(15 * 60_000);

  const atc = loadATC(ATC_PATH);
  // example 은 GUI placeholder 전용 — 빈 값이면 핸들러의 missing_input 분기로 명시 fail.
  // (GUI 큐의 from: previous 자동 주입은 ATC_INPUT_* env 로 도착하므로 여전히 동작.)
  const inputs: Record<string, unknown> = {
    source_product_id: process.env['ATC_INPUT_SOURCE_PRODUCT_ID'] ?? '',
    new_name: process.env['ATC_INPUT_NEW_NAME'] ?? '',
  };

  const result = await runATC({ atc, page, inputs, handlers });

  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });

  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
