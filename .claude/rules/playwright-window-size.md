# Playwright 윈도우 사이즈 = 1800 × 1280 (강제)

이 프로젝트의 모든 ATC 실행은 **무조건** Chrome 윈도우 + viewport 1800 × 1280 으로 실행된다 (사용자 명시 강제). 다른 사이즈로 실행되는 코드는 추가하지 않는다.

## 금지

- `page.setViewportSize({ ... })` 호출 — spec.ts 어디서든 절대 금지. fixture 가 강제하는 1800×1280 을 override 한다.
- `chromium.launch(...)` / `chromium.launchPersistentContext(...)` 의 `viewport` 옵션 변경 — `lib/test-fixture.ts` 의 `ATC_WINDOW_WIDTH` / `ATC_WINDOW_HEIGHT` 상수 외 다른 값 사용 금지.
- Chrome args 의 `--window-size=...` 를 다른 값으로 추가/override 금지.
- 새 fixture 를 만들어 viewport 를 우회하는 행위 금지.
- "spec 별로 큰 viewport 가 필요하다" 는 이유로 setViewportSize 추가 금지 — 사이즈가 진짜 부족하면 fixture 의 상수 자체를 합의해서 변경한다.

## 대신

- ATC 작성 시 viewport 가정 금지 — 1800 × 1280 만 가정.
- 좌표 기반 클릭/검색이 필요하면 `r.y < N` / `r.x > M` 같은 절대 픽셀 보다 `vh = window.innerHeight` / `vw = window.innerWidth` 기반 비율 (`r.y < vh * 0.3` 등) 을 쓴다 — fixture 변경에도 robust.
- 윈도우/viewport 크기 자체를 바꿔야 하는 정당한 이유가 생기면:
  1. 그 이유를 사용자에게 설명하고 승인 받는다.
  2. `lib/test-fixture.ts` 의 `ATC_WINDOW_WIDTH` / `ATC_WINDOW_HEIGHT` 상수를 수정한다 (한 곳에서만).
  3. 본 룰 문서 + `CLAUDE.md (b)` 컨벤션을 함께 갱신한다.

## 위반 예시

```ts
// 잘못된 예 1: spec 안에서 viewport 변경
test('주문 관리', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });   // ✗ 금지
  // ...
});

// 잘못된 예 2: 새 fixture 로 우회
const customTest = base.extend({
  context: async ({}, use) => {
    const ctx = await chromium.launchPersistentContext('/tmp', {
      viewport: { width: 1920, height: 1080 },                  // ✗ 금지
    });
    await use(ctx);
  },
});

// 잘못된 예 3: --window-size 다른 값 추가
const args = [
  ...buildExtensionArgs(),
  '--window-size=1024,768',                                      // ✗ 금지
];
```

## 올바른 예

```ts
// 올바른 예: setViewportSize 없이 fixture 의 1800×1280 을 그대로 사용
test('주문 관리', async ({ page }) => {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  // page.viewportSize() = { width: 1800, height: 1280 } 자동.
});

// 좌표 검색 시 viewport 비율 기반 (fixture 변경에 robust)
const target = await page.evaluate(() => {
  const vh = window.innerHeight;  // = 1280
  const vw = window.innerWidth;   // = 1800
  // 페이지 상단 30% 영역에서만 매치
  for (const el of document.querySelectorAll('button')) {
    const r = el.getBoundingClientRect();
    if (r.y > vh * 0.3) continue;
    // ...
  }
});
```

## 검증

```bash
# spec 들에 setViewportSize 잔존 여부 확인 — 결과 0 이어야 함.
rg -n 'setViewportSize' tests/ lib/
# 기대 출력: (없음)

# fixture 의 상수 확인.
rg -n 'ATC_WINDOW_(WIDTH|HEIGHT)' lib/test-fixture.ts
# 기대: 1800 / 1280 정의 + 사용 (총 4건)
```

## 근거 / 출처

- 사용자 명시 (2026-05-15): "tc 실행할때 playwright 돌릴때 창 1800 x 1280으로 켜지게 해 무조건 ... 무조건 저 사이즈로 실행되게 해".
- 일관된 viewport 는 픽셀 좌표 기반 검증 (스크린샷 비교, getBoundingClientRect 좌표 매칭) 의 안정성 전제.
- Chrome `--window-size` + Playwright `viewport` 둘 다 동일 값 강제 — 그래야 (a) 실제 화면에서 보이는 크기 (--window-size) 와 (b) page 가 인식하는 viewport 가 일치.
- `lib/test-fixture.ts` 의 `ATC_WINDOW_WIDTH = 1800`, `ATC_WINDOW_HEIGHT = 1280` 이 single source of truth.
