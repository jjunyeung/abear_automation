/**
 * Custom Playwright reporter — emits a per-run ATC report as both
 * Markdown (human) and JSON (machine) under `reports/runs/<runId>/`.
 *
 * Fulfills R-A2.1 (reporter portion):
 *   given: an ATC spec executes via Playwright config
 *   when:  the run completes
 *   then:  reports/runs/<runId>/<runId>.md AND <runId>.json are written,
 *          each ATC's per-step status (success / recovered / unhandled /
 *          failed / skipped) is rendered with icons, and `unhandled`
 *          errors are highlighted at the bottom of the markdown report
 *          with the path of the missing recovery file.
 *
 * Wire protocol (spec ↔ reporter):
 *   The runner (`lib/runner.ts`) returns a `RunResult`. Each `test()` MUST
 *   call `test.info().attach('atc-result', { body: JSON.stringify(result),
 *   contentType: 'application/json' })` so this reporter can collect the
 *   structured payload. Tests that do not attach are still tracked through
 *   Playwright's normal status, but they appear in the report only as a
 *   plain pass/fail entry without per-step detail.
 *
 * Notes:
 *   - We avoid a static type-import from `lib/runner.ts` to keep the
 *     reporter loosely coupled (T3 is being authored in parallel and
 *     reporter must be importable even if `RunResult` shape evolves).
 *     Instead we declare a local minimal shape and validate fields on
 *     read with `typeof` checks. This is strict-mode-safe (no `any`).
 *   - Strict TS: every JSON parse goes through `unknown` + a hand-rolled
 *     guard (`isRunResult`). No `any`, no ts-ignore (per
 *     `.claude/rules/typescript-strict.md`).
 */

import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
} from '@playwright/test/reporter';

/** Reporter constructor options (forwarded from `playwright.config.ts`). */
interface AtcReporterOptions {
  outputDir: string;
  runId: string;
}

/** Per-step status emitted by the runner. */
type StepStatus =
  | 'success'
  | 'failed'
  | 'recovered'
  | 'unhandled'
  | 'skipped';

/** Local, loosely-coupled shape mirroring `lib/runner.ts` `StepResult`. */
interface StepResult {
  step_id: string;
  status: StepStatus;
  duration_ms: number;
  error_key?: string;
  recovery_id?: string;
  message?: string;
}

/** Local, loosely-coupled shape mirroring `lib/runner.ts` `RunResult`. */
interface RunResult {
  atc_title: string;
  steps: StepResult[];
  overall: 'success' | 'failed' | 'skipped';
  inputs_used: Record<string, unknown>;
  /**
   * spec.ts 가 `emitOutput()` 으로 채운 값들. 같은 batch 의 뒤 TC 가
   * `inputs.<name>.from === 'previous'` 로 받아간다. 옛 reporter 결과를 다시
   * 읽을 수도 있으니 optional 로 둔다.
   */
  outputs?: Record<string, string | number | boolean | null>;
}

/** Reporter-internal record that pairs an attachment with its test context. */
interface CollectedAtc {
  test_title: string;
  spec_file: string;
  result: RunResult;
}

/** ATC overall → 리포트 뱃지. skipped 는 '미실행'(외부/환경 요인, 실패 아님). */
function overallBadge(overall: 'success' | 'failed' | 'skipped'): string {
  if (overall === 'success') return '✅ 성공';
  if (overall === 'skipped') return '⏭️ 미실행';
  return '❌ 실패';
}

/**
 * 한 runId 의 여러 ATC overall 을 집계. failed 우선, 그 다음 skipped, 모두 success 면 success.
 * (Playwright 의 result.status 대신 이 값을 json overall_status 로 박아 배치 리포트가
 *  '미실행'을 실패와 분리해 읽게 한다.)
 */
function aggregateAtcOverall(
  atcs: CollectedAtc[],
): 'success' | 'failed' | 'skipped' | null {
  if (atcs.length === 0) return null;
  if (atcs.some((c) => c.result.overall === 'failed')) return 'failed';
  if (atcs.some((c) => c.result.overall === 'skipped')) return 'skipped';
  return 'success';
}

/** Type guard for an unknown JSON payload claiming to be a `RunResult`. */
function isRunResult(value: unknown): value is RunResult {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.atc_title !== 'string') return false;
  if (v.overall !== 'success' && v.overall !== 'failed' && v.overall !== 'skipped') return false;
  if (!Array.isArray(v.steps)) return false;
  if (typeof v.inputs_used !== 'object' || v.inputs_used === null) return false;
  for (const raw of v.steps) {
    if (typeof raw !== 'object' || raw === null) return false;
    const s = raw as Record<string, unknown>;
    if (typeof s.step_id !== 'string') return false;
    if (typeof s.duration_ms !== 'number') return false;
    if (
      s.status !== 'success' &&
      s.status !== 'failed' &&
      s.status !== 'recovered' &&
      s.status !== 'unhandled' &&
      s.status !== 'skipped'
    ) {
      return false;
    }
  }
  return true;
}

class ATCReporter implements Reporter {
  private readonly outputDir: string;
  private readonly runId: string;
  private readonly collected: CollectedAtc[] = [];
  private startedAt: Date = new Date();

  constructor(options: AtcReporterOptions) {
    this.outputDir = options.outputDir;
    this.runId = options.runId;
  }

  onBegin(_config: FullConfig, _suite: Suite): void {
    this.startedAt = new Date();
    mkdirSync(this.outputDir, { recursive: true });
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    for (const att of result.attachments) {
      if (att.name !== 'atc-result' || !att.body) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(att.body.toString('utf8'));
      } catch {
        // Malformed payload — skip silently; Playwright's own status still records the failure.
        continue;
      }
      if (!isRunResult(parsed)) continue;
      this.collected.push({
        test_title: test.title,
        spec_file: test.location.file,
        result: parsed,
      });
    }
  }

  async onEnd(result: FullResult): Promise<void> {
    const md = this.renderMd(result);
    const json = this.renderJson(result);
    writeFileSync(join(this.outputDir, `${this.runId}.md`), md, 'utf8');
    writeFileSync(join(this.outputDir, `${this.runId}.json`), json, 'utf8');
    console.log(
      `\n[ATC] 리포트 생성: ${this.outputDir}/${this.runId}.{md,json}`,
    );
  }

  private renderMd(result: FullResult): string {
    const lines: string[] = [];
    lines.push(`# ATC Run Report — ${this.runId}`);
    lines.push('');
    lines.push(`- **시작**: ${this.startedAt.toISOString()}`);
    lines.push(`- **종료**: ${new Date().toISOString()}`);
    lines.push(`- **상태**: ${result.status}`);
    lines.push(`- **ATC 수**: ${this.collected.length}`);
    lines.push('');

    for (const item of this.collected) {
      lines.push(`## ATC: ${item.result.atc_title}`);
      lines.push('');
      lines.push(`- spec: \`${item.spec_file}\``);
      lines.push(`- 입력: \`${JSON.stringify(item.result.inputs_used)}\``);
      const outputs = item.result.outputs ?? {};
      if (Object.keys(outputs).length > 0) {
        // 같은 batch 의 뒤 TC 가 이 줄로 자동 주입 받음 (inputs.<name>.from === 'previous').
        lines.push(`- 출력: \`${JSON.stringify(outputs)}\``);
      }
      lines.push(`- 결과: ${overallBadge(item.result.overall)}`);
      lines.push('');
      lines.push('### 단계별');
      for (const s of item.result.steps) {
        lines.push(this.renderStepLine(s));
      }
      lines.push('');
    }

    // D11: unhandled 에러는 최하단에 강조해 사용자가 새 recovery 파일 추가를 빠르게 인지하도록.
    const unhandled = this.collected.flatMap((c) =>
      c.result.steps.filter((s) => s.status === 'unhandled'),
    );
    if (unhandled.length > 0) {
      lines.push('---');
      lines.push('## 🚨 Unhandled 에러 요약');
      for (const s of unhandled) {
        const key = s.error_key ?? '(unknown)';
        lines.push(
          `- step \`${s.step_id}\` — error_key \`${key}\` — \`/recovery-new ${key}\` 또는 \`recoveries/${key}.ts\` 직접 작성`,
        );
      }
    }
    return lines.join('\n') + '\n';
  }

  private renderStepLine(s: StepResult): string {
    const icon = this.statusIcon(s.status);
    let body: string;
    switch (s.status) {
      case 'success':
        body = '성공';
        break;
      case 'recovered':
        body = `에러 발생 → 복구 플로우 \`${s.recovery_id ?? '(unknown)'}\`로 해결 (error_key: \`${s.error_key ?? '(unknown)'}\`)`;
        break;
      case 'unhandled': {
        const key = s.error_key ?? '(unknown)';
        const detail =
          typeof s.message === 'string' && s.message.length > 0 ? ` — ${s.message}` : '';
        body = `🚨 **UNHANDLED** error_key: \`${key}\` → \`recoveries/${s.error_key ?? 'TODO'}.ts\` 추가 필요${detail}`;
        break;
      }
      case 'skipped':
        body = '건너뜀';
        break;
      case 'failed':
      default:
        body = `실패: ${s.message ?? ''}`;
        break;
    }
    return `- **${s.step_id}**: ${icon} ${body} _(${s.duration_ms}ms)_`;
  }

  private statusIcon(status: StepStatus): string {
    switch (status) {
      case 'success':
        return '✅';
      case 'recovered':
        return '⚠️';
      case 'unhandled':
        return '🚨';
      case 'skipped':
        return '⏭️';
      case 'failed':
      default:
        return '❌';
    }
  }

  private renderJson(result: FullResult): string {
    return (
      JSON.stringify(
        {
          run_id: this.runId,
          started_at: this.startedAt.toISOString(),
          ended_at: new Date().toISOString(),
          // Playwright 의 result.status 대신 ATC overall 집계를 박는다 — 미실행(skipped)
          // TC 는 spec expect 가 실패해 result.status='failed' 가 되지만, 배치 리포트는
          // 이 overall_status 로 '미실행'을 실패와 분리해 읽어야 하기 때문.
          overall_status: aggregateAtcOverall(this.collected) ?? result.status,
          atcs: this.collected,
        },
        null,
        2,
      ) + '\n'
    );
  }
}

export default ATCReporter;
