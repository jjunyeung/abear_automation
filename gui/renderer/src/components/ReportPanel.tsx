/**
 * ReportPanel — 단일 / 묶음 리포트 보기.
 *
 * 단일 (runId 1개): 마크다운 한 페이지로 그대로.
 * 묶음 (runIds 여러 개):
 *   - 디폴트: 통합 모드 — 통합 요약 + 모든 TC 의 md 를 하나로 concat 해서 보여줌
 *   - TC별 모드: 각 TC 를 Blueprint Section 으로 분리. SegmentedControl 로 모드 전환.
 *
 * Fulfills R-B3.3 / R-U8.1-3 / R-T13.2.
 *
 * INV-3 / INV-4: 마크다운 + 메타데이터 모두 IPC (window.atcAPI.runReport) 로만 가져옴.
 */

import {
  Button as BpButton,
  Card,
  Icon,
  type IconName,
  Section,
  SectionCard,
  Tag,
} from '@blueprintjs/core';
import {
  useEffect,
  useMemo,
  useState,
  type JSX,
  type ReactNode,
} from 'react';
import Markdown from 'react-markdown';
import type { RunResultJson } from '../../../shared/ipc';
import './ReportPanel.css';

interface ReportPanelProps {
  runId: string | null;
  /** 묶음 실행의 누적 runId 목록. 비어있지 않으면 통합 리포트 모드. */
  runIds?: readonly string[];
  /** 묶음 안의 각 TC 헤더 라벨 (atcPath 기반). */
  titleResolver?: (runId: string) => string | null;
}

interface LoadedReport {
  runId: string;
  md: string;
  json: RunResultJson | null;
}

interface H2Props {
  children?: ReactNode;
}

function isUnhandledHeading(children: ReactNode): boolean {
  const text = extractText(children).toLowerCase();
  if (text.includes('unhandled')) return true;
  if (text.includes('\u{1F6A8}')) return true;
  return false;
}

function extractText(node: ReactNode): string {
  if (node === null || node === undefined || node === false || node === true) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (typeof node === 'object' && 'props' in node) {
    const props = (node as { props?: { children?: ReactNode } }).props;
    if (props && 'children' in props) return extractText(props.children);
  }
  return '';
}

/** 통합 요약을 위한 step status 집계. */
interface ReportSummary {
  totalSteps: number;
  passed: number;
  failed: number;
  unhandled: number;
  recovered: number;
  skipped: number;
  durationMs: number;
  overall: 'success' | 'failed' | 'partial' | 'unknown';
}

function summarizeOne(json: RunResultJson | null): ReportSummary {
  if (json === null) {
    return {
      totalSteps: 0,
      passed: 0,
      failed: 0,
      unhandled: 0,
      recovered: 0,
      skipped: 0,
      durationMs: 0,
      overall: 'unknown',
    };
  }
  let passed = 0,
    failed = 0,
    unhandled = 0,
    recovered = 0,
    skipped = 0,
    durationMs = 0;
  for (const s of json.steps) {
    durationMs += s.duration_ms;
    switch (s.status) {
      case 'success':
        passed += 1;
        break;
      case 'failed':
        failed += 1;
        break;
      case 'unhandled':
        unhandled += 1;
        break;
      case 'recovered':
        recovered += 1;
        break;
      case 'skipped':
        skipped += 1;
        break;
    }
  }
  const overall: ReportSummary['overall'] =
    failed + unhandled > 0 ? 'failed' : 'success';
  return {
    totalSteps: json.steps.length,
    passed,
    failed,
    unhandled,
    recovered,
    skipped,
    durationMs,
    overall,
  };
}

function aggregateSummaries(
  reports: readonly LoadedReport[],
): ReportSummary & { tcPassed: number; tcFailed: number; tcUnknown: number } {
  let totalSteps = 0,
    passed = 0,
    failed = 0,
    unhandled = 0,
    recovered = 0,
    skipped = 0,
    durationMs = 0;
  let tcPassed = 0,
    tcFailed = 0,
    tcUnknown = 0;
  for (const r of reports) {
    const s = summarizeOne(r.json);
    totalSteps += s.totalSteps;
    passed += s.passed;
    failed += s.failed;
    unhandled += s.unhandled;
    recovered += s.recovered;
    skipped += s.skipped;
    durationMs += s.durationMs;
    if (s.overall === 'success') tcPassed += 1;
    else if (s.overall === 'failed') tcFailed += 1;
    else tcUnknown += 1;
  }
  return {
    totalSteps,
    passed,
    failed,
    unhandled,
    recovered,
    skipped,
    durationMs,
    overall:
      tcFailed === 0 && tcUnknown === 0
        ? 'success'
        : tcPassed > 0
          ? 'partial'
          : 'failed',
    tcPassed,
    tcFailed,
    tcUnknown,
  };
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const sec = Math.round(ms / 100) / 10;
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const remSec = Math.round(sec - min * 60);
  return `${min}m ${remSec}s`;
}

const MD_COMPONENTS = {
  h2: ({ children }: H2Props): JSX.Element => {
    const className = isUnhandledHeading(children) ? 'unhandled-section' : undefined;
    return <h2 className={className}>{children}</h2>;
  },
  h3: ({ children }: H2Props): JSX.Element => {
    const className = isUnhandledHeading(children) ? 'unhandled-section' : undefined;
    return <h3 className={className}>{children}</h3>;
  },
};

export function ReportPanel({
  runId,
  runIds,
  titleResolver,
}: ReportPanelProps): JSX.Element {
  const idsKey =
    runIds !== undefined && runIds.length > 0 ? runIds.join('|') : (runId ?? '');
  const ids: readonly string[] =
    runIds !== undefined && runIds.length > 0
      ? runIds
      : runId !== null
        ? [runId]
        : [];

  const [reports, setReports] = useState<readonly LoadedReport[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  // 묶음 자동 병합 결과 — 단일 .md 파일의 batchId. null 이면 미생성/생성 중.
  const [batchId, setBatchId] = useState<string | null>(null);
  const [mergeError, setMergeError] = useState<string | null>(null);

  useEffect(() => {
    if (ids.length === 0) {
      setReports([]);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setReports([]);
    void Promise.all(
      ids.map((id) =>
        window.atcAPI
          .runReport({ runId: id })
          .then((r): LoadedReport => ({ runId: id, md: r.md, json: r.json })),
      ),
    )
      .then((results) => {
        if (cancelled) return;
        setReports(results);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setError(`리포트를 불러오지 못했습니다: ${msg}`);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return (): void => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  const isBatch = reports.length > 1;
  const summary = useMemo(
    () => (reports.length > 0 ? aggregateSummaries(reports) : null),
    [reports],
  );

  // 묶음일 때 자동으로 통합 .md 디스크 파일 생성 (reports/batches/<batchId>.md).
  // reports 가 바뀔 때마다 한 번 호출 — 동일 묶음이면 같은 파일에 덮어씀.
  useEffect(() => {
    if (!isBatch) {
      setBatchId(null);
      setMergeError(null);
      return;
    }
    // Stale preload 방어 — Electron 이 재시작되지 않은 dev 세션에서는 새 IPC
    // 가 노출되지 않아 undefined 일 수 있다. 그 경우 그냥 미생성 상태로 둔다.
    if (typeof window.atcAPI?.reportMerge !== 'function') {
      setMergeError(
        '통합 리포트 IPC 가 노출되어 있지 않습니다 — Electron 재시작 후 사용 가능',
      );
      return;
    }
    const runIdsForMerge = reports.map((r) => r.runId);
    let cancelled = false;
    setMergeError(null);
    try {
      void window.atcAPI
        .reportMerge({ runIds: runIdsForMerge })
        .then((res) => {
          if (cancelled) return;
          setBatchId(res.batchId);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          const msg = err instanceof Error ? err.message : String(err);
          setMergeError(`통합 리포트 생성 실패: ${msg}`);
        });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMergeError(`통합 리포트 호출 실패: ${msg}`);
    }
    return (): void => {
      cancelled = true;
    };
  }, [isBatch, reports]);

  if (ids.length === 0) {
    return (
      <div className="report-panel report-panel--empty">
        <p className="report-panel__empty">실행 완료 후 리포트가 여기 표시됩니다.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="report-panel">
        <p className="report-panel__loading">
          리포트 로딩 중… ({ids.length === 1 ? ids[0] : `${ids.length}개 묶음`})
        </p>
      </div>
    );
  }

  if (error !== null) {
    return (
      <div className="report-panel">
        <p className="report-panel__error" role="alert">
          {error}
        </p>
      </div>
    );
  }

  if (reports.length === 0) {
    return <div className="report-panel" />;
  }

  // ── 단일 모드 — 그냥 마크다운 ──
  if (!isBatch) {
    const onlyId = reports[0].runId;
    return (
      <div className="report-panel">
        <div className="report-panel__toolbar">
          <span className="report-panel__runid" title={onlyId}>
            {onlyId}
          </span>
          <BpButton
            icon="folder-open"
            small
            minimal
            onClick={(): void => window.atcAPI.runOpen({ runId: onlyId })}
            text="Finder 에서 열기"
            title={`reports/runs/${onlyId}/ 를 Finder 로 열기`}
          />
        </div>
        <article className="report-panel__entry">
          <Markdown components={MD_COMPONENTS}>{reports[0].md}</Markdown>
        </article>
      </div>
    );
  }

  // ── 묶음 모드 — Blueprint 디자인. 화면은 per-TC, 디스크엔 통합 .md 1개. ──
  return (
    <div className="report-panel report-panel--batch">
      {/* 헤더: 통합 리포트 파일 액션 */}
      <div className="report-panel__batch-toolbar">
        <span className="report-panel__batch-meta">
          {reports.length}개 TC · 총 {formatDuration(summary?.durationMs ?? 0)}
        </span>
        <div className="report-panel__batch-toolbar-right">
          {batchId !== null && (
            <BpButton
              icon="document"
              intent="primary"
              small
              onClick={(): void =>
                window.atcAPI.batchReportOpen({ batchId })
              }
              text="통합 .md 파일 열기"
              title={`reports/batches/${batchId}.md (모든 TC 데이터를 담은 단일 파일) 을 기본 앱으로 열기`}
            />
          )}
          {batchId === null && mergeError === null && (
            <span className="report-panel__merge-status">
              통합 .md 생성 중…
            </span>
          )}
          {mergeError !== null && (
            <span className="report-panel__merge-error" role="alert">
              {mergeError}
            </span>
          )}
        </div>
      </div>

      {/* 통합 요약 카드 — Blueprint */}
      {summary !== null && (
        <Card className="report-panel__summary" compact>
          <div className="report-panel__summary-head">
            <h3 className="report-panel__summary-title">
              묶음 실행 리포트 ({reports.length}건)
            </h3>
            <OverallTag overall={summary.overall} />
          </div>
          <p className="report-panel__summary-sub">
            TC {summary.tcPassed} 성공
            {summary.tcFailed > 0 ? ` · ${summary.tcFailed} 실패` : ''}
            {summary.tcUnknown > 0 ? ` · ${summary.tcUnknown} 불명` : ''}
          </p>
          <div className="report-panel__stats">
            <Stat label="총 step" value={summary.totalSteps} />
            <Stat label="성공" value={summary.passed} tone="success" />
            <Stat
              label="실패"
              value={summary.failed + summary.unhandled}
              tone={summary.failed + summary.unhandled > 0 ? 'danger' : 'muted'}
            />
            <Stat
              label="복구됨"
              value={summary.recovered}
              tone={summary.recovered > 0 ? 'warning' : 'muted'}
            />
            <Stat
              icon="time"
              label="총 시간"
              value={formatDuration(summary.durationMs)}
            />
          </div>
        </Card>
      )}

      {/* 본문 — 항상 per-TC. 화면은 기존처럼 분리, 파일은 위 버튼에서 통합본 접근. */}
      <div className="report-panel__per-tc">
          {reports.map((r, i) => {
            const oneSummary = summarizeOne(r.json);
            const title =
              titleResolver?.(r.runId) ?? r.json?.atc_title ?? r.runId;
            return (
              <Section
                key={r.runId}
                collapsible
                compact
                className="report-panel__tc"
                title={
                  <div className="report-panel__tc-title">
                    <Tag minimal className="report-panel__tc-index">
                      #{i + 1}
                    </Tag>
                    <div className="report-panel__tc-titletext">
                      <div className="report-panel__tc-titleline">{title}</div>
                      <div className="report-panel__tc-meta">
                        {r.runId} · {formatDuration(oneSummary.durationMs)}
                      </div>
                    </div>
                  </div>
                }
                rightElement={
                  <div className="report-panel__tc-right">
                    <span className="report-panel__tc-stepcount">
                      {oneSummary.passed}/{oneSummary.totalSteps} step
                    </span>
                    <OverallTag overall={oneSummary.overall} compact />
                    <BpButton
                      icon="folder-open"
                      small
                      minimal
                      onClick={(e): void => {
                        e.stopPropagation();
                        window.atcAPI.runOpen({ runId: r.runId });
                      }}
                      title={`reports/runs/${r.runId}/ 를 Finder 로 열기`}
                    />
                  </div>
                }
              >
                <SectionCard padded>
                  <article className="report-panel__entry">
                    <Markdown components={MD_COMPONENTS}>{r.md}</Markdown>
                  </article>
                </SectionCard>
              </Section>
            );
          })}
      </div>
    </div>
  );
}

function OverallTag({
  overall,
  compact,
}: {
  overall: ReportSummary['overall'];
  compact?: boolean;
}): JSX.Element {
  if (overall === 'success') {
    return (
      <Tag intent="success" icon="tick-circle" minimal={compact ?? false}>
        성공
      </Tag>
    );
  }
  if (overall === 'partial') {
    return (
      <Tag intent="warning" icon="warning-sign" minimal={compact ?? false}>
        부분 실패
      </Tag>
    );
  }
  if (overall === 'failed') {
    return (
      <Tag intent="danger" icon="cross-circle" minimal={compact ?? false}>
        실패
      </Tag>
    );
  }
  return (
    <Tag minimal icon="help">
      불명
    </Tag>
  );
}

interface StatProps {
  label: string;
  value: string | number;
  tone?: 'success' | 'danger' | 'warning' | 'muted';
  icon?: IconName;
}

function Stat({ label, value, tone, icon }: StatProps): JSX.Element {
  const cls =
    tone === 'success'
      ? 'report-panel__stat--success'
      : tone === 'danger'
        ? 'report-panel__stat--danger'
        : tone === 'warning'
          ? 'report-panel__stat--warning'
          : tone === 'muted'
            ? 'report-panel__stat--muted'
            : '';
  return (
    <div className={`report-panel__stat ${cls}`}>
      <div className="report-panel__stat-label">
        {icon && <Icon icon={icon} size={11} />} {label}
      </div>
      <div className="report-panel__stat-value">{value}</div>
    </div>
  );
}
