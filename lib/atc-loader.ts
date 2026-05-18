/**
 * ATC YAML loader with zod normalization + composes 펼침.
 *
 * Fulfills R-A1.4:
 *   given: 사용자가 `atcs/<domain>/<name>.atc.yml`을 추가
 *   when:  `npm run atc`가 ATC를 로드
 *   then:  zod 스키마로 검증 — title(string), inputs(object), steps(array<{id, do, on_error?, on_recovery?}>),
 *          expected(string?). 누락 키는 정규화 단계에서 기본값 채움.
 *          스키마 위반 시 명확한 에러 메시지.
 *
 * `composes` 지원 (REFACTOR §3):
 *   - ATC 가 `composes: [./_search.atc.yml, ./_open.atc.yml]` 처럼 다른 ATC 들을 나열하면
 *     로더가 각 child 를 재귀 로드하여 그 steps 를 본 ATC 의 steps **앞에** prepend.
 *   - 경로는 본 ATC 파일 기준 상대 경로 (yaml 의 `./_x.atc.yml`).
 *   - 순환 참조 감지: A→B→A 처럼 같은 절대 경로가 다시 등장하면 throw.
 *   - inputs 는 자동 병합 안 함 — 부모가 명시 선언 (D8 일관성, 디버깅 용이성).
 *
 * Notes (yaml v2):
 *   - `parse` returns `unknown`; we hand it straight to zod for safe narrowing.
 *   - `inputs` falls back to `{}` via the schema's `.default({})`.
 *   - `on_error` / `on_recovery` / `expected` 는 optional이라 누락 시 undefined로 통과.
 *   - 에러는 단일 Error로 throw하되, issues를 줄바꿈 + 들여쓰기로 묶어 사람이 읽기 쉽게.
 */

import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { parse } from 'yaml';
import { atcSchema, type ATC } from './atc-schema';

/**
 * Read an `.atc.yml` file from disk and return a validated, normalized ATC object.
 * `composes` 가 있으면 child ATC 들을 재귀 로드하여 steps 를 펼침.
 *
 * @param path  ATC YAML 파일 경로 (절대 또는 cwd 기준 상대).
 * @throws Error with structured issue list when the YAML violates atcSchema,
 *         or when a circular composes chain is detected.
 */
export function loadATC(path: string): ATC {
  return loadATCInner(path, new Set());
}

function loadATCInner(path: string, seen: Set<string>): ATC {
  const abs = resolve(path);
  if (seen.has(abs)) {
    const chain = [...seen, abs].join('\n  → ');
    throw new Error(`ATC composes 순환 참조 감지:\n  → ${chain}`);
  }

  const raw = readFileSync(abs, 'utf8');
  const parsed: unknown = parse(raw);
  const result = atcSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '<root>'}: ${issue.message}`)
      .join('\n');
    throw new Error(`ATC 스키마 위반 (${abs}):\n${issues}`);
  }
  const atc = result.data;

  if (atc.composes === undefined || atc.composes.length === 0) {
    return atc;
  }

  // composes 펼침: child 들의 steps 를 순서대로 본 ATC steps 앞에 prepend.
  const nextSeen = new Set(seen);
  nextSeen.add(abs);
  const baseDir = dirname(abs);
  const expandedSteps = [];
  for (const childRel of atc.composes) {
    const childPath = resolve(baseDir, childRel);
    const child = loadATCInner(childPath, nextSeen);
    expandedSteps.push(...child.steps);
  }

  return { ...atc, steps: [...expandedSteps, ...atc.steps] };
}
