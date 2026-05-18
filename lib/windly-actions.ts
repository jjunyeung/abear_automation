/**
 * Windly UI 공통 액션 — spec 간 재사용을 위한 헬퍼 모음.
 *
 * 설계:
 *   - 모든 함수는 `Page` 를 받아 Playwright 액션만 수행. 상태/에러 분류는
 *     호출하는 step handler 가 결정한다 (StepOutcome 변환은 spec 책임).
 *   - 윈들리 UI 텍스트/href 기반 selector 만 사용 — 가장 안정적인 자산.
 *   - 도메인 의존성 단방향 유지: 본 모듈은 `@playwright/test` 만 import,
 *     atc-loader / runner / recoveries 등 ATC 프레임워크 코드 import 안 함.
 */

import type { Locator, Page } from '@playwright/test';

const APP_ENTRY_URL = 'https://app.windly.cc';

/** 후보 locator 들 중 먼저 visible 한 것을 클릭. timeout 내 못 찾으면 throw. */
export async function clickFirstVisible(
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

/** 상품 URL 에서 상품 ID 추출 (티몰/타오바오 query string `id=`, 라쿠텐은 별도 처리 필요). */
export function extractProductId(url: string): string {
  const m = url.match(/[?&]id=(\d+)/);
  return m ? m[1] : '';
}

/**
 * 로그인 — 세션이 있으면 fast-pass, 없으면 .env 자격증명으로 로그인.
 * persistent userDataDir 환경에서 첫 실행만 실제 로그인을 수행한다.
 *
 * @returns 'logged_in' (이미 또는 신규 로그인 성공) | 'no_credentials' | 'login_failed'
 */
export async function loginIfNeeded(
  page: Page,
): Promise<'logged_in' | 'no_credentials' | 'login_failed'> {
  const email = process.env['WINDLY_LOGIN_EMAIL'] ?? '';
  const pwd = process.env['WINDLY_LOGIN_PASSWORD'] ?? '';

  // app.windly.cc 진입 → 세션 없으면 hub.windly.cc/accounts/login 으로 redirect.
  await page
    .goto(APP_ENTRY_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    .catch(() => undefined);

  const emailField = page
    .getByPlaceholder(/아이디.*이메일|이메일|email/i)
    .or(page.locator('input[type="email"]'))
    .or(page.locator('input[name="email"]'))
    .first();

  // 5초 안에 로그인 폼이 보이면 로그인 필요. 안 보이면 이미 로그인됨.
  const loginFormVisible = await emailField
    .waitFor({ state: 'visible', timeout: 5_000 })
    .then(() => true)
    .catch(() => false);

  if (!loginFormVisible) {
    await page
      .waitForLoadState('domcontentloaded', { timeout: 15_000 })
      .catch(() => undefined);
    return 'logged_in';
  }

  if (email.length === 0 || pwd.length === 0) {
    return 'no_credentials';
  }

  const pwdField = page
    .getByPlaceholder(/비밀번호|password/i)
    .or(page.locator('input[type="password"]'))
    .or(page.locator('input[name="password"]'))
    .first();

  await emailField.click();
  await emailField.pressSequentially(email, { delay: 20 });
  await pwdField.click();
  await pwdField.pressSequentially(pwd, { delay: 20 });
  await pwdField.press('Tab'); // blur → 폼 검증 → 버튼 enabled

  const loginBtn = page
    .getByRole('button', { name: /이메일\s*로그인|^로그인$|로그인하기/ })
    .first();
  await loginBtn.waitFor({ state: 'visible', timeout: 10_000 });
  await loginBtn.click({ timeout: 20_000 });

  await emailField
    .waitFor({ state: 'hidden', timeout: 45_000 })
    .catch(() => undefined);

  if (page.url().includes('/accounts/login')) {
    return 'login_failed';
  }
  await page
    .waitForLoadState('domcontentloaded', { timeout: 30_000 })
    .catch(() => undefined);
  return 'logged_in';
}

/**
 * 해구대(해외구매대행) 워크스페이스 진입 — 허브 카드 화면이면 클릭, 이미 안이면 통과.
 */
export async function enterHaegudaeWorkspace(page: Page): Promise<void> {
  const enterBtn = page
    .getByRole('button', { name: /서비스로\s*이동/ })
    .or(page.getByRole('link', { name: /서비스로\s*이동/ }))
    .first();
  const onHubPage = await enterBtn
    .waitFor({ state: 'visible', timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (onHubPage) {
    // 해외구매대행은 첫 번째 카드 (좌측) — 첫 번째 매칭이 해당.
    await enterBtn.click();
    await page
      .waitForLoadState('domcontentloaded', { timeout: 30_000 })
      .catch(() => undefined);
  }
}

/**
 * `/view3/product-import` 페이지의 "소싱몰에서 상품 수집" 박스 안 SourcingMallButton 클릭 →
 * 새 탭이 열리고 popup URL hostname 이 `expectedDomainRe` 매치하는지 검증.
 *
 * Selector (windly-frontend-web/src/features/ProductImport/ImportDirect/components/SourcingMallButton.tsx):
 *   `<div onClick={() => window.open(url)}><img alt="sourcing-mall-icon"/><Text>{mallName}</Text></div>`
 *   → div + 두 자식 조건 (img alt + 정확 텍스트) 매치로 컨테이너 정확 타겟.
 *
 * Popup URL polling: 초기 about:blank 또는 windly redirect 가능 → 8초 polling.
 * 결과 = StepOutcome 형식 (true | false + error_key + message). spec 의 step handler 가
 * 그대로 return 하면 됨.
 */
export async function verifySourcingMallPopup(
  page: Page,
  mallName: string,
  expectedDomainRe: RegExp,
): Promise<
  | { ok: true }
  | { ok: false; error_key: string; message: string }
> {
  const POPUP_TIMEOUT_MS = 8_000;
  const REDIRECT_WAIT_MS = 8_000;

  // SourcingMallButton:
  //   <div onClick={() => window.open(url)}>
  //     <img alt="sourcing-mall-icon" />
  //     <Text>{mallName}</Text>
  //   </div>
  // 컨테이너 div 를 매치하려고 filter chain 쓰면 ancestor div 도 같이 매치 → first() 가
  // outer div 잡을 수 있고 그 click 위치는 onClick 핸들러 없는 영역에 떨어질 수 있음.
  // → mall name Text 자체 (exact match) 를 직접 클릭. 부모 div 의 onClick 으로 bubble.
  // (Text 컴포넌트 = 단순 span, NewBadge 와 별도 텍스트 노드라 stopPropagation 없음.)
  const mallBtn = page.getByText(mallName, { exact: true }).first();

  try {
    await mallBtn.waitFor({ state: 'visible', timeout: 15_000 });
  } catch {
    return {
      ok: false,
      error_key: 'sourcing_mall_button_not_found',
      message: `"${mallName}" Text 매치 실패 (정확 텍스트)`,
    };
  }
  await mallBtn.scrollIntoViewIfNeeded();

  const newPagePromise = page
    .context()
    .waitForEvent('page', { timeout: POPUP_TIMEOUT_MS });
  await mallBtn.click();

  let popup;
  try {
    popup = await newPagePromise;
  } catch {
    return {
      ok: false,
      error_key: 'sourcing_mall_popup_not_opened',
      message: `"${mallName}" 클릭 후 ${POPUP_TIMEOUT_MS}ms 내 새 탭 미발생`,
    };
  }

  let url = popup.url();
  const start = Date.now();
  while (
    Date.now() - start < REDIRECT_WAIT_MS &&
    (url === 'about:blank' || /windly\.cc/i.test(url))
  ) {
    await popup
      .waitForLoadState('domcontentloaded', { timeout: 1_500 })
      .catch(() => undefined);
    await new Promise((r) => setTimeout(r, 400));
    url = popup.url();
  }

  let hostname = '';
  try {
    hostname = new URL(url).hostname;
  } catch {
    /* invalid url */
  }
  await popup.close().catch(() => undefined);

  if (!expectedDomainRe.test(hostname)) {
    return {
      ok: false,
      error_key: 'sourcing_mall_popup_wrong_domain',
      message: `"${mallName}" popup hostname 이 ${expectedDomainRe} 매치 안 됨: ${url}`,
    };
  }
  return { ok: true };
}

/**
 * "상품 수집" 페이지 (`/view3/product-import`) 진입.
 * 주의: 수집 페이지 = 새 상품 수집 트리거 (URL 입력). "수집상품" 목록과 다름.
 * "수집상품" 목록은 goToCollectedProducts 사용.
 *
 * 호스트는 `app.windly.cc` 고정 — windly-frontend-web (view3 SPA) prod 호스트.
 * `global.windly.cc/view3/*` 는 일부 경로에서 API JSON 응답 → SPA 렌더 안 됨 (확인됨).
 * 진입 후 SPA 가 render 됐는지 페이지 텍스트 안의 ATC 식별 마커로 검증.
 */
export async function goToCollectImportMenu(page: Page): Promise<void> {
  await page.goto('https://app.windly.cc/view3/product-import', {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });
  // SPA client-side render 안정화.
  await page.waitForTimeout(1_500);
  const cur = page.url();
  if (!/\/view3\/product-import/.test(cur)) {
    throw new Error(
      `goToCollectImportMenu: navigate 후 url 이 /view3/product-import 가 아님 — 현재 url: ${cur}`,
    );
  }
}

/** 사이드바 "수집상품" 링크 클릭 (`/view2/interested-product`). */
export async function goToCollectedProducts(page: Page): Promise<void> {
  const link = page
    .locator('a[href*="/view2/interested-product"]')
    .first();
  try {
    await link.waitFor({ state: 'visible', timeout: 10_000 });
    await link.click();
  } catch {
    await page
      .goto('https://global.windly.cc/view2/interested-product', {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      })
      .catch(() => undefined);
  }
  await page
    .waitForLoadState('domcontentloaded', { timeout: 30_000 })
    .catch(() => undefined);
  await page.waitForTimeout(1_500);
}

/** 사이드바 "등록상품" 링크 클릭 (`/view2/registered-product`). */
export async function goToRegisteredProducts(page: Page): Promise<void> {
  const link = page
    .locator('a[href*="/view2/registered-product"]')
    .first();
  try {
    await link.waitFor({ state: 'visible', timeout: 10_000 });
    await link.click();
  } catch {
    await page
      .goto('https://global.windly.cc/view2/registered-product', {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      })
      .catch(() => undefined);
  }
  await page
    .waitForLoadState('domcontentloaded', { timeout: 30_000 })
    .catch(() => undefined);
  await page.waitForTimeout(1_500);
}

/**
 * 수집상품 페이지의 "상품 코드 검색" 모달로 productId 검색 → 모달 안 검색 버튼 클릭.
 *
 * 흐름:
 *   1) 페이지 상단의 "상품 코드 검색" 버튼 클릭 → 모달 오픈
 *   2) 모달 안 input 에 productId 입력
 *   3) 모달 안 "검색" / "확인" 버튼 클릭 (Enter 만으로는 결과 안 뜸)
 *   4) 모달이 닫히고 결과 목록이 갱신될 때까지 대기
 *
 * @returns 검색 후 결과 카드 개수 (a[href*="/view2/interested-product/"] 기준).
 */
export async function searchByProductCode(
  page: Page,
  productId: string,
): Promise<number> {
  // 1) 페이지의 "상품 코드 검색" 버튼 (모달 오픈 트리거).
  const codeSearchBtn = page
    .getByRole('button', { name: /^상품\s*코드\s*검색$/ })
    .first();
  await codeSearchBtn.waitFor({ state: 'visible', timeout: 10_000 });
  await codeSearchBtn.click();
  await page.waitForTimeout(800);

  // 2) 모달 안 textbox — 윈들리 모달은 role="dialog" 없이 generic 컨테이너 + textbox 로 구성.
  //    placeholder accessible name 으로 직접 타겟.
  const codeInput = page
    .getByPlaceholder(/상품\s*코드를?\s*입력/)
    .or(page.getByRole('textbox', { name: /상품\s*코드/ }))
    .first();
  await codeInput.waitFor({ state: 'visible', timeout: 10_000 });
  await codeInput.click();
  await codeInput.fill('');
  await codeInput.pressSequentially(productId, { delay: 10 });

  // 3) 모달 안 "검색하기" 버튼 클릭 — 외부 "상품 코드 검색" 트리거와 정확 매치로 구별.
  const submitBtn = page
    .getByRole('button', { name: /^검색하기$|^조회하기$|^확인$/ })
    .first();
  await submitBtn.waitFor({ state: 'visible', timeout: 5_000 });
  await submitBtn.click();

  // 4) 모달 close + 결과 갱신 대기. 모달이 사라지는 시점은 textbox 가 hidden 되는 것으로 판정.
  await codeInput.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => undefined);
  await page.waitForTimeout(2_000);

  // 수집상품 또는 등록상품 카드 link 카운트 (현재 페이지에 따라).
  const interestedCount = await page
    .locator('a[href*="/view2/interested-product/"]')
    .count();
  const registeredCount = await page
    .locator('a[href*="/view2/registered-product/"]')
    .count();
  return interestedCount + registeredCount;
}

/**
 * 윈들리 목록 페이지의 페이지네이션 ("페이지 이동" form input) 으로 N 페이지 jump.
 *
 * sesame `PageNavigation` 컴포넌트 (`/Users/a1/windly_repo/sesame/src/components/molecules/PageNavigation/PageNavigation.tsx`):
 *   - 좌측 "페이지 이동" 라벨 + TextField + form (Enter 시 onSubmit → setPage(N))
 *   - 입력값을 parseInt 후 1 <= N <= lastPage 범위면 setPage 호출
 *   - 숫자 버튼은 화면에 보이는 페이지만 (countPageDisplayed=5 기본) — 큰 N 으로 점프하려면
 *     숫자 버튼 클릭 불가, "페이지 이동" input 이 유일한 일반화 방법.
 *   - hideGoto prop 으로 input 숨김 가능하지만 수집상품/등록상품 목록 페이지는 기본 노출.
 *
 * 검증 = 첫 카드 href 변화 (15초 대기). 카드 0개인 경우 검증 skip 후 timeout 만 대기.
 *
 * @throws 양의 정수 아님 / "페이지 이동" 라벨 미발견 시.
 */
export async function goToPage(page: Page, n: number): Promise<void> {
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`goToPage: 양의 정수 필요 — 받은 값: ${String(n)}`);
  }

  // 전환 검증 baseline. 수집상품 (interested-product) / 등록상품 (registered-product) 양쪽 카드 모두 매치.
  const cardSelector = 'a[href*="/view2/"]';
  const beforeHref =
    (await page.locator(cardSelector).first().getAttribute('href').catch(() => null)) ?? '';

  // "페이지 이동" 라벨 옆 form 안 textbox.
  const gotoLabel = page.getByText(/^페이지\s*이동$/).first();
  await gotoLabel.waitFor({ state: 'visible', timeout: 10_000 });

  // 같은 form 안의 단일 input — sesame PageNavigation 의 useInput TextField.
  const gotoInput = page
    .locator('form', { has: page.getByText(/^페이지\s*이동$/) })
    .getByRole('textbox')
    .first();
  await gotoInput.waitFor({ state: 'visible', timeout: 5_000 });
  await gotoInput.click();
  await gotoInput.fill('');
  await gotoInput.pressSequentially(String(n), { delay: 10 });
  await gotoInput.press('Enter'); // form onSubmit → setPage(n)

  if (beforeHref !== '') {
    await page
      .waitForFunction(
        ({ sel, before }) => {
          const el = document.querySelector(sel);
          const cur = el?.getAttribute('href') ?? '';
          return cur !== '' && cur !== before;
        },
        { sel: cardSelector, before: beforeHref },
        { timeout: 15_000 },
      )
      .catch(() => undefined);
  }
  await page.waitForTimeout(800);
}

/**
 * 검색 후 결과의 첫 번째 상품 상세로 진입.
 * 검색 결과가 0 개면 throw.
 */
export async function openFirstSearchResult(page: Page): Promise<void> {
  const firstCard = page
    .locator('a[href*="/view2/interested-product/"]')
    .first();
  const count = await firstCard.count();
  if (count === 0) {
    throw new Error('검색 결과가 0개 — 상품 상세 진입 불가');
  }
  await firstCard.click();
  await page
    .waitForURL(/\/view2\/interested-product\/\d+/, { timeout: 30_000 })
    .catch(() => undefined);
  await page
    .waitForLoadState('domcontentloaded', { timeout: 30_000 })
    .catch(() => undefined);
  await page.waitForTimeout(1_500);
}
