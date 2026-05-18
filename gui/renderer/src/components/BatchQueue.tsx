/**
 * BatchQueue — ordered list of ATCs the user has ticked for sequential run.
 *
 * Shows each selected ATC as its own row (separate from the catalog) with
 * up/down reorder arrows and a remove button. The order shown here is the
 * exact order in which `main.tsx` will fire `atcRun` IPC calls; the main
 * process run-queue serializes them per R-B6.1/R-B6.2.
 *
 * INV-3: pure presentational. All state lives in App; this component just
 * renders + emits intent callbacks.
 */

import {
  Button,
  ButtonGroup,
  Icon,
  type IconName,
  type Intent,
  NonIdealState,
  Spinner,
  SpinnerSize,
  Tag,
} from '@blueprintjs/core';
import type { JSX } from 'react';
import type { CatalogItem } from '../../../shared/ipc';
import './BatchQueue.css';

export type BatchItemStatus = 'pending' | 'running' | 'done' | 'failed';
export interface BatchItemProgress {
  readonly atcPath: string;
  readonly status: BatchItemStatus;
  readonly runId: string | null;
  readonly queueId: string | null;
}

interface BatchQueueProps {
  /** Selected ATCs in execution order. Items not in the catalog are skipped. */
  order: readonly string[];
  /** Source catalog used to resolve atcPath → title/domain for display. */
  catalog: readonly CatalogItem[];
  onMove: (atcPath: string, direction: 'up' | 'down') => void;
  onRemove: (atcPath: string) => void;
  onRunAll: () => void;
  onClear: () => void;
  running: boolean;
  /**
   * Per-row execution status snapshot. Optional — when absent every row renders
   * as 'pending'. Main 이 묶음 실행 동안 갱신해서 내려준다.
   */
  progress?: readonly BatchItemProgress[];
}

const STATUS_ICON: Record<BatchItemStatus, IconName> = {
  pending: 'time',
  running: 'play',
  done: 'tick-circle',
  failed: 'cross-circle',
};

const STATUS_INTENT: Record<BatchItemStatus, Intent> = {
  pending: 'none',
  running: 'primary',
  done: 'success',
  failed: 'danger',
};

const STATUS_LABEL: Record<BatchItemStatus, string> = {
  pending: '대기',
  running: '진행 중',
  done: '완료',
  failed: '실패',
};

function titleOf(item: CatalogItem): string {
  if (
    typeof item.atc === 'object' &&
    item.atc !== null &&
    'title' in item.atc &&
    typeof (item.atc as { title: unknown }).title === 'string'
  ) {
    return (item.atc as { title: string }).title;
  }
  const parts = item.atcPath.split('/');
  return parts[parts.length - 1] ?? item.atcPath;
}

export function BatchQueue({
  order,
  catalog,
  onMove,
  onRemove,
  onRunAll,
  onClear,
  running,
  progress,
}: BatchQueueProps): JSX.Element {
  if (order.length === 0) {
    return (
      <div className="batch-queue">
        <NonIdealState
          icon="box"
          title="묶음 큐가 비어 있음"
          description="좌측 카탈로그에서 체크박스로 ATC 를 추가하면 여기에 표시됩니다."
        />
      </div>
    );
  }

  const doneCount = progress?.filter(
    (p) => p.status === 'done' || p.status === 'failed',
  ).length ?? 0;
  const progressLabel =
    progress !== undefined && progress.length > 0
      ? `${doneCount}/${progress.length}`
      : `${order.length}`;

  return (
    <div className="batch-queue">
      <header className="batch-queue__header">
        <span className="batch-queue__title">
          묶음 실행 큐 <Tag minimal>{progressLabel}</Tag>
        </span>
        <Button
          intent="primary"
          icon="play"
          onClick={onRunAll}
          disabled={running}
          loading={running}
          title="이 순서대로 순차 실행 (실행 모드는 LNB 설정에서)"
        >
          {running ? '실행 중…' : '전체 실행'}
        </Button>
        <Button
          icon="trash"
          onClick={onClear}
          disabled={running}
          title="큐 비우기"
          minimal
        >
          비우기
        </Button>
      </header>

      <ol className="batch-queue__list">
        {order.map((atcPath, idx) => {
          const item = catalog.find((c) => c.atcPath === atcPath);
          const label = item !== undefined ? titleOf(item) : atcPath;
          const domain = item?.domain ?? '?';
          const atTop = idx === 0;
          const atBottom = idx === order.length - 1;
          const status: BatchItemStatus =
            progress?.find((p) => p.atcPath === atcPath)?.status ?? 'pending';
          const rowClass = `batch-queue__row batch-queue__row--${status}`;
          return (
            <li key={atcPath} className={rowClass}>
              <span
                className={`batch-queue__status batch-queue__status--${status}`}
                title={STATUS_LABEL[status]}
                aria-label={STATUS_LABEL[status]}
              >
                {status === 'running' ? (
                  <Spinner size={SpinnerSize.SMALL} intent="primary" />
                ) : (
                  <Icon icon={STATUS_ICON[status]} intent={STATUS_INTENT[status]} />
                )}
              </span>
              <Tag minimal round className="batch-queue__index">
                {idx + 1}
              </Tag>
              <span className="batch-queue__row-main">
                <Tag minimal className="batch-queue__row-domain">
                  {domain}
                </Tag>
                <span className="batch-queue__row-title" title={atcPath}>
                  {label}
                </span>
              </span>
              <ButtonGroup className="batch-queue__row-actions" minimal>
                <Button
                  small
                  icon="arrow-up"
                  aria-label="위로"
                  title="위로"
                  disabled={running || atTop}
                  onClick={(): void => onMove(atcPath, 'up')}
                />
                <Button
                  small
                  icon="arrow-down"
                  aria-label="아래로"
                  title="아래로"
                  disabled={running || atBottom}
                  onClick={(): void => onMove(atcPath, 'down')}
                />
                <Button
                  small
                  icon="cross"
                  intent="danger"
                  aria-label="제거"
                  title="이 항목만 큐에서 제거"
                  disabled={running}
                  onClick={(): void => onRemove(atcPath)}
                />
              </ButtonGroup>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
