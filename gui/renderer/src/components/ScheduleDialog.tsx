/**
 * ScheduleDialog — N개 ATC + per-ATC inputs + 시간 정의를 묶어 schedule:create
 * 또는 schedule:update 로 보내는 모달.
 *
 * 3-섹션 구조 (위→아래):
 *   1. 실행할 TC          — 검색 + 도메인 그룹 + 체크박스 리스트
 *   2. 언제                — 반복/단발 SegmentedControl + 주기 + 시각 + 요일/일
 *   3. 입력값              — 선택된 ATC 별 collapsible 카드 (입력이 있는 ATC 만)
 *
 * Fulfills (renderer half):
 *   R-B5.1   — 주기/단발 둘 다 입력 폼 제공
 *   R-T4.1   — 반복 → CalendarInterval(Hour/Minute + 선택적 Weekday/Day)
 *   R-T4.2   — 단발 → runAtEpochMs (epoch ms)
 *   R-U2.1   — 인터랙티브 폼, 별도 확인 단계 없음
 *
 * INV-3: gui/shared + npm 의존성만. lib/ recoveries/ tests/ 미참조.
 * INV-4: window.atcAPI.scheduleCreate/Update 만. 네트워크 호출 X.
 * R-T1.3: strict TS, no `any`.
 */

import {
  Button,
  ButtonGroup,
  Callout,
  Classes,
  Collapse,
  Dialog,
  DialogBody,
  DialogFooter,
  Divider,
  Icon,
  InputGroup,
  NumericInput,
  SegmentedControl,
  Switch,
  Tag,
} from '@blueprintjs/core';
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type JSX,
} from 'react';
import type {
  CalendarInterval,
  CatalogItem,
  ScheduleCreateInput,
  ScheduleDef,
  ScheduleKind,
} from '../../../shared/ipc';
import type { InputSpec } from './InputForm';

export interface ScheduleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  catalog: readonly CatalogItem[];
  initialAtcPaths?: readonly string[];
  initialPerAtcInputs?: Record<string, Record<string, string>>;
  lockSelection?: boolean;
  editSchedule?: ScheduleDef | null;
}

type RecurringFreq = 'daily' | 'weekly' | 'monthly';

/** launchd Weekday: 0=일, 1=월, ..., 6=토. 표시는 월요일 시작. */
interface WeekdayDef {
  value: number;
  short: string;
  weekend: boolean;
}
const WEEKDAYS: readonly WeekdayDef[] = [
  { value: 1, short: '월', weekend: false },
  { value: 2, short: '화', weekend: false },
  { value: 3, short: '수', weekend: false },
  { value: 4, short: '목', weekend: false },
  { value: 5, short: '금', weekend: false },
  { value: 6, short: '토', weekend: true },
  { value: 0, short: '일', weekend: true },
];

function isInputSpec(v: unknown): v is InputSpec {
  return (
    typeof v === 'object' &&
    v !== null &&
    'type' in v &&
    typeof (v as { type: unknown }).type === 'string'
  );
}

function narrowInputs(atcBody: unknown): Record<string, InputSpec> {
  if (typeof atcBody !== 'object' || atcBody === null) return {};
  const raw = (atcBody as { inputs?: unknown }).inputs;
  if (typeof raw !== 'object' || raw === null) return {};
  const out: Record<string, InputSpec> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (isInputSpec(v)) out[k] = v;
  }
  return out;
}

function narrowTitle(atcBody: unknown): string {
  if (typeof atcBody !== 'object' || atcBody === null) return '';
  const t = (atcBody as { title?: unknown }).title;
  return typeof t === 'string' ? t : '';
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function localDateTimeStringToEpochMs(s: string): number | null {
  if (s === '') return null;
  const d = new Date(s);
  const ms = d.getTime();
  return Number.isFinite(ms) ? ms : null;
}

function defaultOneshotLocal(): string {
  const d = new Date(Date.now() + 5 * 60 * 1000);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function epochMsToLocalDateTimeString(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function deriveRecurringFreq(ci: CalendarInterval | undefined): RecurringFreq {
  if (!ci) return 'daily';
  if (typeof ci.Weekday === 'number') return 'weekly';
  if (typeof ci.Day === 'number') return 'monthly';
  return 'daily';
}

/** `09:00` 형식의 time 문자열 → {hour, minute}. invalid 시 null. */
function parseTimeString(s: string): { hour: number; minute: number } | null {
  const m = s.match(/^(\d{2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (!Number.isInteger(h) || h < 0 || h > 23) return null;
  if (!Number.isInteger(mi) || mi < 0 || mi > 59) return null;
  return { hour: h, minute: mi };
}

/** 사람 친화 quick-jump: 단발의 분 단위 prefix 옵션. */
const ONESHOT_QUICK_OFFSETS: ReadonlyArray<{ label: string; minutes: number }> = [
  { label: '5분 뒤', minutes: 5 },
  { label: '15분 뒤', minutes: 15 },
  { label: '1시간 뒤', minutes: 60 },
  { label: '내일 이 시각', minutes: 60 * 24 },
];

function offsetMinutesToLocal(min: number): string {
  const d = new Date(Date.now() + min * 60 * 1000);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/**
 * 선택된 TC 의 실행 순서를 보여주고 ▲▼ 로 reorder 시킨다. lockSelection 인 경우
 * onRemove=null 로 넘겨 ✕ 를 감춘다 (편집 모드에서 카탈로그 픽 자체가 잠겼으므로
 * 잔여 항목 제거도 동결).
 *
 * D13 의 outputs → inputs.from='previous' 자동 주입은 순서에 의존하므로 사용자가
 * 의도적으로 잡을 수 있어야 한다 — 예: 수집 #1 → 등록 #2 가 되도록.
 */
function OrderedSelectedList({
  items,
  onMove,
  onRemove,
  disabled,
}: {
  items: readonly CatalogItem[];
  onMove: (atcPath: string, direction: -1 | 1) => void;
  onRemove: ((atcPath: string) => void) | null;
  disabled: boolean;
}): JSX.Element {
  if (items.length === 0) {
    return (
      <div className="schedule-dialog__order-list schedule-dialog__order-list--empty">
        <span className="bp5-text-muted">선택된 TC 가 없습니다.</span>
      </div>
    );
  }
  return (
    <ol className="schedule-dialog__order-list">
      {items.map((c, idx) => {
        const title = narrowTitle(c.atc) || c.atcPath.split('/').pop();
        const isFirst = idx === 0;
        const isLast = idx === items.length - 1;
        return (
          <li key={c.atcPath} className="schedule-dialog__order-row">
            <Tag minimal round className="schedule-dialog__order-idx">
              #{idx + 1}
            </Tag>
            <Tag minimal>{c.domain}</Tag>
            <span className="schedule-dialog__order-title" title={c.atcPath}>
              {title}
            </span>
            {c.isFragment && (
              <Tag minimal intent="warning" title="조각 ATC (composes 용)">
                ƒ
              </Tag>
            )}
            <ButtonGroup minimal className="schedule-dialog__order-actions">
              <Button
                icon="chevron-up"
                small
                disabled={disabled || isFirst}
                onClick={(): void => onMove(c.atcPath, -1)}
                title="위로 이동"
              />
              <Button
                icon="chevron-down"
                small
                disabled={disabled || isLast}
                onClick={(): void => onMove(c.atcPath, 1)}
                title="아래로 이동"
              />
              {onRemove !== null && (
                <Button
                  icon="cross"
                  small
                  intent="danger"
                  disabled={disabled}
                  onClick={(): void => onRemove(c.atcPath)}
                  title="선택 해제"
                />
              )}
            </ButtonGroup>
          </li>
        );
      })}
    </ol>
  );
}

export function ScheduleDialog({
  isOpen,
  onClose,
  onSaved,
  catalog,
  initialAtcPaths,
  initialPerAtcInputs,
  lockSelection,
  editSchedule,
}: ScheduleDialogProps): JSX.Element {
  const isEdit = editSchedule != null;

  // ── form state ──
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [perAtcInputs, setPerAtcInputs] = useState<
    Record<string, Record<string, string>>
  >({});
  const [expandedAtc, setExpandedAtc] = useState<Record<string, boolean>>({});
  const [kind, setKind] = useState<ScheduleKind>('recurring');
  const [recurringFreq, setRecurringFreq] = useState<RecurringFreq>('daily');
  const [timeStr, setTimeStr] = useState<string>('09:00');
  const [weekday, setWeekday] = useState<number>(1);
  const [day, setDay] = useState<number>(1);
  const [oneshotLocal, setOneshotLocal] = useState<string>(defaultOneshotLocal());
  const [headless, setHeadless] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // ── 초기화 ──
  useEffect(() => {
    if (!isOpen) return;
    if (editSchedule) {
      const paths = editSchedule.atcPaths && editSchedule.atcPaths.length > 0
        ? Array.from(editSchedule.atcPaths)
        : [editSchedule.atcPath];
      setSelectedPaths(paths);
      const seedInputs: Record<string, Record<string, string>> = {};
      if (editSchedule.perAtcInputs) {
        for (const [k, v] of Object.entries(editSchedule.perAtcInputs)) {
          seedInputs[k] = { ...v };
        }
      } else if (paths.length === 1) {
        seedInputs[paths[0]!] = { ...editSchedule.inputs };
      }
      setPerAtcInputs(seedInputs);
      setExpandedAtc(paths.length === 1 ? { [paths[0]!]: true } : {});
      setKind(editSchedule.kind);
      setHeadless(editSchedule.headless === true);
      if (editSchedule.kind === 'recurring') {
        const ci = editSchedule.calendarInterval;
        setRecurringFreq(deriveRecurringFreq(ci));
        setTimeStr(`${pad2(ci?.Hour ?? 9)}:${pad2(ci?.Minute ?? 0)}`);
        setWeekday(typeof ci?.Weekday === 'number' ? ci.Weekday : 1);
        setDay(typeof ci?.Day === 'number' ? ci.Day : 1);
        setOneshotLocal(defaultOneshotLocal());
      } else {
        setRecurringFreq('daily');
        setTimeStr('09:00');
        setWeekday(1);
        setDay(1);
        setOneshotLocal(
          editSchedule.runAtEpochMs !== null
            ? epochMsToLocalDateTimeString(editSchedule.runAtEpochMs)
            : defaultOneshotLocal(),
        );
      }
    } else {
      const seedPaths = initialAtcPaths && initialAtcPaths.length > 0
        ? Array.from(initialAtcPaths)
        : [];
      setSelectedPaths(seedPaths);
      setPerAtcInputs(
        initialPerAtcInputs
          ? Object.fromEntries(
              Object.entries(initialPerAtcInputs).map(([k, v]) => [k, { ...v }]),
            )
          : {},
      );
      setExpandedAtc(seedPaths.length === 1 ? { [seedPaths[0]!]: true } : {});
      setKind('recurring');
      setRecurringFreq('daily');
      setTimeStr('09:00');
      setWeekday(1);
      setDay(1);
      setOneshotLocal(defaultOneshotLocal());
      setHeadless(false);
    }
    setSearch('');
    setError(null);
    setSubmitting(false);
  }, [isOpen, initialAtcPaths, initialPerAtcInputs, editSchedule]);

  // ── derived ──
  const selectedItems = useMemo<CatalogItem[]>(
    () =>
      selectedPaths
        .map((p) => catalog.find((c) => c.atcPath === p))
        .filter((c): c is CatalogItem => c !== undefined),
    [selectedPaths, catalog],
  );
  const distinctDomains = useMemo(
    () => new Set(selectedItems.map((c) => c.domain)),
    [selectedItems],
  );

  // 카탈로그 필터링 + 도메인 그룹.
  const grouped = useMemo<Array<[string, CatalogItem[]]>>(() => {
    const q = search.trim().toLowerCase();
    const filtered = catalog.filter((c) => {
      if (q === '') return true;
      const t = narrowTitle(c.atc).toLowerCase();
      return (
        t.includes(q) ||
        c.atcPath.toLowerCase().includes(q) ||
        c.domain.toLowerCase().includes(q)
      );
    });
    const byDomain = new Map<string, CatalogItem[]>();
    for (const c of filtered) {
      const arr = byDomain.get(c.domain) ?? [];
      arr.push(c);
      byDomain.set(c.domain, arr);
    }
    return Array.from(byDomain.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [catalog, search]);

  const handleTogglePath = (atcPath: string): void => {
    setSelectedPaths((prev) =>
      prev.includes(atcPath)
        ? prev.filter((p) => p !== atcPath)
        : [...prev, atcPath],
    );
    setExpandedAtc((prev) => ({ ...prev, [atcPath]: true }));
  };

  const handleClearSelection = (): void => {
    setSelectedPaths([]);
    setPerAtcInputs({});
  };

  // 선택된 TC 의 실행 순서를 위/아래로 한 칸 이동. lockSelection 여부와 무관.
  // D13 outputs → inputs.from='previous' 자동 주입이 순서에 의존하기 때문에
  // 사용자가 의도적으로 순서를 잡을 수 있어야 한다 (예: 수집 → 등록).
  const handleMovePath = (atcPath: string, direction: -1 | 1): void => {
    setSelectedPaths((prev) => {
      const idx = prev.indexOf(atcPath);
      if (idx < 0) return prev;
      const target = idx + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = prev.slice();
      const [item] = next.splice(idx, 1);
      next.splice(target, 0, item!);
      return next;
    });
  };
  const handleRemovePath = (atcPath: string): void => {
    setSelectedPaths((prev) => prev.filter((p) => p !== atcPath));
    setPerAtcInputs((prev) => {
      const next = { ...prev };
      delete next[atcPath];
      return next;
    });
  };

  const handleInputChange =
    (atcPath: string, name: string) =>
    (e: ChangeEvent<HTMLInputElement>): void => {
      const value = e.target.value;
      setPerAtcInputs((prev) => ({
        ...prev,
        [atcPath]: { ...(prev[atcPath] ?? {}), [name]: value },
      }));
    };

  const toggleExpand = (atcPath: string): void => {
    setExpandedAtc((prev) => ({ ...prev, [atcPath]: !prev[atcPath] }));
  };

  // ── 저장 페이로드 ──
  const buildPayload = (): ScheduleCreateInput | { error: string } => {
    if (selectedItems.length === 0) {
      return { error: 'ATC 를 1개 이상 선택해주세요.' };
    }
    if (kind === 'recurring') {
      const t = parseTimeString(timeStr);
      if (!t) return { error: '시각을 HH:MM 형식으로 입력해주세요.' };
      const ci: CalendarInterval = { Hour: t.hour, Minute: t.minute };
      if (recurringFreq === 'weekly') {
        ci.Weekday = weekday;
      } else if (recurringFreq === 'monthly') {
        if (!Number.isInteger(day) || day < 1 || day > 31) {
          return { error: '일(1–31) 이 잘못되었습니다.' };
        }
        ci.Day = day;
      }
      const normalizedInputs: Record<string, Record<string, string>> = {};
      for (const c of selectedItems) {
        normalizedInputs[c.atcPath] = perAtcInputs[c.atcPath] ?? {};
      }
      const head = selectedItems[0]!;
      return {
        atcPath: head.atcPath,
        inputs: normalizedInputs[head.atcPath] ?? {},
        atcPaths: selectedItems.map((c) => c.atcPath),
        perAtcInputs: normalizedInputs,
        domain: head.domain,
        specPath: head.specPath,
        active: true,
        headless,
        kind: 'recurring',
        calendarInterval: ci,
        runAtEpochMs: null,
      };
    }
    // oneshot
    const ms = localDateTimeStringToEpochMs(oneshotLocal);
    if (ms === null) return { error: '실행 시각을 입력해주세요.' };
    const unchanged =
      isEdit &&
      editSchedule.kind === 'oneshot' &&
      editSchedule.runAtEpochMs === ms;
    if (!unchanged && ms < Date.now()) {
      return { error: '실행 시각이 과거입니다. 미래 시각을 선택하세요.' };
    }
    const normalizedInputs: Record<string, Record<string, string>> = {};
    for (const c of selectedItems) {
      normalizedInputs[c.atcPath] = perAtcInputs[c.atcPath] ?? {};
    }
    const head = selectedItems[0]!;
    return {
      atcPath: head.atcPath,
      inputs: normalizedInputs[head.atcPath] ?? {},
      atcPaths: selectedItems.map((c) => c.atcPath),
      perAtcInputs: normalizedInputs,
      domain: head.domain,
      specPath: head.specPath,
      active: true,
      headless,
      kind: 'oneshot',
      runAtEpochMs: ms,
    };
  };

  const handleSave = async (): Promise<void> => {
    setError(null);
    const built = buildPayload();
    if ('error' in built) {
      setError(built.error);
      return;
    }
    setSubmitting(true);
    try {
      if (isEdit && editSchedule) {
        await window.atcAPI.scheduleUpdate({
          id: editSchedule.id,
          changes: built,
        });
      } else {
        await window.atcAPI.scheduleCreate(built);
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  };

  // ── 한 줄 요약 (헤더 chip 들) ──
  const summaryChip = (() => {
    if (kind === 'recurring') {
      if (recurringFreq === 'daily') return `매일 ${timeStr}`;
      if (recurringFreq === 'weekly') {
        const w = WEEKDAYS.find((x) => x.value === weekday);
        return `매주 ${w?.short ?? '?'} ${timeStr}`;
      }
      return `매월 ${day}일 ${timeStr}`;
    }
    const ms = localDateTimeStringToEpochMs(oneshotLocal);
    if (ms === null) return '단발 (미설정)';
    const d = new Date(ms);
    return `단발 ${pad2(d.getMonth() + 1)}/${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  })();

  return (
    <Dialog
      isOpen={isOpen}
      title={isEdit ? '스케줄 수정' : '새 스케줄'}
      icon={isEdit ? 'edit' : 'calendar'}
      onClose={onClose}
      canOutsideClickClose={false}
      canEscapeKeyClose={true}
      className="schedule-dialog"
      style={{ width: 720 }}
    >
      <DialogBody className="schedule-dialog__body">
        {/* 요약 헤더 — 사용자가 한 눈에 "지금까지 결정한 것" 확인 */}
        <div className="schedule-dialog__summary">
          <Tag minimal large intent={selectedItems.length > 0 ? 'primary' : 'none'} icon="layers">
            TC {selectedItems.length}개
          </Tag>
          <Tag minimal large icon="time">
            {summaryChip}
          </Tag>
          {distinctDomains.size > 1 && (
            <Tag minimal large intent="warning" icon="warning-sign">
              도메인 혼합 {distinctDomains.size}
            </Tag>
          )}
        </div>

        {/* ─────────────────────────── 섹션 1: TC ─────────────────────────── */}
        <section className="schedule-dialog__section">
          <header className="schedule-dialog__section-head">
            <span className="schedule-dialog__section-num">1</span>
            <h4 className="schedule-dialog__section-title">실행할 TC</h4>
            <span className="schedule-dialog__section-spacer" />
            {!lockSelection && selectedPaths.length > 0 && (
              <Button
                small
                minimal
                icon="eraser"
                onClick={handleClearSelection}
                disabled={submitting}
              >
                전체 해제
              </Button>
            )}
          </header>

          {lockSelection === true ? (
            <OrderedSelectedList
              items={selectedItems}
              onMove={handleMovePath}
              onRemove={null}
              disabled={submitting}
            />
          ) : (
            <div className="schedule-dialog__picker">
              <InputGroup
                leftIcon="search"
                placeholder="TC 이름 / 도메인으로 필터링"
                value={search}
                onChange={(e): void => setSearch(e.currentTarget.value)}
                disabled={submitting}
                fill
                small
              />
              <div className="schedule-dialog__picker-list">
                {catalog.length === 0 && (
                  <p className="bp5-text-muted" style={{ padding: 12 }}>
                    카탈로그가 비어있습니다.
                  </p>
                )}
                {grouped.length === 0 && search !== '' && (
                  <p className="bp5-text-muted" style={{ padding: 12 }}>
                    "{search}" 매칭 결과 없음.
                  </p>
                )}
                {grouped.map(([domain, items]) => (
                  <div key={domain} className="schedule-dialog__group">
                    <div className="schedule-dialog__group-head">
                      <Icon icon="folder-close" size={12} />
                      <span>{domain}</span>
                      <Tag minimal>{items.length}</Tag>
                    </div>
                    {items.map((c) => {
                      const checked = selectedPaths.includes(c.atcPath);
                      const t = narrowTitle(c.atc) || c.atcPath.split('/').pop();
                      return (
                        <button
                          key={c.atcPath}
                          type="button"
                          className={
                            checked
                              ? 'schedule-dialog__row schedule-dialog__row--checked'
                              : 'schedule-dialog__row'
                          }
                          onClick={(): void => handleTogglePath(c.atcPath)}
                          disabled={submitting}
                        >
                          <Icon
                            icon={checked ? 'tick-circle' : 'circle'}
                            intent={checked ? 'primary' : 'none'}
                            size={16}
                          />
                          <span className="schedule-dialog__row-title">{t}</span>
                          {c.isFragment && (
                            <Tag minimal intent="warning">
                              ƒ
                            </Tag>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
              {selectedItems.length >= 2 && (
                <OrderedSelectedList
                  items={selectedItems}
                  onMove={handleMovePath}
                  onRemove={handleRemovePath}
                  disabled={submitting}
                />
              )}
            </div>
          )}
        </section>

        <Divider />

        {/* ─────────────────────────── 섹션 2: 언제 ─────────────────────────── */}
        <section className="schedule-dialog__section">
          <header className="schedule-dialog__section-head">
            <span className="schedule-dialog__section-num">2</span>
            <h4 className="schedule-dialog__section-title">언제 실행</h4>
          </header>

          <SegmentedControl
            options={[
              { label: '반복', value: 'recurring' },
              { label: '단발', value: 'oneshot' },
            ]}
            value={kind}
            onValueChange={(v): void => setKind(v as ScheduleKind)}
            fill
          />

          {kind === 'recurring' ? (
            <div className="schedule-dialog__when">
              <div className="schedule-dialog__when-row">
                <label className="schedule-dialog__when-label">주기</label>
                <SegmentedControl
                  options={[
                    { label: '매일', value: 'daily' },
                    { label: '매주', value: 'weekly' },
                    { label: '매월', value: 'monthly' },
                  ]}
                  value={recurringFreq}
                  onValueChange={(v): void => setRecurringFreq(v as RecurringFreq)}
                  small
                />
              </div>

              <div className="schedule-dialog__when-row">
                <label className="schedule-dialog__when-label">시각</label>
                <input
                  type="time"
                  className="schedule-dialog__time-input"
                  value={timeStr}
                  onChange={(e): void => setTimeStr(e.currentTarget.value)}
                  disabled={submitting}
                  step={60}
                />
                <span className="bp5-text-muted" style={{ fontSize: 12 }}>
                  (시스템 로컬 — 현재 KST)
                </span>
              </div>

              {recurringFreq === 'weekly' && (
                <div className="schedule-dialog__when-row">
                  <label className="schedule-dialog__when-label">요일</label>
                  <ButtonGroup>
                    {WEEKDAYS.map((w) => {
                      const active = weekday === w.value;
                      return (
                        <Button
                          key={w.value}
                          active={active}
                          intent={active ? 'primary' : 'none'}
                          onClick={(): void => setWeekday(w.value)}
                          disabled={submitting}
                          className={
                            w.weekend
                              ? 'schedule-dialog__weekday schedule-dialog__weekday--weekend'
                              : 'schedule-dialog__weekday'
                          }
                        >
                          {w.short}
                        </Button>
                      );
                    })}
                  </ButtonGroup>
                </div>
              )}

              {recurringFreq === 'monthly' && (
                <div className="schedule-dialog__when-row">
                  <label className="schedule-dialog__when-label">일</label>
                  <NumericInput
                    value={day}
                    min={1}
                    max={31}
                    onValueChange={(v): void => {
                      if (Number.isFinite(v) && v >= 1 && v <= 31) setDay(Math.trunc(v));
                    }}
                    disabled={submitting}
                    style={{ width: 80 }}
                  />
                  <span className="bp5-text-muted" style={{ fontSize: 12 }}>
                    없는 일자는 launchd 가 자동 skip (예: 31일 → 2월)
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="schedule-dialog__when">
              <div className="schedule-dialog__when-row">
                <label className="schedule-dialog__when-label">시각</label>
                <input
                  type="datetime-local"
                  className="schedule-dialog__time-input schedule-dialog__time-input--wide"
                  value={oneshotLocal}
                  onChange={(e): void => setOneshotLocal(e.currentTarget.value)}
                  disabled={submitting}
                />
              </div>
              <div className="schedule-dialog__when-row">
                <label className="schedule-dialog__when-label">빠른 선택</label>
                <ButtonGroup>
                  {ONESHOT_QUICK_OFFSETS.map((o) => (
                    <Button
                      key={o.label}
                      small
                      icon="time"
                      onClick={(): void => setOneshotLocal(offsetMinutesToLocal(o.minutes))}
                      disabled={submitting}
                    >
                      {o.label}
                    </Button>
                  ))}
                </ButtonGroup>
              </div>
            </div>
          )}

          {/* Headless 토글 — 자식 Playwright 가 창 안 띄움. D7 주의 — 윈들리 확장 의존 ATC 는 깨질 수 있음. */}
          <div className="schedule-dialog__when-row schedule-dialog__headless-row">
            <label className="schedule-dialog__when-label">실행 모드</label>
            <Switch
              checked={headless}
              onChange={(e): void => setHeadless(e.currentTarget.checked)}
              disabled={submitting}
              label={headless ? 'Headless (창 안 띄움)' : 'Headed (창 띄움)'}
              innerLabel="OFF"
              innerLabelChecked="ON"
              style={{ marginBottom: 0 }}
            />
            {headless && (
              <Tag minimal intent="warning" icon="warning-sign">
                윈들리 확장 의존 ATC 는 깨질 수 있음
              </Tag>
            )}
          </div>
        </section>

        {/* ─────────────────────────── 섹션 3: 입력값 ─────────────────────────── */}
        {selectedItems.some((c) => Object.keys(narrowInputs(c.atc)).length > 0) && (
          <>
            <Divider />
            <section className="schedule-dialog__section">
              <header className="schedule-dialog__section-head">
                <span className="schedule-dialog__section-num">3</span>
                <h4 className="schedule-dialog__section-title">입력값</h4>
                <span className="schedule-dialog__section-spacer" />
                <span className="bp5-text-muted" style={{ fontSize: 12 }}>
                  비워두면 빈 값으로 실행
                </span>
              </header>

              <div className="schedule-dialog__inputs-section">
                {selectedItems.map((c, idx) => {
                  const specs = narrowInputs(c.atc);
                  const names = Object.keys(specs);
                  if (names.length === 0) return null;
                  const expanded = expandedAtc[c.atcPath] ?? false;
                  const values = perAtcInputs[c.atcPath] ?? {};
                  const filledCount = names.filter((n) => (values[n] ?? '') !== '').length;
                  const complete = filledCount === names.length;
                  const isFirst = idx === 0;
                  const isLast = idx === selectedItems.length - 1;
                  return (
                    <div key={c.atcPath} className="schedule-dialog__atc-card">
                      <div className="schedule-dialog__atc-card-head-wrap">
                        <button
                          type="button"
                          className="schedule-dialog__atc-card-head"
                          onClick={(): void => toggleExpand(c.atcPath)}
                        >
                          <Icon icon={expanded ? 'chevron-down' : 'chevron-right'} size={12} />
                          <span className="schedule-dialog__atc-card-idx">#{idx + 1}</span>
                          <span className="schedule-dialog__atc-card-title">
                            {narrowTitle(c.atc) || c.atcPath.split('/').pop()}
                          </span>
                          <Tag
                            minimal
                            intent={complete ? 'success' : 'none'}
                            icon={complete ? 'tick' : undefined}
                          >
                            {filledCount}/{names.length}
                          </Tag>
                        </button>
                        {selectedItems.length >= 2 && (
                          <ButtonGroup minimal className="schedule-dialog__atc-card-reorder">
                            <Button
                              icon="chevron-up"
                              small
                              disabled={submitting || isFirst}
                              onClick={(): void => handleMovePath(c.atcPath, -1)}
                              title="위로 이동"
                            />
                            <Button
                              icon="chevron-down"
                              small
                              disabled={submitting || isLast}
                              onClick={(): void => handleMovePath(c.atcPath, 1)}
                              title="아래로 이동"
                            />
                          </ButtonGroup>
                        )}
                      </div>
                      <Collapse isOpen={expanded}>
                        <div className="schedule-dialog__atc-card-body">
                          {names.map((name) => {
                            const spec = specs[name];
                            const fieldId = `schedule-input-${c.atcPath}-${name}`;
                            return (
                              <div
                                key={name}
                                className="schedule-dialog__input-row"
                              >
                                <label
                                  htmlFor={fieldId}
                                  className="schedule-dialog__input-label"
                                  title={spec.description}
                                >
                                  {name}
                                </label>
                                <InputGroup
                                  id={fieldId}
                                  name={name}
                                  placeholder={spec.example ?? ''}
                                  value={values[name] ?? ''}
                                  onChange={handleInputChange(c.atcPath, name)}
                                  disabled={submitting}
                                  autoComplete="off"
                                  spellCheck={false}
                                  fill
                                  small
                                />
                              </div>
                            );
                          })}
                        </div>
                      </Collapse>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {selectedItems.length >= 2 && (
          <Callout intent="primary" icon="info-sign" style={{ marginTop: 12 }}>
            발화 시 선택한 순서대로 sequential 로 실행됩니다. 한 ATC 가 실패해도
            나머지는 계속 진행됩니다.
          </Callout>
        )}

        {error !== null && (
          <Callout
            intent="danger"
            icon="error"
            title="저장 실패"
            style={{ marginTop: 12 }}
          >
            {error}
          </Callout>
        )}
      </DialogBody>

      <DialogFooter
        actions={
          <>
            <Button
              className={Classes.DIALOG_CLOSE_BUTTON}
              onClick={onClose}
              disabled={submitting}
            >
              취소
            </Button>
            <Button
              intent="primary"
              icon="floppy-disk"
              loading={submitting}
              onClick={(): void => {
                void handleSave();
              }}
              disabled={selectedItems.length === 0}
              large
            >
              {isEdit ? '변경 저장' : '저장'}
              {selectedItems.length > 0 && ` · ${selectedItems.length}개`}
            </Button>
          </>
        }
      />
    </Dialog>
  );
}
