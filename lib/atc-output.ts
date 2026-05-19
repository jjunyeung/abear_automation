/**
 * ATC output buffer — spec.ts 가 runATC 실행 중 발급하는 "다음 TC 가 받아갈"
 * 값들의 단일 source.
 *
 * 모델:
 *   - 모듈 레벨 버퍼 (Node 워커 프로세스당 1개). 단일 spec 의 단일 ATC 안에서만
 *     의미를 가진다 — Playwright 워커가 한 번에 하나의 spec 만 돌리고, 우리
 *     runner 는 spec 1개 = ATC 1개 패턴이라 안전 (외부 어디서도 동시 호출 X).
 *   - 라이프사이클: `resetEmittedOutputs()` → handler 들이 `emitOutput()` →
 *     `getEmittedOutputs()` 로 끝에서 한 번 읽는다. runATC 가 이 흐름을 강제.
 *   - 값 타입: `string | number | boolean | null`. GUI 가 다음 TC 의 CLI input
 *     으로 그대로 stringify 해서 넘김 (scripts/atc.mjs → ATC_INPUT_*). 객체/배열은
 *     선언적 모델이 깨지므로 거절 (zod-less, 단순 런타임 guard).
 *
 * 의도적으로 lib 핵심 (runner / atc-loader / atc-schema) 에만 의존하지 않게
 * 두었다 — recoveries/ 와 같은 단방향 정책 (CLAUDE.md (h)) 을 깨지 않고 spec.ts
 * 어디서든 import 가능.
 */

export type OutputValue = string | number | boolean | null;

const buffer = new Map<string, OutputValue>();

function isOutputValue(v: unknown): v is OutputValue {
  return (
    v === null ||
    typeof v === 'string' ||
    typeof v === 'number' ||
    typeof v === 'boolean'
  );
}

/**
 * Reset the per-run output buffer. `runATC` calls this at start so each ATC
 * begins with an empty slate.
 */
export function resetEmittedOutputs(): void {
  buffer.clear();
}

/**
 * Spec.ts 가 step handler 안에서 호출. 같은 이름을 두 번 emit 하면 뒤가 이김
 * (마지막 step 의 값으로 확정).
 */
export function emitOutput(name: string, value: OutputValue): void {
  if (typeof name !== 'string' || name.length === 0) {
    throw new Error(`emitOutput: 이름이 비어있거나 string 이 아님 (${String(name)})`);
  }
  if (!isOutputValue(value)) {
    throw new Error(
      `emitOutput('${name}'): 값은 string | number | boolean | null 만 허용. 받은 타입=${typeof value}`,
    );
  }
  buffer.set(name, value);
}

/** runATC 종료 시 결과 객체로 옮기기 위해 호출. 호출자가 소비하면 끝. */
export function getEmittedOutputs(): Record<string, OutputValue> {
  const out: Record<string, OutputValue> = {};
  for (const [k, v] of buffer.entries()) out[k] = v;
  return out;
}
