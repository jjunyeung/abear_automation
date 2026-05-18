/**
 * RunView — 실행 중/완료된 TC 들을 Blueprint Section 그룹으로 표시.
 *
 * 단일 실행 = 1개 그룹 (auto-expanded), 묶음 실행 = 다중 그룹.
 * 각 그룹 헤더에 TC 제목 + 진행/완료/실패 배지, content 에 step 카드 리스트.
 *
 * Fulfills:
 *   R-B3.2 — step status + log lines surfaced in real time
 *   R-U6.1 — cards appear in execution order as runner emits step-start lines
 *   R-U6.2/3/4 — StepCard 가 카드별 로직 보유
 *   R-U7.1 — 📸 markers → ScreenshotThumb
 *
 * 데이터 스트림은 useRunStream 훅에 추출 — 그룹 컴포넌트가 큐별로 구독.
 *
 * INV-3 / INV-4: hook 안에서만 window.atcAPI 사용.
 */

import {
  Button,
  Icon,
  Section,
  SectionCard,
  Spinner,
  Tag,
} from '@blueprintjs/core';
import { type JSX } from 'react';
import type { CatalogItem } from '../../../shared/ipc';
import { useRunStream } from '../hooks/useRunStream';
import './RunView.css';
import { ScreenshotThumb } from './ScreenshotThumb';
import { StepCard } from './StepCard';

interface RunViewProps {
  /**
   * 활성 큐 식별자 목록. 단일 실행은 길이 1, 묶음은 N.
   * 비어있으면 placeholder 렌더.
   */
  queueIds: readonly string[];
  /** queueId → 표시용 ATC 라벨/카탈로그 항목 (제목 추출용). */
  catalog: readonly CatalogItem[];
  /** queueId → atcPath 매핑 (어느 TC 가 어느 queueId 인지). */
  queueIdToAtcPath: Readonly<Record<string, string>>;
}

function titleOfPath(catalog: readonly CatalogItem[], atcPath: string): string {
  const item = catalog.find((c) => c.atcPath === atcPath);
  if (item === undefined) return atcPath;
  if (
    typeof item.atc === 'object' &&
    item.atc !== null &&
    'title' in item.atc &&
    typeof (item.atc as { title: unknown }).title === 'string'
  ) {
    return (item.atc as { title: string }).title;
  }
  return atcPath.split('/').pop() ?? atcPath;
}

export function RunView({
  queueIds,
  catalog,
  queueIdToAtcPath,
}: RunViewProps): JSX.Element {
  if (queueIds.length === 0) {
    return (
      <div className="run-view run-view--empty">
        <div className="run-view__empty-inner">
          <Icon icon="list-detail-view" size={32} intent="none" />
          <p>실행 시작 시 TC 와 step 이 여기 표시됩니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="run-view">
      {queueIds.map((queueId, idx) => {
        const atcPath = queueIdToAtcPath[queueId] ?? null;
        const title = atcPath !== null ? titleOfPath(catalog, atcPath) : queueId;
        return (
          <RunGroup
            key={queueId}
            queueId={queueId}
            index={idx + 1}
            title={title}
            atcPath={atcPath}
          />
        );
      })}
    </div>
  );
}

interface RunGroupProps {
  queueId: string;
  index: number;
  title: string;
  atcPath: string | null;
}

function RunGroup({
  queueId,
  index,
  title,
  atcPath,
}: RunGroupProps): JSX.Element {
  const { steps, done } = useRunStream(queueId);

  const status: 'running' | 'success' | 'failed' =
    done === null
      ? 'running'
      : done.exitCode === 0
        ? 'success'
        : 'failed';

  const passedCount = steps.filter(
    (s) => s.status === 'success' || s.status === 'recovered',
  ).length;
  const failedCount = steps.filter(
    (s) => s.status === 'failed' || s.status === 'unhandled',
  ).length;

  const handleViewReport = (): void => {
    if (done?.runId === null || done?.runId === undefined) return;
    window.dispatchEvent(
      new CustomEvent('atc:view-past-report', {
        detail: { runId: done.runId },
      }),
    );
  };

  const titleNode = (
    <div className="run-group__title">
      <Tag minimal className="run-group__index">
        #{index}
      </Tag>
      <div className="run-group__title-text">
        <div className="run-group__title-line">{title}</div>
        {atcPath !== null && (
          <div className="run-group__title-path">{atcPath}</div>
        )}
      </div>
    </div>
  );

  const rightNode = (
    <div className="run-group__right">
      <span className="run-group__stepcount">
        {passedCount}/{steps.length} step
        {failedCount > 0 ? ` · ${failedCount} fail` : ''}
      </span>
      <StatusTag status={status} exitCode={done?.exitCode} />
      {done !== null && done.runId !== null && (
        <Button
          icon="document-open"
          small
          minimal
          onClick={handleViewReport}
          title="리포트 탭으로 이동"
          text="리포트"
        />
      )}
    </div>
  );

  return (
    <Section
      collapsible
      compact
      title={titleNode}
      rightElement={rightNode}
      className="run-group"
    >
      <SectionCard padded>
        {steps.length === 0 ? (
          <p className="run-group__empty">runner 출력을 기다리는 중…</p>
        ) : (
          <ol className="run-group__steps">
            {steps.map((s, i) => (
              <li key={`${s.id}-${i}`}>
                <StepCard
                  step={s}
                  renderScreenshot={(absPath): JSX.Element => (
                    <ScreenshotThumb key={absPath} absPath={absPath} />
                  )}
                />
              </li>
            ))}
          </ol>
        )}
      </SectionCard>
    </Section>
  );
}

interface StatusTagProps {
  status: 'running' | 'success' | 'failed';
  exitCode: number | undefined;
}
function StatusTag({ status, exitCode }: StatusTagProps): JSX.Element {
  if (status === 'running') {
    return (
      <Tag intent="primary" minimal icon={<Spinner size={12} intent="primary" />}>
        진행 중
      </Tag>
    );
  }
  if (status === 'success') {
    return (
      <Tag intent="success" icon="tick-circle" minimal>
        완료
      </Tag>
    );
  }
  return (
    <Tag intent="danger" icon="cross-circle" minimal>
      실패{exitCode !== undefined ? ` (exit ${exitCode})` : ''}
    </Tag>
  );
}
