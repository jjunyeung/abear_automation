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
     * TC 가 무엇을 하는 지 사람이 읽는 설명/메모. GUI InputForm 헤더 아래에 표시되어
     * "이 TC 가 뭔지" 알려준다. 실행에는 사용 안 함 — 순수 표시용.
     * composes 의 child ATC 의 description 은 부모로 병합 안 됨 (inputs 와 같은 정책).
     */
    description: z.string().optional(),
    inputs: z.record(z.string(), inputSchemaSchema).default({}),
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
