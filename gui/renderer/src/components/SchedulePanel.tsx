/**
 * SchedulePanel — 스케줄 목록 + 생성/삭제 + 스킵 알림.
 *
 * Fulfills (renderer half):
 *   R-B5.1   — 사용자가 GUI 안에서 스케줄을 정의·관리
 *   R-T4.3   — 삭제는 schedule:delete 로 launchctl unload + plist 정리 + json 동기화
 *   R-T8.1   — 목록은 schedule:list 로 schedules.json 에서 읽음
 *   R-B6.8   — 락 충돌로 인한 launchd 스킵 이벤트 (schedule:skipped) 를 배너로 표시
 *
 * INV-3: gui/shared + npm 의존성만.
 * INV-4: window.atcAPI.scheduleList/scheduleDelete/onScheduleSkipped 만.
 */

import {
  Button,
  ButtonGroup,
  Callout,
  Card,
  Elevation,
  H4,
  NonIdealState,
  Spinner,
  Tag,
} from '@blueprintjs/core';
import {
  useCallback,
  useEffect,
  useState,
  type JSX,
} from 'react';
import type {
  CatalogItem,
  ScheduleDef,
  ScheduleRunEntry,
  ScheduleSkippedEvent,
} from '../../../shared/ipc';
import { ScheduleDialog } from './ScheduleDialog';

export interface SchedulePanelProps {
  catalog: readonly CatalogItem[];
  /** 카드의 "리포트 보기" 클릭 시 호출 — 부모가 Live/Report zone 으로 전환 + currentRunId / batchRunIds 세팅. */
  onViewReport: (runIds: readonly string[]) => void;
}

const WEEKDAY_KO: Record<number, string> = {
  0: '일',
  1: '월',
  2: '화',
  3: '수',
  4: '목',
  5: '금',
  6: '토',
  7: '일', // launchd 는 0/7 둘 다 일요일로 본다
};

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function formatSchedule(def: ScheduleDef): string {
  if (def.kind === 'recurring') {
    const ci = def.calendarInterval;
    if (!ci) return '매일 ??:??';
    const t = `${pad2(ci.Hour)}:${pad2(ci.Minute)}`;
    if (typeof ci.Weekday === 'number') {
      return `매주 ${WEEKDAY_KO[ci.Weekday] ?? '?'}요일 ${t}`;
    }
    if (typeof ci.Day === 'number') {
      return `매월 ${ci.Day}일 ${t}`;
    }
    return `매일 ${t}`;
  }
  if (def.runAtEpochMs === null) return '단발 ??';
  const d = new Date(def.runAtEpochMs);
  return `단발 ${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function atcTitleFromCatalog(
  catalog: readonly CatalogItem[],
  atcPath: string,
): string {
  const item = catalog.find((c) => c.atcPath === atcPath);
  if (!item) return atcPath;
  if (typeof item.atc === 'object' && item.atc !== null && 'title' in item.atc) {
    const t = (item.atc as { title?: unknown }).title;
    if (typeof t === 'string' && t !== '') return t;
  }
  return atcPath.split('/').pop() ?? atcPath;
}

export function SchedulePanel({ catalog, onViewReport }: SchedulePanelProps): JSX.Element {
  const [schedules, setSchedules] = useState<ScheduleDef[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  /** 수정 중인 스케줄. null 이면 create 모드 (dialogOpen 과 별개로 평소엔 null). */
  const [editTarget, setEditTarget] = useState<ScheduleDef | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [recentSkip, setRecentSkip] = useState<ScheduleSkippedEvent | null>(null);
  /** atc-multi 가 reports/schedule-runs.json 에 append 한 fire log — schedule.id 별로 group. */
  const [runs, setRuns] = useState<ScheduleRunEntry[]>([]);

  const reload = useCallback(async (): Promise<void> => {
    try {
      const list = await window.atcAPI.scheduleList();
      setSchedules(list);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const reloadRuns = useCallback(async (): Promise<void> => {
    try {
      const list = await window.atcAPI.scheduleRuns();
      setRuns(list);
    } catch {
      // schedule-runs.json 이 없는 첫 진입 시 정상 — silent.
    }
  }, []);

  useEffect(() => {
    void reload();
    void reloadRuns();
  }, [reload, reloadRuns]);

  // R-B6.8 — launchd 발화가 lock 충돌로 스킵되면 메인이 push.
  useEffect(() => {
    const unsubscribe = window.atcAPI.onScheduleSkipped((event) => {
      setRecentSkip(event);
    });
    return (): void => {
      unsubscribe();
    };
  }, []);

  // schedule fire 완료마다 push — 카드의 "최근 실행" 섹션이 즉시 업데이트.
  useEffect(() => {
    const unsubscribe = window.atcAPI.onScheduleRunsUpdated((entries) => {
      setRuns(entries);
    });
    return (): void => {
      unsubscribe();
    };
  }, []);

  // schedule.id 별 최근 5개 entry (가장 최근이 위).
  const runsByScheduleId = (id: string): ScheduleRunEntry[] => {
    return runs
      .filter((e) => e.scheduleId === id)
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
      .slice(0, 5);
  };

  const handleDelete = useCallback(
    async (id: string): Promise<void> => {
      setDeletingId(id);
      try {
        await window.atcAPI.scheduleDelete({ id });
        await reload();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setDeletingId(null);
      }
    },
    [reload],
  );

  return (
    <section className="schedule-panel">
      <header className="schedule-panel__header">
        <H4 style={{ margin: 0 }}>스케줄</H4>
        <ButtonGroup>
          <Button
            icon="refresh"
            minimal
            small
            onClick={(): void => {
              void reload();
            }}
            disabled={loading}
            title="목록 새로고침"
          />
          <Button
            icon="plus"
            intent="primary"
            onClick={(): void => {
              setEditTarget(null);
              setDialogOpen(true);
            }}
            disabled={catalog.length === 0}
            title={catalog.length === 0 ? '카탈로그가 비어 스케줄을 만들 수 없습니다' : '새 스케줄 만들기'}
          >
            새 스케줄
          </Button>
        </ButtonGroup>
      </header>

      {recentSkip !== null && (
        <Callout
          intent="warning"
          icon="time"
          title="최근 스케줄이 실행 충돌로 스킵되었습니다"
          style={{ marginBottom: 12 }}
        >
          <p style={{ margin: 0 }}>
            <strong>{recentSkip.atcTitle}</strong> —{' '}
            {new Date(recentSkip.skippedAt).toLocaleString()} 에 발화 시점에 다른
            ATC 가 실행 중이라 건너뛰었습니다.
          </p>
          <Button
            small
            minimal
            onClick={(): void => setRecentSkip(null)}
            style={{ marginTop: 8 }}
          >
            확인
          </Button>
        </Callout>
      )}

      {error !== null && (
        <Callout intent="danger" icon="error" title="에러" style={{ marginBottom: 12 }}>
          {error}
        </Callout>
      )}

      {loading ? (
        <div className="schedule-panel__loading">
          <Spinner size={32} />
        </div>
      ) : schedules.length === 0 ? (
        <NonIdealState
          icon="calendar"
          title="등록된 스케줄이 없습니다"
          description="우측 상단의 '새 스케줄' 을 눌러 ATC 를 예약하세요. GUI 가 꺼져 있어도 macOS launchd 가 정해진 시간에 실행합니다."
        />
      ) : (
        <div className="schedule-panel__list">
          {schedules.map((s) => {
            const paths = s.atcPaths && s.atcPaths.length > 0
              ? s.atcPaths
              : [s.atcPath];
            const isMulti = paths.length >= 2;
            return (
              <Card
                key={s.id}
                elevation={Elevation.ONE}
                className="schedule-panel__card"
              >
                <div className="schedule-panel__card-head">
                  <div className="schedule-panel__card-title">
                    {isMulti ? (
                      <>
                        <Tag minimal intent="primary" icon="layers">
                          묶음 {paths.length}개
                        </Tag>
                        <strong>
                          {atcTitleFromCatalog(catalog, paths[0]!)} 외{' '}
                          {paths.length - 1}건
                        </strong>
                      </>
                    ) : (
                      <>
                        <Tag minimal intent="none">
                          {s.domain}
                        </Tag>
                        <strong>{atcTitleFromCatalog(catalog, paths[0]!)}</strong>
                      </>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Button
                      icon="edit"
                      minimal
                      small
                      onClick={(): void => {
                        setEditTarget(s);
                        setDialogOpen(true);
                      }}
                      title="이 스케줄 수정"
                      disabled={deletingId === s.id}
                    />
                    <Button
                      icon="trash"
                      minimal
                      intent="danger"
                      small
                      loading={deletingId === s.id}
                      onClick={(): void => {
                        void handleDelete(s.id);
                      }}
                      title="이 스케줄 삭제"
                    />
                  </div>
                </div>
                <div className="schedule-panel__card-meta">
                  <Tag
                    minimal
                    intent={s.kind === 'recurring' ? 'primary' : 'success'}
                    icon={s.kind === 'recurring' ? 'repeat' : 'time'}
                  >
                    {formatSchedule(s)}
                  </Tag>
                  {!s.active && (
                    <Tag minimal intent="warning">
                      비활성 (만료)
                    </Tag>
                  )}
                  {s.headless === true && (
                    <Tag minimal icon="eye-off">
                      Headless
                    </Tag>
                  )}
                </div>
                {isMulti && (
                  <details className="schedule-panel__card-inputs">
                    <summary>포함된 ATC ({paths.length})</summary>
                    <ol style={{ paddingLeft: 18, margin: '4px 0 0 0' }}>
                      {paths.map((p) => {
                        const perInputs = s.perAtcInputs?.[p] ?? {};
                        const entries = Object.entries(perInputs);
                        return (
                          <li key={p} style={{ marginBottom: 4 }}>
                            <code>{atcTitleFromCatalog(catalog, p)}</code>
                            {entries.length > 0 && (
                              <span className="bp5-text-muted" style={{ marginLeft: 6 }}>
                                ({entries.map(([k, v]) => `${k}=${v}`).join(', ')})
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  </details>
                )}
                {!isMulti && Object.entries(s.inputs).length > 0 && (
                  <details className="schedule-panel__card-inputs">
                    <summary>입력값 ({Object.entries(s.inputs).length})</summary>
                    <ul>
                      {Object.entries(s.inputs).map(([k, v]) => (
                        <li key={k}>
                          <code>{k}</code> = <code>{v}</code>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
                {/* 최근 실행 — atc-multi 가 reports/schedule-runs.json 에 append 한 fire log 중 이 schedule.id 만 */}
                {(() => {
                  const entries = runsByScheduleId(s.id);
                  if (entries.length === 0) return null;
                  return (
                    <details className="schedule-panel__card-inputs" open>
                      <summary>최근 실행 ({entries.length})</summary>
                      <ul style={{ paddingLeft: 0, listStyle: 'none', margin: '6px 0 0 0' }}>
                        {entries.map((e) => {
                          const completed = new Date(e.completedAt);
                          const okCount = e.runs.filter(
                            (r) => r.exitCode === 0,
                          ).length;
                          const runIds = e.runs
                            .map((r) => r.runId)
                            .filter((rid): rid is string => rid !== null);
                          const intent = e.overall === 'success' ? 'success' : 'danger';
                          return (
                            <li
                              key={`${e.scheduleId}-${e.completedAt}`}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '4px 0',
                              }}
                            >
                              <Tag minimal intent={intent}>
                                {e.overall === 'success'
                                  ? '성공'
                                  : `${okCount}/${e.runs.length} 성공`}
                              </Tag>
                              <span className="bp5-text-muted" style={{ fontSize: 12 }}>
                                {completed.toLocaleString()}
                              </span>
                              <span style={{ flex: 1 }} />
                              <Button
                                icon="document-open"
                                small
                                minimal
                                disabled={runIds.length === 0}
                                onClick={(): void => onViewReport(runIds)}
                                title={
                                  runIds.length === 0
                                    ? '리포트 파일이 없습니다 (ATC 가 시작 전에 실패)'
                                    : `리포트 보기 (${runIds.length}건)`
                                }
                              >
                                리포트
                              </Button>
                            </li>
                          );
                        })}
                      </ul>
                    </details>
                  );
                })()}
              </Card>
            );
          })}
        </div>
      )}

      <ScheduleDialog
        isOpen={dialogOpen}
        onClose={(): void => {
          setDialogOpen(false);
          setEditTarget(null);
        }}
        onSaved={(): void => {
          void reload();
        }}
        catalog={catalog}
        editSchedule={editTarget}
      />
    </section>
  );
}
