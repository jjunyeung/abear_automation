# TypeScript Strict 모드 (any 금지)

이 프로젝트의 모든 `.ts` 파일은 `tsconfig.json`의 `strict: true` 아래에서 컴파일된다. 테스트, 리포터, 복구 플로우, 라이브러리 모두 예외 없음.

## 금지

- `any` 타입 사용 금지 (명시적 `: any`, 암시적 `any` 모두 포함).
- `// @ts-ignore`, `// @ts-nocheck`, `// @ts-expect-error` 사용 금지. (정말 필요하면 PR/커밋에서 사용자 승인 명시 후만 — 기본은 거부.)
- `as any` 캐스팅 금지.
- `Function` / `Object` / `{}` 같은 너무 느슨한 빌트인 타입 금지.
- 함수 파라미터·반환 타입을 생략한 채 `noImplicitAny`를 우회하지 마라.

## 대신

- 타입을 알면 **명시적으로 적는다**: `function load(name: string): ATC`.
- 타입을 모르면 `unknown`으로 받고 **좁혀서** 사용한다 (`typeof`, `in`, zod 파싱, custom guard).
- 외부 데이터 (YAML, JSON, env) 는 `unknown`으로 받아 zod 스키마로 파싱 후 `z.infer`로 타입을 얻는다.
- 라이브러리 타입이 부족하면 모듈 declaration 파일 (`*.d.ts`) 을 추가하라 — `any`로 우회 X.
- 콜백 파라미터도 명시: `arr.map((item: Step) => ...)`.

## 위반 예시

```ts
// 잘못된 예: any 사용
function loadAtc(raw: any): any {
  return raw;
}

// 잘못된 예: ts-ignore 로 에러 무시
// @ts-ignore
const result = somethingThatDoesNotTypeCheck();

// 잘못된 예: as any 캐스팅
const ctx = (input as any).ctx;
```

## 올바른 예

```ts
// 올바른 예: unknown + zod 좁히기
import { z } from "zod";
import type { ATC } from "./atc-schema";
import { atcSchema } from "./atc-schema";

export function loadAtc(raw: unknown): ATC {
  return atcSchema.parse(raw); // 런타임 검증 + 타입 추론
}

// 올바른 예: 명시 타입
import type { Page } from "@playwright/test";
import type { RecoveryContext } from "./errors";

export async function recover(page: Page, ctx: RecoveryContext): Promise<void> {
  // ...
}

// 올바른 예: unknown 좁히기
function isStep(v: unknown): v is { id: string; do: string } {
  return typeof v === "object" && v !== null && "id" in v && "do" in v;
}
```

## 근거 / 출처

- requirements.md **C1**: "모든 코드는 TypeScript strict 모드. 테스트·reporter·recoveries 포함."
- requirements.md **D_H3**: `typescript-strict.md` ← C1 (모든 .ts는 strict, any 금지).
- requirements.md **R-A3.2**: `npx tsc --noEmit` 통과 + strict 모드, `any` 사용 시 경고 또는 거부.
- requirements.md **R-A10.1**: `.ts` 저장 시 PostToolUse 훅이 `npx tsc --noEmit`을 자동 실행 — strict 위반 시 즉시 알림이 온다.
