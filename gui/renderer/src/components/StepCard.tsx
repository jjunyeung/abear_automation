/**
 * StepCard — single GitHub-Actions-style card for one ATC step.
 *
 * Fulfills:
 *   R-U6.1 — cards render in execution order (parent passes ordered list)
 *   R-U6.2 — running step auto-expands; terminal step auto-collapses
 *   R-U6.3 — user can manually expand a collapsed terminal card
 *   R-U6.4 — status icon mapping per ATC framework state values
 *   R-U7.1 — screenshot thumbnails embedded in the expanded card body
 *
 * INV-3 / INV-4: pure presentational; receives IPC-derived state via props.
 * R-T1.3: strict TS, no `any`.
 */

import {
  Card,
  Collapse,
  Elevation,
  Icon,
  type IconName,
  type Intent,
  Pre,
  Spinner,
  SpinnerSize,
  Tag,
} from '@blueprintjs/core';
import { useEffect, useState, type JSX } from 'react';
import './StepCard.css';

export type StepStatus =
  | 'pending'
  | 'running'
  | 'recovering'
  | 'success'
  | 'failed'
  | 'recovered'
  | 'unhandled'
  | 'skipped';

export interface StepCardModel {
  id: string;
  do: string;
  status: StepStatus;
  log: string;
  durationMs: number | null;
  recoveryId?: string | null;
  screenshotPaths?: string[];
}

interface StepCardProps {
  step: StepCardModel;
  renderScreenshot?: (path: string) => JSX.Element | null;
}

function isTerminal(status: StepStatus): boolean {
  return (
    status === 'success' ||
    status === 'failed' ||
    status === 'recovered' ||
    status === 'unhandled' ||
    status === 'skipped'
  );
}

const STATUS_ICON: Record<Exclude<StepStatus, 'running' | 'recovering'>, IconName> = {
  pending: 'circle',
  success: 'tick-circle',
  failed: 'cross-circle',
  recovered: 'refresh',
  unhandled: 'warning-sign',
  skipped: 'minus',
};

const STATUS_INTENT: Record<StepStatus, Intent> = {
  pending: 'none',
  running: 'primary',
  recovering: 'warning',
  success: 'success',
  failed: 'danger',
  recovered: 'success',
  unhandled: 'danger',
  skipped: 'none',
};

const STATUS_LABEL: Record<StepStatus, string> = {
  pending: '대기',
  running: '실행 중',
  recovering: '복구 중',
  success: '성공',
  failed: '실패',
  recovered: '복구됨',
  unhandled: 'unhandled',
  skipped: '스킵',
};

function StatusGlyph({ status }: { status: StepStatus }): JSX.Element {
  if (status === 'running' || status === 'recovering') {
    return (
      <Spinner
        size={SpinnerSize.SMALL}
        intent={status === 'recovering' ? 'warning' : 'primary'}
      />
    );
  }
  return <Icon icon={STATUS_ICON[status]} intent={STATUS_INTENT[status]} />;
}

export function StepCard({ step, renderScreenshot }: StepCardProps): JSX.Element {
  const terminal = isTerminal(step.status);

  // R-U6.2 / R-U6.3 — auto-collapse on terminal, user can override.
  const [expandedOverride, setExpandedOverride] = useState<boolean | null>(null);

  useEffect(() => {
    if (!terminal) setExpandedOverride(null);
  }, [terminal]);

  const expanded = expandedOverride ?? !terminal;

  const handleHeaderClick = (): void => {
    if (!terminal) return;
    setExpandedOverride((prev) => (prev === null ? false : !prev));
  };

  const cardClass = `step-card step-card--${step.status}${expanded ? ' step-card--expanded' : ''}`;

  return (
    <Card
      className={cardClass}
      elevation={Elevation.ONE}
      compact
      aria-busy={step.status === 'running'}
    >
      <button
        type="button"
        className="step-card__header"
        onClick={handleHeaderClick}
        disabled={!terminal}
      >
        <span className="step-card__icon" aria-hidden="true">
          <StatusGlyph status={step.status} />
        </span>
        <span className="step-card__id">{step.id}</span>
        <span className="step-card__do">{step.do}</span>
        <Tag minimal intent={STATUS_INTENT[step.status]}>
          {STATUS_LABEL[step.status]}
        </Tag>
        {terminal && step.durationMs !== null ? (
          <span className="step-card__duration">{step.durationMs}ms</span>
        ) : null}
      </button>
      <Collapse isOpen={expanded} keepChildrenMounted>
        <div className="step-card__body">
          {step.log.length > 0 ? (
            <Pre className="step-card__log">{step.log}</Pre>
          ) : (
            <p className="step-card__log-empty">로그 없음</p>
          )}
          {step.recoveryId ? (
            <Tag intent="warning" icon="refresh" minimal large>
              recovery: {step.recoveryId}
            </Tag>
          ) : null}
          {step.screenshotPaths && step.screenshotPaths.length > 0 && renderScreenshot ? (
            <div className="step-card__screenshots">
              {step.screenshotPaths.map((p) => (
                <div key={p} className="step-card__screenshot-cell">
                  {renderScreenshot(p)}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </Collapse>
    </Card>
  );
}
