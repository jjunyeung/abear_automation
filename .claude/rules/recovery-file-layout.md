# 복구 (Recovery) 파일 레이아웃

복구 플로우 = ATC step 에서 에러가 났을 때 자동 분기되는 별도 코드 경로. 단일 위치 / 단일 함수 export / nested 호출 금지 / unmatched 에러 자동 처리 금지 — 4가지 규칙 전부 강제.

## 금지

- `recoveries/` 디렉토리 **밖에** 복구 파일을 두지 마라. (`lib/recoveries/`, `tests/recoveries/`, `src/recoveries/` 모두 금지.)
- 한 파일에 함수 여러 개를 export 하지 마라. **파일 = 1개의 `recover` 함수**.
- `recoveries/foo/bar.ts` 처럼 도메인 서브디렉토리 만들지 마라. 모두 `recoveries/<recovery_id>.ts` 평면 구조.
- 파일명을 `<recovery_id>.ts` 가 아닌 다른 형태로 짓지 마라. (`missing_image.recovery.ts` ✗, `MissingImage.ts` ✗ — 케이스도 snake_case 의 ErrorKey 와 일치.)
- `recover()` 함수 내부에서 다른 `recover()` 를 호출하거나 `recovery-registry` 를 통해 다른 복구를 트리거하지 마라 (**C7: nested 호출 절대 금지**).
- 매칭되지 않은 에러를 잡으려고 fallback / catch-all / generic recovery 를 두지 마라 (**C8: unmatched 에러는 자동 복구 금지, 무조건 unhandled 로 리포트**).
- `recover()` 안에서 자체 try/catch 로 에러를 삼키지 마라. 복구 실패는 throw 해서 runner 가 1회 실패로 기록하게 둔다 (**D12: 재귀 없음, 1회 시도**).
- 시그니처를 변경하지 마라 — `Page`, `RecoveryContext` 외의 인자 추가 금지, 반환 타입을 `Promise<void>` 외로 바꾸지 마라.

## 대신

- 경로 규칙 (정확히 depth 1):
  ```
  recoveries/<recovery_id>.ts
  ```
  - `<recovery_id>` 는 `lib/errors.ts` 의 `ErrorKey` 유니온에 등록된 키와 **정확히 동일** (예: `missing_image`, `invalid_category`).
  - snake_case.
- 파일 구조 (1 file = 1 export):
  ```ts
  import type { Page } from "@playwright/test";
  import type { RecoveryContext } from "../lib/errors";

  export async function recover(page: Page, ctx: RecoveryContext): Promise<void> {
    // 본문: 에러 한 종류만 고친다. 다른 복구 호출 없음.
  }
  ```
- 새 복구 추가 절차:
  1. `lib/errors.ts` 의 `ErrorKey` 유니온에 새 키 추가.
  2. `recoveries/<key>.ts` 생성 (위 시그니처).
  3. ATC step 의 `on_error: [<key>]` 에 키 등록.
  4. 그 외 자동 wiring 없음 — `recovery-registry` 가 파일명으로 자동 매칭.
- 복구가 또 실패하면 그냥 `throw` — runner 가 받아서 본 ATC 도 FAIL 처리 (D12).

## 위반 예시

```ts
// 잘못된 예 1: recoveries/ 밖
// 파일: lib/recoveries/missing_image.ts                          ✗ 위치 금지

// 잘못된 예 2: 한 파일에 여러 함수 export
// 파일: recoveries/image_fixes.ts
export async function recover(page: Page, ctx: RecoveryContext) { /* ... */ }
export async function recoverThumbnail(page: Page, ctx: RecoveryContext) { /* ... */ }   // ✗

// 잘못된 예 3: nested recovery 호출 (C7 위반)
// 파일: recoveries/missing_image.ts
import { recover as recoverCategory } from "./invalid_category";

export async function recover(page: Page, ctx: RecoveryContext): Promise<void> {
  try {
    await page.click(".upload-image");
  } catch (e) {
    await recoverCategory(page, ctx);   // ✗ 다른 recovery 호출 금지
  }
}

// 잘못된 예 4: catch-all fallback (C8 위반)
// 파일: recoveries/__fallback.ts
export async function recover(page: Page, ctx: RecoveryContext): Promise<void> {
  // ✗ unmatched 에러를 자동으로 처리하려는 의도 — 금지
  await page.reload();
}

// 잘못된 예 5: 자체 try/catch 로 실패 삼키기 (D12 위반)
export async function recover(page: Page, ctx: RecoveryContext): Promise<void> {
  try {
    await page.click(".fix-btn");
  } catch {
    // ✗ 조용히 무시하면 runner 가 복구 실패를 알 수 없음
  }
}

// 잘못된 예 6: 시그니처 변경
export async function recover(page: Page, ctx: RecoveryContext, retry: number) {  // ✗ retry 인자 금지
  return true;   // ✗ Promise<void> 가 아님
}
```

## 올바른 예

```ts
// 올바른 예: recoveries/missing_image.ts
import type { Page } from "@playwright/test";
import type { RecoveryContext } from "../lib/errors";

export async function recover(page: Page, ctx: RecoveryContext): Promise<void> {
  // ctx.error_key === "missing_image" 일 때만 호출됨 (registry 가 매칭)
  // 1) 상품 상세에서 누락 이미지 슬롯 찾기
  await page.locator('[data-test="image-slot-empty"]').first().scrollIntoViewIfNeeded();

  // 2) 기본 이미지로 채우기 (도메인 로직)
  await page.getByRole("button", { name: "기본 이미지로 채우기" }).click();
  await page.getByRole("button", { name: "저장" }).click();

  // 3) 저장 확인 — 실패 시 throw → runner 가 D12 에 따라 1회 실패로 기록
  await page.getByText("저장되었습니다").waitFor({ timeout: 5_000 });
}
```

```ts
// 올바른 예: lib/errors.ts 에 ErrorKey 등록
export type ErrorKey =
  | "missing_image"
  | "invalid_category"
  | "missing_brand"; // 새 키 추가 시 여기 + recoveries/missing_brand.ts 같이
```

```yaml
# 올바른 예: ATC 에서 on_error 로 후보 나열
steps:
  - id: error_check
    do: 에러체크 실행
    on_error: [missing_image, invalid_category]   # 매칭되는 첫 항목 호출
```

## 근거 / 출처

- requirements.md **C4**: "복구 플로우는 `recoveries/<recovery_id>.ts` 단일 파일 단일 함수 export."
- requirements.md **C7**: "복구 플로우는 절대 nested 호출 불가 (`recover()` 안에서 다른 `recover()` 호출 금지)."
- requirements.md **C8**: "매칭되지 않은 에러는 자동 복구 시도 금지. 무조건 unhandled 로 리포트."
- requirements.md **D5**: "복구 플로우 등록 = `recoveries/<id>.ts` + ATC step 의 `on_error: [<id>, ...]` 명시. 각 파일은 하나의 함수 export: `async function recover(page, ctx): Promise<void>`."
- **Import 정책 (실용 갱신)**: 처음 룰은 `recoveries/`가 `lib/errors`만 의존하도록 했지만, 실제로 여러 탭에서 동일 패턴 (탭 클릭 → 에러 배너 파싱 → 입력 수정) 이 반복되어 `lib/tab-error-fix.ts` 같은 shared helper 가 유효함이 확인됨. **변경**: `lib/errors`(RecoveryContext) + `lib/logger` + `lib/<helper>` 같은 비-프레임워크 utility 는 import 허용. ATC 프레임워크 핵심 (`atc-loader`, `runner`, `recovery-registry`, `atc-schema`) 만 import 금지.
- requirements.md **D11**: 등록되지 않은 에러 = 즉시 실패 + 리포트 'unhandled' 기록 (자동 복구 시도 안 함).
- requirements.md **D12**: 복구 자체 실패 = 1회만 시도, 실패 시 본 ATC도 실패. 재귀 복구 없음.
- requirements.md **R-A4.2**: `recover(page: Page, ctx: RecoveryContext): Promise<void>` 시그니처 강제.
- requirements.md **D_H3**: `recovery-file-layout.md` ← C4 (복구는 `recoveries/<id>.ts` 단일 함수 export).
