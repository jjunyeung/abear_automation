/**
 * Renderer entry point — mounts the App tree.
 *
 * Layout integration for tasks T6 (InputForm), T9 (CatalogPanel), T10 (RunView),
 * T11 (screenshot thumbnails via RunView), T12 (ReportPanel), T13 (keyboard
 * shortcuts), T14 (SecondInstanceToast), T18 (CloseConfirmDialog).
 * The command palette (T13.4/T13.5) is still stubbed; later tasks populate
 * that slot without touching this file.
 *
 * Fulfills (renderer side):
 *   T6:  R-B2.2, R-B6.5, R-U1.2, R-U2.1, R-U2.2
 *   T9:  R-U5.1-R-U5.6 (status indicators rendered inside CatalogPanel)
 *   T10: R-B3.2, R-U6.1, R-U6.2, R-U6.3, R-U6.4
 *   T11: R-U7.1, R-U7.2 (thumbnails + lightbox — wired through RunView)
 *   T12: R-B3.3, R-U8.1, R-U8.2, R-U8.3, R-T13.2
 *   T13: R-U9.1, R-U9.2 (Cmd+Enter / Cmd+/ → focus); R-U9.3-5 surface via hook
 *   T14: R-U10.2, R-U10.3
 *   T18: R-B6.3, R-B6.4 surface, R-T18.1, R-T18.2, R-T18.3 surface (renderer half)
 *
 * T19 — happy path trace (catalog → form → Run; verification only, no behavior change):
 *   R-B1.1 (3-click rule):
 *     click#1 = CatalogPanel item button (CatalogPanel.tsx:249 onClick → onSelect)
 *              → setSelectedAtcPath here (main.tsx:200) → InputForm mounts (main.tsx:211).
 *     click#2 = focus input field (only when atc.inputs is non-empty;
 *              InputForm.tsx:126); for no-input ATCs this click is skipped.
 *     click#3 = Run button submit (InputForm.tsx:149) → handleRunSubmit (main.tsx:92)
 *              → window.atcAPI.atcRun (main.tsx:98) → enqueueRun.
 *     no-input ATC = 2 clicks total; single-input ATC = 3 clicks total — both ≤ 3.
 *
 *   R-U2.3 (Cmd+Enter from anywhere in the right panel):
 *     useKeyboardShortcuts (hooks/useKeyboardShortcuts.ts:89) attaches its
 *     keydown listener at the window level — Cmd+Enter fires regardless of
 *     which descendant of the right panel currently holds focus. The handler
 *     calls onRunShortcut (main.tsx:136) which uses form.requestSubmit() to
 *     drive the same submit pipeline as the Run button, so the same preflight
 *     gate (R-B3.1) applies.
 *
 *   R-B3.1 (pre-run validation gates spawn):
 *     atc:run IPC handler (gui/main/ipc-scaffold.ts:105) calls enqueueRun,
 *     which awaits runPreflight() BEFORE pending.push/startNext
 *     (gui/main/run-queue.ts:270-273). On {ok:false}, control returns with
 *     errors and no child_process.spawn is invoked. The renderer surfaces the
 *     first error inline at main.tsx:110-118 without flipping to the live tab.
 *
 * INV-3: imports only from `./components/*`, `./hooks/*`, `../../shared/*`, and npm deps.
 * INV-4: no fetch/HTTP — all main-process interaction via window.atcAPI (IPC).
 * R-T1.3: strict TS, no `any`.
 */

import { Button as BpButton, FocusStyleManager, Icon, Tab, Tabs } from '@blueprintjs/core';
import type { IconName } from '@blueprintjs/icons';
import {
  CalendarClock,
  ListTree,
  Link as LinkIcon,
  Settings as SettingsIcon,
  type LucideIcon,
} from 'lucide-react';
import {
  StrictMode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
} from 'react';
import { createRoot } from 'react-dom/client';
import type { CatalogItem } from '../../shared/ipc';
import { BatchPreview } from './components/BatchPreview';
import { CatalogPanel } from './components/CatalogPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CloseConfirmDialog } from './components/CloseConfirmDialog';
import { InputForm } from './components/InputForm';
import { QueueView } from './components/QueueView';
import { ReportPanel } from './components/ReportPanel';
import { RunView } from './components/RunView';
import { ScheduleDialog } from './components/ScheduleDialog';
import { SchedulePanel } from './components/SchedulePanel';
import { SecondInstanceToast } from './components/SecondInstanceToast';
import { SettingsPanel } from './components/SettingsPanel';
import { UrlPoolPanel } from './components/UrlPoolPanel';
import { ErrorToast } from './components/ErrorToast';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import './main.css';

// Blueprint UX 권장 — 마우스 사용 시 focus outline 숨김 (키보드 사용 시만 표시).
FocusStyleManager.onlyShowFocusOnTabs();

type RightTab = 'live' | 'report';
type CenterView = 'edit' | 'queue';
type FocusZone = 'catalog' | 'queue' | 'live' | 'schedule' | 'url-pool' | 'settings';

export type BatchItemStatus = 'pending' | 'running' | 'done' | 'failed';
export interface BatchItemProgress {
  readonly atcPath: string;
  readonly status: BatchItemStatus;
  readonly runId: string | null;
  readonly queueId: string | null;
}

/**
 * LNB 항목 — 카탈로그(=focus zone 'catalog') 와 설정(=focus zone 'settings').
 * Settings 는 더 이상 사이드바 패널이 아니라 가운데 풀화면 view.
 */
interface LnbItem {
  zone: FocusZone;
  icon: LucideIcon;
  label: string;
}
const LNB_ITEMS_TOP: readonly LnbItem[] = [
  { zone: 'catalog', icon: ListTree, label: '자동화' },
  { zone: 'schedule', icon: CalendarClock, label: '스케줄' },
  { zone: 'url-pool', icon: LinkIcon, label: 'URL 풀' },
];
const LNB_ITEMS_BOTTOM: readonly LnbItem[] = [
  { zone: 'settings', icon: SettingsIcon, label: '설정' },
];

/**
 * GNB 항목 — 자동화 워크플로 단계 (카탈로그 → 실행 대기 → Live/Report).
 * LNB 의 '자동화' 안에서만 의미가 있고, 각 버튼이 그 화면으로 직접 이동.
 * 실행 대기 버튼은 batchOrder 가 비어 있으면 disabled.
 */
type WorkflowZone = 'catalog' | 'queue' | 'live';
interface GnbItem {
  zone: WorkflowZone;
  label: string;
  icon: IconName;
}
const GNB_ITEMS: readonly GnbItem[] = [
  { zone: 'catalog', label: '카탈로그', icon: 'list-detail-view' },
  { zone: 'queue', label: '실행 대기', icon: 'time' },
  { zone: 'live', label: 'Live / Report', icon: 'pulse' },
];

function App(): JSX.Element {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [selectedAtcPath, setSelectedAtcPath] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<RightTab>('live');
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [runDispatching, setRunDispatching] = useState<boolean>(false);
  // 진행 중 또는 누적 완료된 모든 큐의 id 목록. 단일 실행 = 길이 1, 묶음 =
  // 묶음 시작 시 [] 에서 한 칸씩 push. RunView 는 이걸 받아 각 큐 segment 를
  // 누적 표시한다 (이전 큐의 step 들이 사라지지 않음).
  const [activeQueueIds, setActiveQueueIds] = useState<readonly string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  // 사이드바 카탈로그 패널 폭 (px). 드래그 핸들로 200~800 조절.
  const [catalogWidth, setCatalogWidth] = useState<number>(610);
  // Ref to the catalog search input (R-U9.2). The catalog panel itself is a T9
  // stub right now, but the ref is wired so the shortcut works as soon as T9
  // ships its search input via a forwarded ref.
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Batch multi-select state — set of atcPaths the user has ticked in CatalogPanel.
  // Sequential execution piggybacks on the existing run-queue: we call atcRun
  // for each in order; the main process serializes them per R-B6.1/R-B6.2.
  // Ordered batch queue. We store an array (not a Set) so the user can reorder.
  // batchSet is a derived view for O(1) membership checks in CatalogPanel.
  const [batchOrder, setBatchOrder] = useState<string[]>([]);
  const [batchRunning, setBatchRunning] = useState<boolean>(false);
  // 묶음 행별 진행 상태. handleRunBatch 가 초기화하고, onRunHistoryUpdated 가
  // 진행 상태를 한 칸씩 전진시킨다. BatchQueue 가 행 표시에 사용.
  const [batchProgress, setBatchProgress] = useState<readonly BatchItemProgress[]>([]);
  // 묶음 동안 누적된 runId 들 — 묶음이 끝나면 ReportPanel 이 이것들을 한
  // 화면에 묶어 보여준다. 비-배치 단일 실행에는 currentRunId 만 쓴다.
  const [batchRunIds, setBatchRunIds] = useState<readonly string[]>([]);
  // 단일 실행/묶음 실행 모두 공유하는 실행 모드. 기본 = headed (D7: 윈들리
  // 확장 정상 동작 보장). 사용자가 의도적으로 headless 토글 → wrapper 가
  // WINDLY_HEADLESS=1 로 export → fixture 가 launchPersistentContext({
  // headless: true }) 로 띄움. 확장 의존 ATC 는 실패할 수 있다 (경고는
  // fixture 가 stderr 로).
  const [headless, setHeadless] = useState<boolean>(false);
  // 큐 뷰로 전환 (실행 대기 화면). 카탈로그 bulk action 에서 진입.
  const [centerView, setCenterView] = useState<CenterView>('edit');
  // 큐 뷰에서 사용자가 채우는 per-TC 입력값. atcPath → name → value.
  // handleRunBatch 가 spawn 시 inputs 로 전달.
  const [batchInputs, setBatchInputs] = useState<
    Record<string, Record<string, string>>
  >({});
  // queueId → atcPath. RunView 가 큐 그룹의 TC 제목을 표시할 때 lookup.
  const [queueIdToAtcPath, setQueueIdToAtcPath] = useState<
    Record<string, string>
  >({});
  // 사용자가 명시적으로 어느 섹션을 보고 싶다고 클릭했을 때 우선되는 override.
  // 자동 focus 가 변경될 때마다 reset.
  const [focusOverride, setFocusOverride] = useState<FocusZone | null>(null);
  // InputForm 의 "예약" 버튼 또는 BatchPreview 의 "예약" 버튼에서 띄우는
  // ScheduleDialog 상태. 단일 진입은 atcPaths.length=1, 다중 진입은 N.
  // 저장 성공 시 SchedulePanel 화면으로 점프해 결과 확인 (focusOverride='schedule').
  const [quickScheduleSeed, setQuickScheduleSeed] = useState<{
    atcPaths: string[];
    perAtcInputs: Record<string, Record<string, string>>;
  } | null>(null);
  // Report 화면 진입 출처. 스케줄에서 "리포트 보기" 로 진입한 경우만 'schedule'.
  // 자동 진입 (실행 종료 후) / 카탈로그 히스토리 등에서는 null — ReportPanel 에
  // 뒤로가기 버튼 미표시. focus 가 'live' 가 아니게 되면 자동 reset.
  const [reportBackTarget, setReportBackTarget] = useState<FocusZone | null>(null);
  const batchRunningRef = useRef<boolean>(false);
  const pendingHistoryQueueIdsRef = useRef<string[]>([]);
  const currentQueueId =
    batchProgress.find((p) => p.status === 'running')?.queueId ??
    activeQueueIds[activeQueueIds.length - 1] ??
    null;
  const batchSet = useMemo<ReadonlySet<string>>(
    () => new Set(batchOrder),
    [batchOrder],
  );

  // LNB 클릭 — focus zone 으로 직행. catalog 누르면 사이드바 펼쳐짐,
  // settings 누르면 가운데가 settings 화면으로 전환.
  const handleLnbClick = useCallback((zone: FocusZone): void => {
    setFocusOverride(zone);
  }, []);

  // 카탈로그 패널 폭 드래그.
  const handleResizeStart = useCallback(
    (startX: number, startW: number): void => {
      const onMove = (e: MouseEvent): void => {
        const next = Math.max(200, Math.min(800, startW + (e.clientX - startX)));
        setCatalogWidth(next);
      };
      const onUp = (): void => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    },
    [],
  );

  // 카탈로그 행 체크박스 토글. 별도 BatchQueue 패널은 없어졌으므로 패널
  // 자동 오픈 로직도 사라짐 (선택은 카탈로그 안 bulk-actions 바로 보인다).
  const handleToggleBatch = useCallback((atcPath: string): void => {
    setBatchOrder((prev) => {
      const next = prev.includes(atcPath)
        ? prev.filter((p) => p !== atcPath)
        : [...prev, atcPath];
      // 체크 모드로 진입할 때 단일 선택(description) 뷰를 닫는다 —
      // 우선순위: batch list > InputForm > empty view.
      if (next.length > 0) setSelectedAtcPath(null);
      return next;
    });
  }, []);

  const handleClearBatch = useCallback((): void => {
    setBatchOrder([]);
    setBatchInputs({});
  }, []);

  const handleSendToQueue = useCallback((): void => {
    if (batchOrder.length === 0) return;
    setCenterView('queue');
    // focusOverride 가 'catalog' 로 남아 있어도 명시적으로 queue 로 점프.
    setFocusOverride('queue');
  }, [batchOrder.length]);

  const handleQueueInputChange = useCallback(
    (atcPath: string, name: string, value: string): void => {
      setBatchInputs((prev) => ({
        ...prev,
        [atcPath]: { ...(prev[atcPath] ?? {}), [name]: value },
      }));
    },
    [],
  );

  const handleQueueRemove = useCallback((atcPath: string): void => {
    setBatchOrder((prev) => prev.filter((p) => p !== atcPath));
    setBatchInputs((prev) => {
      const next = { ...prev };
      delete next[atcPath];
      return next;
    });
  }, []);

  const handleQueueCancel = useCallback((): void => {
    setCenterView('edit');
    // focusOverride 가 'queue' 로 남아 있으면 focus=focusOverride 라 큐 뷰에
    // 그대로 머무름. 명시적으로 catalog 로 강제.
    setFocusOverride('catalog');
  }, []);

  // Live/Report 양쪽 누적된 실행 기록 일괄 초기화. 진행 중에는 차단.
  const handleClearRunRecords = useCallback((): void => {
    if (batchRunning || runDispatching) return;
    setActiveQueueIds([]);
    setQueueIdToAtcPath({});
    setBatchProgress([]);
    setBatchRunIds([]);
    setCurrentRunId(null);
    pendingHistoryQueueIdsRef.current = [];
    setRightTab('live');
  }, [batchRunning, runDispatching]);

  // ── Focus 자동 도출 ──
  // 1) 활성 큐가 있으면 Live 가 우선 (사용자는 진행을 보고 싶어함)
  // 2) view='queue' 면 Queue 가 우선
  // 3) 그 외는 Catalog
  const autoFocus: FocusZone =
    activeQueueIds.length > 0
      ? 'live'
      : centerView === 'queue'
        ? 'queue'
        : 'catalog';
  // 자동 focus 가 바뀔 때마다 사용자 override 초기화 (새 단계가 시작되면 그쪽으로 강제 점프).
  useEffect(() => {
    setFocusOverride(null);
  }, [autoFocus]);
  const focus: FocusZone = focusOverride ?? autoFocus;

  // Report toolbar 의 "← 스케줄로" 는 Live/Report zone 에 있을 때만 의미 있음.
  // 사용자가 LNB 로 다른 zone 가면 stale 안 남기게 reset.
  useEffect(() => {
    if (focus !== 'live') setReportBackTarget(null);
  }, [focus]);

  const handleRunBatch = useCallback(async (): Promise<void> => {
    if (batchOrder.length === 0) return;
    // 같은 batch 안의 TC 들끼리만 outputs → inputs.from='previous' 자동 주입을
    // 묶는 id. 매 "전체 실행" 마다 새로 생성 — main 의 run-queue 가 같은 id 들을
    // 한 pool 로 인식 (gui/main/run-queue.ts 의 batchOutputs).
    const batchSessionId = `batch-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    // Race 방지: ref 를 setState 보다 먼저 직접 갱신해서 onRunHistoryUpdated
    // 가 첫 entry 도착 시점에 무조건 batch 분기를 타도록.
    batchRunningRef.current = true;
    setBatchRunning(true);
    setRunError(null);
    // 시작 전에 Live 로 전환 — 도는 동안 step 카드가 바로 보이게.
    setRightTab('live');
    // 행별 진행 상태 초기화: 첫 행 = running, 나머지 = pending.
    // onRunHistoryUpdated 가 한 칸씩 done 으로 밀어준다.
    setBatchProgress(
      batchOrder.map((p, i) => ({
        atcPath: p,
        status: i === 0 ? 'running' : 'pending',
        runId: null,
        queueId: null,
      })),
    );
    setBatchRunIds([]);
    pendingHistoryQueueIdsRef.current = [];
    // 묶음 시작 — RunView segments 도 초기화. 매 ATC 마다 push.
    setActiveQueueIds([]);
    // queueId → atcPath 매핑도 새로 시작 (Live RunView 가 라벨 lookup 에 사용).
    setQueueIdToAtcPath({});
    // 묶음 도중에는 currentRunId 도 클리어 (Report 가 묶음 끝까지 안 켜지게).
    setCurrentRunId(null);
    // 큐 뷰 → Live 자동 전환 (사용자가 Live 탭에서 확인하도록).
    setCenterView('edit');
    setRightTab('live');
    try {
      for (let index = 0; index < batchOrder.length; index += 1) {
        const atcPath = batchOrder[index]!;
        const item = catalog.find((c) => c.atcPath === atcPath);
        if (item === undefined) {
          setBatchProgress((prev) => {
            const next = prev.slice();
            const rowIdx = next.findIndex((p) => p.atcPath === atcPath);
            if (rowIdx < 0) return prev;
            next[rowIdx] = { ...next[rowIdx], status: 'failed' };
            if (rowIdx + 1 < next.length && next[rowIdx + 1].status === 'pending') {
              next[rowIdx + 1] = { ...next[rowIdx + 1], status: 'running' };
            }
            return next;
          });
          setRunError(`${atcPath}: catalog item missing`);
          continue;
        }
        try {
          const result = await window.atcAPI.atcRun({
            atcPath: item.atcPath,
            domain: item.domain,
            specPath: item.specPath,
            inputs: batchInputs[atcPath] ?? {},
            headless,
            batchSessionId,
          });
          if (result.ok) {
            // RunView 는 활성 큐 목록 전체를 보여준다.
            setActiveQueueIds((prev) => [...prev, result.queueId]);
            setQueueIdToAtcPath((prev) => ({
              ...prev,
              [result.queueId]: atcPath,
            }));
            setBatchProgress((prev) =>
              prev.map((p) =>
                p.atcPath === atcPath ? { ...p, queueId: result.queueId } : p,
              ),
            );
          } else {
            // Preflight 실패 — 해당 행을 failed 로 마킹하고 다음 pending 을 running 으로.
            setBatchProgress((prev) => {
              const next = prev.slice();
              const rowIdx = next.findIndex((p) => p.atcPath === atcPath);
              if (rowIdx < 0) return prev;
              next[rowIdx] = { ...next[rowIdx], status: 'failed' };
              if (rowIdx + 1 < next.length && next[rowIdx + 1].status === 'pending') {
                next[rowIdx + 1] = { ...next[rowIdx + 1], status: 'running' };
              }
              return next;
            });
            setRunError(
              `${item.atcPath}: ${result.errors.map((e) => e.code).join(', ')}`,
            );
          }
        } catch (err: unknown) {
          setRunError(
            `${item.atcPath}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    } catch (err: unknown) {
      setRunError(err instanceof Error ? err.message : String(err));
    }
  }, [batchOrder, batchInputs, catalog, headless]);

  // Initial catalog load + live updates (T9 owns the visual rendering; we just hold state).
  useEffect(() => {
    let cancelled = false;
    void window.atcAPI
      .catalogList()
      .then((items) => {
        if (cancelled) return;
        setCatalog(items);
      })
      .catch(() => {
        // Catalog loader failures are surfaced by T5/T9; we keep the renderer alive.
      });
    const unsubscribeCatalog = window.atcAPI.onCatalogUpdated((items) => {
      setCatalog(items);
    });
    return (): void => {
      cancelled = true;
      unsubscribeCatalog();
    };
  }, []);

  useEffect(() => {
    batchRunningRef.current = batchRunning;
  }, [batchRunning]);

  const completeKnownQueue = useCallback(
    (queueId: string, exitCode: number, runId: string | null): boolean => {
      let matchedBatch = false;
      setBatchProgress((prev) => {
        const rowIdx = prev.findIndex((p) => p.queueId === queueId);
        if (rowIdx < 0) return prev;
        matchedBatch = true;
        const next = prev.slice();
        next[rowIdx] = {
          ...next[rowIdx],
          status: exitCode === 0 ? 'done' : 'failed',
          runId,
        };
        const nextIdx = next.findIndex(
          (p, idx) => idx > rowIdx && p.status === 'pending',
        );
        if (nextIdx >= 0) {
          next[nextIdx] = { ...next[nextIdx], status: 'running' };
        }
        return next;
      });
      if (matchedBatch) {
        if (runId !== null) {
          setBatchRunIds((prev) => (prev.includes(runId) ? prev : [...prev, runId]));
          setCurrentRunId(runId);
        }
        return true;
      }
      if (currentQueueId === queueId) {
        if (runId !== null) {
          setCurrentRunId(runId);
          setRightTab('report');
        }
        setRunDispatching(false);
        return true;
      }
      return false;
    },
    [currentQueueId],
  );

  // Queue completion from main. Prefer queueId-bound completion; only fall back
  // to run-history when the main process could not resolve a report-backed runId.
  useEffect(() => {
    const unsubscribe = window.atcAPI.onAtcDone((event) => {
      if (event.runId !== null) {
        completeKnownQueue(event.queueId, event.exitCode, event.runId);
        return;
      }
      if (event.exitCode >= 0) {
        pendingHistoryQueueIdsRef.current = [
          ...pendingHistoryQueueIdsRef.current,
          event.queueId,
        ];
        return;
      }
      completeKnownQueue(event.queueId, event.exitCode, null);
      setRunDispatching(false);
    });
    return (): void => {
      unsubscribe();
    };
  }, [completeKnownQueue]);

  useEffect(() => {
    const unsubscribe = window.atcAPI.onRunHistoryUpdated((entry) => {
      const queueId = pendingHistoryQueueIdsRef.current.shift();
      if (queueId === undefined) {
        return;
      }
      completeKnownQueue(queueId, 0, entry.runId);
    });
    return (): void => {
      unsubscribe();
    };
  }, [completeKnownQueue]);

  // 묶음 종료 직후 자동으로 Report 탭으로 전환 — 누적된 runIds 가 있을 때만.
  // (실패만 잔뜩 났는데 runId 가 하나도 없으면 그냥 Live 유지.)
  useEffect(() => {
    if (!batchRunning) {
      if (batchRunIds.length > 0) {
        setRightTab('report');
      }
      return;
    }
    if (batchProgress.length === 0) return;
    if (batchProgress.some((p) => p.status === 'pending' || p.status === 'running')) return;
    setBatchRunning(false);
    batchRunningRef.current = false;
    setRunDispatching(false);
    // 묶음이 끝났으면 큐는 "소비됨" — 큐 rail 배지가 1 로 남아 있지 않게 비운다.
    setBatchOrder([]);
    setBatchInputs({});
  }, [batchProgress, batchRunIds, batchRunning]);

  const selectedAtc = catalog.find((c) => c.atcPath === selectedAtcPath) ?? null;

  const handleRunSubmit = useCallback(
    (inputs: Record<string, string>): void => {
      if (selectedAtc === null) return;
      setRunDispatching(true);
      setRunError(null);
      void window.atcAPI
        .atcRun({
          atcPath: selectedAtc.atcPath,
          domain: selectedAtc.domain,
          specPath: selectedAtc.specPath,
          inputs,
          headless,
        })
        .then((result) => {
          if (result.ok) {
            // 단일 실행 — segments / batch 잔재 클리어 후 단일 큐만.
            setActiveQueueIds([result.queueId]);
            setQueueIdToAtcPath({ [result.queueId]: selectedAtc.atcPath });
            pendingHistoryQueueIdsRef.current = [];
            setBatchRunIds([]);
            setBatchProgress([]);
            setRightTab('live');
          } else {
            // Preflight failure (R-U3.1/R-U3.2). Render the first error inline.
            const first = result.errors[0];
            const msg = first
              ? (first.code === 'ENV_FILE_MISSING'
                  ? `.env 파일이 없습니다 (${first.path})`
                  : first.code === 'VAR_MISSING'
                    ? `환경변수 누락: ${first.varName}`
                    : `경로 무효: ${first.varName} = ${first.resolvedPath}`)
              : '실행 사전 검증 실패';
            setRunError(msg);
            setRunDispatching(false);
          }
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          setRunError(`Run 실행 실패: ${msg}`);
          setRunDispatching(false);
        });
    },
    [selectedAtc, headless],
  );

  // R-U9.1 / R-U9.2 — global keyboard shortcuts wired to renderer actions.
  // The Run shortcut programmatically submits the form by collecting current
  // field values from the live DOM, since InputForm holds its own state.
  // This is a thin compatibility shim: T13.4 (palette) will replace this with
  // a proper imperative handle exposed by InputForm.
  const onRunShortcut = useCallback((): void => {
    if (selectedAtc === null || runDispatching) return;
    const form = document.querySelector<HTMLFormElement>('.atc-input-form');
    if (form === null) return;
    // requestSubmit triggers the native submit event so InputForm's existing
    // onSubmit pipeline runs (including R-B6.5 reset on next ATC selection).
    if (typeof form.requestSubmit === 'function') {
      form.requestSubmit();
    } else {
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
  }, [selectedAtc, runDispatching]);

  const onReloadShortcut = useCallback((): void => {
    void window.atcAPI.catalogReload().catch(() => {
      // Reload failures are surfaced via the catalog:updated push channel
      // (T5/T9 own error rendering); shortcut path is silent.
    });
  }, []);

  const onFocusSearchShortcut = useCallback((): void => {
    const el = searchInputRef.current;
    if (el !== null) {
      el.focus();
      el.select();
    }
  }, []);

  useKeyboardShortcuts({
    onRun: onRunShortcut,
    onReload: onReloadShortcut,
    onFocusSearch: onFocusSearchShortcut,
  });

  // R-U8.3: viewing past reports from the history list flows through this setter.
  // The future history panel (T15) will receive setCurrentRunId via props/context;
  // for now we expose it as a stable closure on a window-mounted helper so T15's
  // wiring is a one-line change.
  useEffect(() => {
    const handler = (event: Event): void => {
      const detail = (event as CustomEvent<{ runId: string }>).detail;
      if (typeof detail?.runId === 'string') {
        setCurrentRunId(detail.runId);
        setRightTab('report');
      }
    };
    window.addEventListener('atc:view-past-report', handler as EventListener);
    return (): void => {
      window.removeEventListener('atc:view-past-report', handler as EventListener);
    };
  }, []);

  // Focus 별 grid 분할 — GNB 도입 후 항상 LNB | 메인 컨텐츠 (2 cols).
  // GNB 는 row 1, 컨텐츠는 row 2. sidebar 는 두 row 모두 span.
  // 'catalog'  = LNB(+카탈로그 패널) | InputForm(또는 placeholder)
  // 'queue'    = LNB | QueueView
  // 'live'     = LNB | Live/Report (RunView + Tabs)
  // 'schedule' = LNB | SchedulePanel
  // 'settings' = LNB | SettingsPanel
  const gridCols = 'auto 1fr';
  const sidebarPanelsVisible = focus === 'catalog';
  const liveVisible = focus === 'live';
  const formVisible = !liveVisible;

  return (
    <div className="app-shell" style={{ gridTemplateColumns: gridCols }}>
      <SecondInstanceToast />
      <ErrorToast />

      <aside className="app-shell__sidebar">
        <nav className="app-shell__lnb" aria-label="LNB 메인 메뉴">
          {LNB_ITEMS_TOP.map(({ zone, icon: Icon, label }) => {
            const active = focus === zone;
            return (
              <button
                key={zone}
                type="button"
                className={
                  active
                    ? 'app-shell__lnb-item app-shell__lnb-item--active'
                    : 'app-shell__lnb-item'
                }
                title={`${label} — 클릭하여 열기`}
                aria-label={label}
                aria-pressed={active}
                onClick={(): void => handleLnbClick(zone)}
              >
                <span className="app-shell__lnb-item-icon">
                  <Icon className="size-5" />
                </span>
                <span className="app-shell__lnb-item-label">{label}</span>
              </button>
            );
          })}
          <div className="app-shell__lnb-spacer" aria-hidden="true" />
          {LNB_ITEMS_BOTTOM.map(({ zone, icon: Icon, label }) => {
            const active = focus === zone;
            return (
              <button
                key={zone}
                type="button"
                className={
                  active
                    ? 'app-shell__lnb-item app-shell__lnb-item--active'
                    : 'app-shell__lnb-item'
                }
                title={`${label} — 클릭하여 열기`}
                aria-label={label}
                aria-pressed={active}
                onClick={(): void => handleLnbClick(zone)}
              >
                <span className="app-shell__lnb-item-icon">
                  <Icon className="size-5" />
                </span>
                <span className="app-shell__lnb-item-label">{label}</span>
              </button>
            );
          })}
        </nav>

        {sidebarPanelsVisible && (
          <div className="app-shell__sidebar-panels">
            <div
              className="app-shell__sidebar-panel"
              style={{ width: catalogWidth }}
            >
              <div className="app-shell__sidebar-panel-body">
                <CatalogPanel
                  ref={searchInputRef}
                  items={catalog}
                  selectedAtcPath={selectedAtcPath}
                  onSelect={setSelectedAtcPath}
                  query={searchQuery}
                  onQueryChange={setSearchQuery}
                  batchSelected={batchSet}
                  onToggleBatch={handleToggleBatch}
                  onSendToQueue={handleSendToQueue}
                  onClearBatch={handleClearBatch}
                  batchRunning={batchRunning}
                />
              </div>
              <div
                className="app-shell__sidebar-resizer"
                role="separator"
                aria-orientation="vertical"
                aria-label="카탈로그 폭 조절"
                title="드래그하여 폭 조정"
                onMouseDown={(ev): void => {
                  ev.preventDefault();
                  handleResizeStart(ev.clientX, catalogWidth);
                }}
              />
            </div>
          </div>
        )}
      </aside>

      {/* GNB — 화면 최상단 풀-너비. 설정/스케줄/URL 풀 화면에서는 숨김 (자동화 workflow GNB 라 무관).
       * 숨길 때 row 1 의 auto 가 0 으로 collapse 돼 sidebar 가 전체 높이를 채움. */}
      {focus !== 'settings' && focus !== 'schedule' && focus !== 'url-pool' && (
      <header className="app-shell__gnb" aria-label="자동화 워크플로 GNB">
        <div className="app-shell__gnb-inner">
          {GNB_ITEMS.map(({ zone, label, icon }, index) => {
            const active = focus === zone;
            // Run 진행 중에는 카탈로그/실행 대기로 이탈 차단. Live 만 항상 허용 (진행 보기).
            const runInProgress = batchRunning || runDispatching;
            const disabled =
              !active && runInProgress && (zone === 'catalog' || zone === 'queue');
            const badge =
              zone === 'queue'
                ? batchOrder.length
                : zone === 'live'
                  ? activeQueueIds.length
                  : 0;
            const title = disabled
              ? '실행 중에는 이동할 수 없습니다 — Live 에서 진행을 확인하세요'
              : `${label} 화면으로 이동`;
            return (
              <span key={zone} className="app-shell__gnb-cell">
                {index > 0 && (
                  <Icon
                    icon="chevron-right"
                    size={14}
                    className="app-shell__gnb-sep"
                    aria-hidden
                  />
                )}
                <button
                  type="button"
                  className={
                    active
                      ? 'app-shell__gnb-item app-shell__gnb-item--active'
                      : 'app-shell__gnb-item'
                  }
                  onClick={(): void => handleLnbClick(zone)}
                  disabled={disabled}
                  aria-pressed={active}
                  aria-disabled={disabled}
                  title={title}
                >
                  <Icon icon={icon} size={14} aria-hidden />
                  <span className="app-shell__gnb-item-label">{label}</span>
                  {badge > 0 && (
                    <span className="app-shell__gnb-item-badge">{badge}</span>
                  )}
                </button>
              </span>
            );
          })}
        </div>
      </header>
      )}

      {formVisible && (
        <section className="app-shell__form">
          {focus === 'settings' ? (
            <SettingsPanel
              headless={headless}
              onHeadlessChange={setHeadless}
              busy={runDispatching || batchRunning}
            />
          ) : focus === 'schedule' ? (
            <SchedulePanel
              catalog={catalog}
              onViewReport={(runIds): void => {
                if (runIds.length === 0) return;
                // 단건/다건 모두 ReportPanel 의 기존 패턴 재사용 — runIds 가 1개면
                // currentRunId 만, 2개 이상이면 batchRunIds 까지 채워서 묶음 view.
                if (runIds.length === 1) {
                  setCurrentRunId(runIds[0]!);
                  setBatchRunIds([]);
                } else {
                  setCurrentRunId(runIds[0]!);
                  setBatchRunIds([...runIds]);
                }
                setRightTab('report');
                // 스케줄에서 진입 — Report toolbar 에 "← 스케줄로" 버튼 노출.
                setReportBackTarget('schedule');
                setFocusOverride('live');
              }}
            />
          ) : focus === 'url-pool' ? (
            <ErrorBoundary label="UrlPoolPanel">
              <UrlPoolPanel />
            </ErrorBoundary>
          ) : focus === 'queue' ? (
            <QueueView
              order={batchOrder}
              catalog={catalog}
              inputs={batchInputs}
              onInputChange={handleQueueInputChange}
              onRemove={handleQueueRemove}
              onRunAll={(): void => {
                void handleRunBatch();
              }}
              onCancel={handleQueueCancel}
              running={batchRunning}
              headless={headless}
            />
          ) : batchOrder.length > 0 ? (
            // 카탈로그에서 체크박스로 N개 선택된 상태 — 그 목록을 미리 보여준다.
            // 단일 선택(InputForm) 뷰를 덮어쓴다 (handleToggleBatch 가 selectedAtc 도 클리어).
            <BatchPreview
              order={batchOrder}
              catalog={catalog}
              onRemove={handleToggleBatch}
              onClear={handleClearBatch}
              onSendToQueue={handleSendToQueue}
              onSchedule={(): void => {
                // 체크된 N개를 한 묶음 스케줄로. batchInputs 가 있으면 prefill,
                // 없으면 빈 객체 — ScheduleDialog 안에서 사용자가 채울 수 있음.
                setQuickScheduleSeed({
                  atcPaths: [...batchOrder],
                  perAtcInputs: { ...batchInputs },
                });
              }}
            />
          ) : selectedAtc !== null ? (
            // 카탈로그에서 행 클릭 → 가운데에 그 TC 의 InputForm 미리보기/단일 실행.
            // key 로 ATC 별 fresh state (R-B6.5 reset).
            <InputForm
              key={selectedAtc.atcPath}
              atc={selectedAtc}
              onSubmit={handleRunSubmit}
              onSchedule={(inputs): void => {
                setQuickScheduleSeed({
                  atcPaths: [selectedAtc.atcPath],
                  perAtcInputs: { [selectedAtc.atcPath]: inputs },
                });
              }}
              errorMessage={runError}
              busy={runDispatching}
              headless={headless}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-background p-8 text-center text-sm text-muted-foreground">
              <p>좌측 카탈로그에서 TC 를 클릭하면 여기에 상세가 표시됩니다.<br />여러 개 체크박스로 선택하면 선택한 TC 목록이 여기에 나타납니다.</p>
            </div>
          )}
        </section>
      )}

      {liveVisible && (
        <section className="app-shell__right">
          <div className="app-shell__right-tabbar">
            <Tabs
              id="right-tabs"
              selectedTabId={rightTab}
              onChange={(id): void => setRightTab(id as RightTab)}
              className="app-shell__right-tabs"
              large
            >
              <Tab id="live" title="Live" />
              <Tab
                id="report"
                title="Report"
                disabled={currentRunId === null && batchRunIds.length === 0}
              />
            </Tabs>
            {(activeQueueIds.length > 0 ||
              currentRunId !== null ||
              batchRunIds.length > 0) && (
              <BpButton
                icon="eraser"
                small
                minimal
                disabled={batchRunning || runDispatching}
                onClick={handleClearRunRecords}
                text="기록 비우기"
                title={
                  batchRunning || runDispatching
                    ? '실행 중에는 기록을 비울 수 없습니다'
                    : '누적된 Live / Report 기록을 모두 지움 (reports/runs/ 파일은 그대로)'
                }
              />
            )}
          </div>

          <div className="app-shell__right-body">
            {/* RunView 는 항상 마운트 유지 — report 탭으로 전환돼도 언마운트하지 않는다.
             * atc:log / atc:done 은 one-shot IPC 라 언마운트 후 재마운트하면 done 을 놓쳐
             * "진행 중" 에 멈춘다. display 로만 숨겨 step/done 스트림 상태를 보존. */}
            <div style={{ display: rightTab === 'live' ? 'contents' : 'none' }}>
              <ErrorBoundary label="Live (RunView)">
                {/* 활성 큐들을 collapsible TC 그룹으로. 각 그룹은 자체로 step 스트림 구독. */}
                <RunView
                  queueIds={activeQueueIds}
                  catalog={catalog}
                  queueIdToAtcPath={queueIdToAtcPath}
                />
              </ErrorBoundary>
            </div>
            {rightTab === 'report' && (
              <ErrorBoundary label="Report (ReportPanel)">
                <ReportPanel
                  runId={currentRunId}
                  runIds={batchRunIds.length > 0 ? batchRunIds : undefined}
                  titleResolver={(rid): string | null => {
                    const match = batchProgress.find((p) => p.runId === rid);
                    if (match === undefined) return null;
                    const item = catalog.find((c) => c.atcPath === match.atcPath);
                    if (item === undefined) return match.atcPath;
                    return typeof item.atc === 'object' && item.atc !== null && 'title' in item.atc
                      ? ((item.atc as { title?: string }).title ?? match.atcPath)
                      : match.atcPath;
                  }}
                  onBack={
                    reportBackTarget === 'schedule'
                      ? (): void => {
                          setReportBackTarget(null);
                          setFocusOverride('schedule');
                        }
                      : undefined
                  }
                  backLabel={reportBackTarget === 'schedule' ? '스케줄로' : undefined}
                />
              </ErrorBoundary>
            )}
          </div>
        </section>
      )}

      {/* T18 — modal dialog shown when user closes window with an active run. */}
      <CloseConfirmDialog />

      {/* InputForm / BatchPreview 의 "예약" 버튼에서 띄우는 ScheduleDialog.
       * 단일 진입은 atcPaths=[1개], 다중 진입은 atcPaths=N. 진입점에서 이미 선택이
       * 확정됐으므로 lockSelection=true 로 ATC 체크박스 리스트는 잠금 (변경하려면
       * 사용자가 dialog 닫고 카탈로그에서 다시 선택). LNB 의 SchedulePanel
       * 안에서 띄우는 "+ 새 스케줄" dialog 는 lockSelection 없이 (SchedulePanel 가
       * 자체 ScheduleDialog 인스턴스를 가짐 — quickScheduleSeed 와 분리). */}
      <ScheduleDialog
        isOpen={quickScheduleSeed !== null}
        onClose={(): void => setQuickScheduleSeed(null)}
        onSaved={(): void => {
          // 저장 성공 시 사용자가 만든 스케줄을 바로 확인할 수 있도록 zone 전환.
          setFocusOverride('schedule');
        }}
        catalog={catalog}
        initialAtcPaths={quickScheduleSeed?.atcPaths}
        initialPerAtcInputs={quickScheduleSeed?.perAtcInputs}
        lockSelection
      />
    </div>
  );
}

const container = document.getElementById('root');
if (!container) {
  throw new Error('#root not found in index.html');
}
createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
