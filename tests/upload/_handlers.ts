/**
 * upload 도메인 spec 들의 공유 step handlers + 헬퍼.
 *
 * 추출 출처: tests/upload/edit-name-reupload.spec.ts.
 * 사용처:
 *   - tests/upload/edit-name-reupload.spec.ts (source_product_id 기반)
 *   - tests/upload/edit-top-name-reupload.spec.ts (top-card 기반, 자동 timestamp 이름)
 */

import type { Page } from '@playwright/test';
import type { StepHandler } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';

// ─────────────────────────────────────────────────────────────────────────────
// 상품명 수정 (기본 + 마켓별 일괄)
// ─────────────────────────────────────────────────────────────────────────────

export const editNameStep: StepHandler = async (page, inputs) => {
  const newName =
    typeof inputs['new_name'] === 'string' ? (inputs['new_name'] as string) : '';
  if (newName.length === 0) {
    return {
      ok: false as const,
      error_key: 'missing_input' as ErrorKey,
      message: 'inputs.new_name 누락',
    };
  }

  // 1) 원본 상품명 식별: 페이지 안 모든 textbox 중 가장 긴 value.
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

  // 페이지 끝까지 스크롤 → 마켓별 collapsed section 안 input 까지 mount.
  await page.evaluate(async () => {
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const root =
      document.scrollingElement ?? document.documentElement ?? document.body;
    const total = root.scrollHeight;
    const step = Math.max(400, window.innerHeight - 100);
    for (let y = 0; y <= total; y += step) {
      root.scrollTop = y;
      window.scrollTo(0, y);
      await sleep(120);
    }
    root.scrollTop = 0;
    window.scrollTo(0, 0);
    await sleep(200);
  });

  // 2) 매칭 input 인덱스 추출 (정확 동일 또는 prefix 20자 포함).
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
      message: '원본 상품명 매칭 input 0개',
    };
  }
  logger.info(`[edit_name] 매칭 input ${targetIndices.length}개`);

  // 3) 각 후보 교체. Tab + 명시적 blur() 로 onBlur handler 트리거 보장.
  //    주의: "원본 상품명으로 초기화" 버튼 (sesame TitleButtonGroup.tsx) 은 이름 그대로
  //    원본 (소스몰 중국어 등) 으로 RESET 하므로 절대 클릭하지 않는다.
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
      // change/blur 명시 발사 — Tab 만으로 React onBlur 가 안 발사되는 케이스 대비.
      await input.evaluate((el) => {
        const t = el as HTMLInputElement | HTMLTextAreaElement;
        t.dispatchEvent(new Event('change', { bubbles: true }));
        t.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
        if (typeof t.blur === 'function') t.blur();
      });
      await input.press('Tab').catch(() => undefined);
      await page.waitForTimeout(150);

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

  // 4) React-compatible setter 로 강제 동기화 + blur 명시 발사.
  //    혹시 #1 같은 hidden 또는 step 3 에서 누락된 input 까지 일관성 맞춤.
  const forceSet = await page.evaluate(
    ({ prefix, full, newVal }: { prefix: string; full: string; newVal: string }) => {
      const els = Array.from(
        document.querySelectorAll('input[type="text"], input:not([type]), textarea'),
      ) as (HTMLInputElement | HTMLTextAreaElement)[];
      let n = 0;
      const inputProto = Object.getPrototypeOf(
        document.createElement('input'),
      ) as HTMLInputElement;
      const textareaProto = Object.getPrototypeOf(
        document.createElement('textarea'),
      ) as HTMLTextAreaElement;
      const inputSetter = Object.getOwnPropertyDescriptor(inputProto, 'value')?.set;
      const textareaSetter = Object.getOwnPropertyDescriptor(textareaProto, 'value')?.set;
      for (const el of els) {
        const v = el.value ?? '';
        const matches =
          v === full || (v.length >= 10 && v.includes(prefix)) || v === newVal;
        if (!matches) continue;
        if (v === newVal) {
          // 이미 새 값인 경우에도 onBlur 한번 더 발사하여 React 상태/저장 트리거.
          el.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
          if (typeof el.blur === 'function') el.blur();
          continue;
        }
        const setter =
          el.tagName === 'TEXTAREA' ? textareaSetter : inputSetter;
        if (setter !== undefined) {
          setter.call(el, newVal);
        } else {
          el.value = newVal;
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
        if (typeof el.blur === 'function') el.blur();
        n += 1;
      }
      return n;
    },
    { prefix: matchPrefix, full: originalName, newVal: newName },
  );
  if (forceSet > 0) {
    logger.info(`[edit_name] React-set 추가 동기화 ${forceSet}개 (+ blur 발사)`);
  }
  await page.waitForTimeout(800);

  // 5) 최종 검증 — 원본 매칭 input 들이 모두 newName 으로 바뀌었는지 (혹은 빈 값/잘림).
  const stillOriginal = await page.evaluate(
    ({ full }: { full: string }) => {
      const els = Array.from(
        document.querySelectorAll('input[type="text"], input:not([type]), textarea'),
      ) as (HTMLInputElement | HTMLTextAreaElement)[];
      let cnt = 0;
      for (const el of els) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if ((el.value ?? '') === full) cnt += 1;
      }
      return cnt;
    },
    { full: originalName },
  );
  if (stillOriginal > 0) {
    logger.warn(
      `[edit_name] 경고: 여전히 원본 값 그대로인 input ${stillOriginal}개 — "원본 상품명으로 초기화" 같은 버튼이 우연히 트리거됐는지 확인 필요`,
    );
  }

  if (updateCount === 0 && forceSet === 0) {
    return {
      ok: false as const,
      error_key: 'name_input_mismatch' as ErrorKey,
      message: `상품명 교체 0건 성공. errors: ${failures.slice(0, 3).join(' | ')}`,
    };
  }
  return { ok: true as const };
};

// ─────────────────────────────────────────────────────────────────────────────
// 업로드 트리거 (체크마크 svg 오른쪽 icon-only button)
// ─────────────────────────────────────────────────────────────────────────────

export const triggerUploadStep: StepHandler = async (page, _inputs) => {
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

// ─────────────────────────────────────────────────────────────────────────────
// 모달 진행 — 사이클별 진행 버튼 클릭 (등록상품 재업로드는 모달 2단)
// ─────────────────────────────────────────────────────────────────────────────

export const confirmUploadModalStep: StepHandler = async (page, _inputs) => {
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
        `[confirm_upload_modal cycle ${cycle + 1}] 진행 버튼 없음 → 모달 종료`,
      );
      break;
    }
    await page.waitForTimeout(1_500);
  }
  if (totalClicks === 0) {
    return {
      ok: false as const,
      error_key: 'upload_confirm_btn_not_found' as ErrorKey,
      message: '진행 버튼 후보 0회 클릭',
    };
  }
  logger.info(`[confirm_upload_modal] 총 ${totalClicks}회 클릭`);
  return { ok: true as const };
};

// ─────────────────────────────────────────────────────────────────────────────
// 업로드 완료 대기 (진행 모달 안정화 OR 토스트)
// ─────────────────────────────────────────────────────────────────────────────

export const waitUploadCompleteStep: StepHandler = async (page, _inputs) => {
  type Snapshot = {
    success: number;
    fail: number;
    spinning: number;
    toastSuccess: boolean;
    toastFail: boolean;
    toastText: string;
  };

  const measure = async (): Promise<Snapshot> => {
    return page.evaluate(() => {
      let success = 0;
      let fail = 0;
      let spinning = 0;
      const all = Array.from(document.querySelectorAll('*'));
      for (const el of all) {
        if (el.children.length > 0) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const cs = window.getComputedStyle(el as HTMLElement);
        if (cs.visibility === 'hidden' || cs.display === 'none') continue;
        const txt = (el.textContent ?? '').trim();
        if (txt === '성공') success += 1;
        else if (txt === '실패') fail += 1;
      }
      for (const el of all) {
        const cs = window.getComputedStyle(el as HTMLElement);
        const anim = cs.animationName ?? '';
        if (!/spin|rotate|loading/i.test(anim)) continue;
        const r = el.getBoundingClientRect();
        if (r.width >= 6 && r.width <= 64) spinning += 1;
      }
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let toastText = '';
      let toastSuccess = false;
      let toastFail = false;
      for (const el of all) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.x < vw * 0.5) continue;
        if (r.y < vh * 0.7) continue;
        const cs = window.getComputedStyle(el as HTMLElement);
        if (cs.visibility === 'hidden' || cs.display === 'none') continue;
        const txt = (el.textContent ?? '').trim();
        if (txt.length === 0 || txt.length > 80) continue;
        if (/업로드\s*(완료|성공)/.test(txt)) {
          toastSuccess = true;
          toastText = txt;
        } else if (/업로드\s*(실패|에러)|업로드.*확인\s*필요/.test(txt)) {
          toastFail = true;
          toastText = txt;
        }
      }
      return { success, fail, spinning, toastSuccess, toastFail, toastText };
    });
  };

  await page.waitForTimeout(3_000);
  const start = Date.now();
  let stableTicks = 0;
  let lastTotal = -1;
  let last: Snapshot = {
    success: 0,
    fail: 0,
    spinning: 0,
    toastSuccess: false,
    toastFail: false,
    toastText: '',
  };
  while (Date.now() - start < 180_000) {
    const cur = await measure();
    last = cur;
    const total = cur.success + cur.fail;
    if (total === lastTotal && total > 0 && cur.spinning === 0) {
      stableTicks += 1;
    } else {
      stableTicks = 0;
    }
    lastTotal = total;
    if (stableTicks >= 3) break;
    if (cur.toastSuccess || cur.toastFail) break;
    await page.waitForTimeout(2_000);
  }
  logger.info(
    `[wait_upload_complete] success=${last.success} fail=${last.fail} ` +
      `toast="${last.toastText}" toastSuccess=${last.toastSuccess} toastFail=${last.toastFail}`,
  );

  const closeBtn = page
    .getByRole('button', {
      name: /수집상품\s*메뉴로\s*가기|등록상품\s*메뉴로\s*가기|^확인$|^닫기$/,
    })
    .first();
  if (
    (await closeBtn.count()) > 0 &&
    (await closeBtn.isVisible().catch(() => false))
  ) {
    await closeBtn.click({ timeout: 5_000 }).catch(() => undefined);
  }

  if (last.success > 0) return { ok: true as const };
  if (last.fail > 0 && last.success === 0) {
    return {
      ok: false as const,
      error_key: 'upload_failed' as ErrorKey,
      message: `모든 마켓 실패 (성공 0 / 실패 ${last.fail})`,
    };
  }
  if (last.toastSuccess) return { ok: true as const };
  if (last.toastFail) {
    return {
      ok: false as const,
      error_key: 'upload_failed' as ErrorKey,
      message: `토스트(실패): ${last.toastText}`,
    };
  }
  return {
    ok: false as const,
    error_key: 'upload_timeout' as ErrorKey,
    message: '180초 안에 진행 모달/토스트 모두 미검출',
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// 등록상품 리스트의 첫 카드 → detail 진입.
// (search 없이 가장 위 상품 사용. registered card href = /view2/registered-product/<id>)
// ─────────────────────────────────────────────────────────────────────────────

export const openTopRegisteredProductStep: StepHandler = async (page, _inputs) => {
  const card = page.locator('a[href*="/view2/registered-product/"]').first();
  try {
    await card.waitFor({ state: 'visible', timeout: 30_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'no_registered_products' as ErrorKey,
      message: '등록상품 카드 0개',
    };
  }
  await card.scrollIntoViewIfNeeded();
  await card.click();
  try {
    await page.waitForURL(/\/view2\/registered-product\/\d+/, { timeout: 30_000 });
  } catch {
    return {
      ok: false as const,
      error_key: 'detail_open_failed' as ErrorKey,
      message: `detail URL 도달 실패. 현재=${page.url()}`,
    };
  }
  await page
    .waitForLoadState('domcontentloaded', { timeout: 30_000 })
    .catch(() => undefined);
  await page.waitForTimeout(1_500);
  return { ok: true as const };
};

// ─────────────────────────────────────────────────────────────────────────────
// 미니멀 상품명 수정 — 등록상품 flow 전용. 기본 상품명 (스마트스토어 main) 1개만 수정.
//
// 차이점 (editNameStep 대비):
//   - 페이지 끝까지 스크롤 안 함 (마켓별 collapsed 영역 건드리지 않음)
//   - "원본 상품명" / 마켓별 input 모두 매칭 안 함 — 오직 첫 번째 매칭 input 만 수정
//   - React-set 으로 다른 input 들에 강제 dispatch 안 함
//   - "원본 상품명으로 초기화" / "카테고리 복사" 등 인접 버튼 절대 안 건드림
//
// 등록상품 flow 의 의도: 단순 rename 후 재업로드 트리거 검증. 마켓별 동기화는 windly 가
// 알아서 하거나 (auto-propagate) 또는 그대로 둬도 OK (기존 마켓 이름이 이미 짧음).
// ─────────────────────────────────────────────────────────────────────────────

export const editMainProductNameOnlyStep: StepHandler = async (page, inputs) => {
  const newName =
    typeof inputs['new_name'] === 'string' ? (inputs['new_name'] as string) : '';
  if (newName.length === 0) {
    return {
      ok: false as const,
      error_key: 'missing_input' as ErrorKey,
      message: 'inputs.new_name 누락',
    };
  }

  // 1) 페이지 안에서 가장 긴 (≥10자) visible textbox = 메인 상품명 후보.
  const target = await page.evaluate(() => {
    const els = Array.from(
      document.querySelectorAll('input[type="text"], input:not([type]), textarea'),
    ) as (HTMLInputElement | HTMLTextAreaElement)[];
    let bestIdx = -1;
    let bestLen = 9;
    for (let i = 0; i < els.length; i++) {
      const el = els[i];
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const cs = window.getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      // 첫 화면 (스크롤 없이 보이는) 영역 우선 — 메인 상품명은 detail 진입 직후 상단.
      if (r.y > 600) continue;
      const v = el.value ?? '';
      if (v.length > bestLen) {
        bestLen = v.length;
        bestIdx = i;
      }
    }
    if (bestIdx < 0) return { idx: -1, value: '' };
    return {
      idx: bestIdx,
      value: (els[bestIdx].value ?? ''),
    };
  });

  if (target.idx < 0) {
    return {
      ok: false as const,
      error_key: 'name_input_not_found' as ErrorKey,
      message: '상단 영역의 메인 상품명 input 미발견 (visible textbox 길이 ≥10 + y<600 조건)',
    };
  }
  logger.info(
    `[edit_main_name_only] 메인 상품명 input idx=${target.idx} 길이=${target.value.length} 미리보기="${target.value.slice(0, 30)}..."`,
  );

  // 2) 단일 input 만 교체.
  const allInputs = page.locator(
    'input[type="text"], input:not([type]), textarea',
  );
  const input = allInputs.nth(target.idx);
  await input.scrollIntoViewIfNeeded({ timeout: 2_000 }).catch(() => undefined);
  await input.waitFor({ state: 'visible', timeout: 5_000 });
  await input.click({ timeout: 5_000 });
  await input.press('Meta+A').catch(() => undefined);
  await input.press('Control+A').catch(() => undefined);
  await input.fill('');
  await input.pressSequentially(newName, { delay: 5 });

  // 3) onBlur 트리거 — Tab 으로 인접 element 에 focus 옮기지 않고, 명시적으로 blur 만 발사.
  //    (Tab 은 인접 버튼 (e.g. "카테고리 복사") 에 focus 가 가서 시각적으로 active 처럼 보일 수 있음.)
  await input.evaluate((el) => {
    const t = el as HTMLInputElement | HTMLTextAreaElement;
    t.dispatchEvent(new Event('input', { bubbles: true }));
    t.dispatchEvent(new Event('change', { bubbles: true }));
    t.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    if (typeof t.blur === 'function') t.blur();
  });
  await page.waitForTimeout(500);

  const after = await input.inputValue().catch(() => '');
  if (after !== newName) {
    return {
      ok: false as const,
      error_key: 'name_input_mismatch' as ErrorKey,
      message: `메인 상품명 교체 후 값 불일치. expected="${newName}" actual="${after.slice(0, 50)}..."`,
    };
  }

  logger.info(`[edit_main_name_only] 교체 완료 — newName="${newName}"`);
  return { ok: true as const };
};

// ─────────────────────────────────────────────────────────────────────────────
// 타임스탬프 기반 새 이름 생성 — "상품명 수정 (YYYY-MM-DD HH:MM:SS)"
// ─────────────────────────────────────────────────────────────────────────────

export function buildTimestampedNewName(prefix = '상품명 수정'): string {
  const now = new Date();
  const pad = (n: number): string => String(n).padStart(2, '0');
  const stamp =
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  return `${prefix} (${stamp})`;
}

// re-export Page (외부에서 추가 헬퍼 작성 시).
export type { Page };
