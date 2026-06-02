/**
 * ATC (Automated Test Case) zod schemas + inferred TypeScript types.
 *
 * Fulfills R-A4.1:
 *   given: lib/atc-schema.ts에 zod 스키마 정의
 *   when:  ATC YAML 로드
 *   then:  런타임 검증 + TypeScript 타입 자동 추론(`type ATC = z.infer<typeof atcSchema>`).
 *          수동 타입 중복 없음.
 *
 * Notes (zod v4):
 *   - `z.record(keyType, valueType)` requires the key type as the first argument.
 *   - `.default({})` on a record makes the field optional in input but always
 *     present in the parsed output.
 */

import { z } from 'zod';

/** Schema for a single ATC input declaration (`inputs.<name>`). */
export const inputSchemaSchema = z.object({
  type: z.string(),
  description: z.string().optional(),
  example: z.string().optional(),
  /**
   * `previous` 면 GUI 큐의 같은 batch 안에서 앞 TC 가 emit 한 같은 이름의
   * output 을 자동 주입 (사용자가 큐 뷰에서 직접 입력하면 그 값이 우선).
   * `pool` 이면 GUI 의 URL 풀 (`data/url-pool.txt`) head 에서 매 spawn 직전 1개
   * 를 consume 해서 자동 주입 (사용자 입력값 / from:previous 자동주입이 우선).
   * 단일 실행 / 배치 첫 TC 처럼 앞선 output 이 없으면 fallback 으로 사용자
   * 입력값 (CLI 인자 / 큐 폼) 을 그대로 사용.
   */
  from: z.enum(['previous', 'pool']).optional(),
});

/**
 * Schema for a single ATC output declaration (`outputs.<name>`).
 *
 * spec.ts 가 실행 중 `emitOutput(name, value)` 로 값을 채우면 GUI 큐가 같은
 * batch 안에서 뒤 TC 의 `inputs.<name>.from === 'previous'` 자리에 자동 주입.
 * 선언은 카탈로그/큐 뷰가 "이 TC 가 뭘 내놓는지" 미리 보여주기 위한 메타.
 */
export const outputSchemaSchema = z.object({
  type: z.string(),
  description: z.string().optional(),
});

/** Schema for a single ATC step (`steps[i]`). */
export const stepSchema = z.object({
  /** Stable step identifier referenced by `on_recovery.restart_from`. */
  id: z.string(),
  /** Korean natural-language description of the action; Claude translates to Playwright code. */
  do: z.string(),
  /** Optional list of recovery ids to attempt when this step throws. */
  on_error: z.array(z.string()).optional(),
  /** Optional override of the resume-point after a successful recovery (D4). */
  on_recovery: z
    .object({
      restart_from: z.string(),
    })
    .optional(),
  /** Optional human-readable assertion text for the step. */
  expect: z.string().optional(),
});

/**
 * Top-level ATC schema (one `.atc.yml` file).
 *
 * `composes` (선택): 다른 ATC YAML 파일들의 상대 경로 목록. 로더가 이 목록을 순서대로
 * 재귀 펼쳐서 그 ATC 들의 steps 를 본 ATC 의 steps 앞에 prepend 한다.
 *   - 사용 예 = "큰 e2e ATC 가 작은 조각 ATC 들의 조합"
 *   - 컨벤션: 조각 ATC 는 `_<name>.atc.yml` (언더스코어 prefix)
 *   - inputs 는 자동 병합 안 됨 — 부모 ATC 가 필요한 inputs 를 명시 선언해야 함 (D8 일관성)
 *   - 순환 참조는 로더가 throw
 *
 * refine: steps 또는 composes 중 최소 하나는 비어 있지 않아야 함 (빈 ATC 금지).
 */
export const atcSchema = z
  .object({
    title: z.string(),
    /**
     * TC 우선순위 (엑셀 TC export 의 P 컬럼과 동일). GUI 카탈로그에서 필터/태그로
     * 사용. 통합 ATC 는 묶인 TC# 들 중 최고 priority (P0 > P1 > P2). 신규 작성
     * 시 필수에 가까우나 backfill 점진 적용을 위해 optional.
     */
    priority: z.enum(['P0', 'P1', 'P2']).optional(),
    /**
     * TC 가 무엇을 하는 지 사람이 읽는 설명/메모. GUI InputForm 헤더 아래에 표시되어
     * "이 TC 가 뭔지" 알려준다. 실행에는 사용 안 함 — 순수 표시용.
     * composes 의 child ATC 의 description 은 부모로 병합 안 됨 (inputs 와 같은 정책).
     */
    description: z.string().optional(),
    inputs: z.record(z.string(), inputSchemaSchema).default({}),
    /**
     * 이 TC 가 실행 중 `emitOutput()` 으로 내놓는 값들의 스키마 선언. 선언이
     * 있어야 GUI 가 "이 TC 는 X 를 내놓는다" 미리 표시할 수 있고, 뒤 TC 의
     * `inputs.<name>.from === 'previous'` 와 매칭된다 (이름 단위).
     */
    outputs: z.record(z.string(), outputSchemaSchema).default({}),
    steps: z.array(stepSchema).default([]),
    composes: z.array(z.string()).optional(),
    expected: z.string().optional(),
  })
  .refine(
    (atc) =>
      atc.steps.length > 0 || (atc.composes !== undefined && atc.composes.length > 0),
    {
      message: 'steps 또는 composes 중 최소 하나는 1개 이상 있어야 합니다',
      path: ['steps'],
    },
  );

/** Inferred runtime type for a parsed ATC document. */
export type ATC = z.infer<typeof atcSchema>;

/** Inferred runtime type for a single ATC step. */
export type ATCStep = z.infer<typeof stepSchema>;

/** Inferred runtime type for an ATC input schema entry. */
export type ATCInputSchema = z.infer<typeof inputSchemaSchema>;

/** Inferred runtime type for an ATC output schema entry. */
export type ATCOutputSchema = z.infer<typeof outputSchemaSchema>;
