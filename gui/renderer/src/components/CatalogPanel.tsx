/**
 * CatalogPanel — Blueprint v6 의 Section + SectionCard + HTMLTable 로 구성.
 * 별도 BatchQueue 패널을 없애고, 선택된 항목들을 카탈로그 하단의 floating
 * 액션 바에서 바로 일괄 실행/비우기 할 수 있게 통합.
 *
 * Fulfills:
 *   R-U5.1-R-U5.6 (status indicators) — Blueprint Icon/Tag/Spinner 로 재구현
 *   R-U1.3        — fragment ATC 시각 구분 (italic + muted)
 *
 * INV-3 / INV-4: pure presentational. App 이 catalog/selection state 보유.
 * R-T1.3: strict TS, no `any`.
 */

import {
  Button,
  ButtonGroup,
  Checkbox,
  HTMLSelect,
  HTMLTable,
  Icon,
  InputGroup,
  Section,
  SectionCard,
  Spinner,
  Tag,
  type Intent,
} from '@blueprintjs/core';
import { forwardRef, useMemo, useState, type JSX } from 'react';
import type { CatalogItem } from '../../../shared/ipc';
import './CatalogPanel.css';

// 해구대/위탁 = 엑셀 중분류(Sub-category) 값 (업로드 대분류 하위). 전체면 미적용.
type BizType = 'all' | '해구대' | '위탁';
const BIZ_TYPES: readonly { key: BizType; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: '해구대', label: '해구대' },
  { key: '위탁', label: '위탁' },
] as const;
const PAGE_SIZES: readonly number[] = [50, 100, 200, 500, Number.POSITIVE_INFINITY] as const;
const pageSizeLabel = (n: number): string => (Number.isFinite(n) ? `${n}개` : '전체');

/**
 * 카테고리 — 엑셀 TC export 에서 박제된 catalog 필드(tc-categories.json 경유) 사용.
 *   group = Main Category (item.category), 없으면 도메인.
 *   breadcrumb = "Category / Main / Sub" 표시용 (있는 것만).
 */
function categoryGroupOf(item: CatalogItem): string {
  return item.category ?? item.domain;
}
function breadcrumbOf(item: CatalogItem): string | null {
  const parts = [item.categoryTop, item.category, item.categorySub].filter(
    (x): x is string => typeof x === 'string' && x.length > 0,
  );
  return parts.length > 0 ? parts.join(' / ') : null;
}

type Priority = 'P0' | 'P1' | 'P2';
type PriorityFilter = 'all' | Priority | 'none';
const PRIORITY_FILTER_ORDER: readonly PriorityFilter[] = [
  'all',
  'P0',
  'P1',
  'P2',
  'none',
] as const;
const PRIORITY_FILTER_LABEL: Record<PriorityFilter, string> = {
  all: '전체',
  P0: 'P0',
  P1: 'P1',
  P2: 'P2',
  none: '미지정',
};

function priorityOf(item: CatalogItem): Priority | null {
  if (typeof item.atc !== 'object' || item.atc === null) return null;
  const raw = (item.atc as { priority?: unknown }).priority;
  if (raw === 'P0' || raw === 'P1' || raw === 'P2') return raw;
  return null;
}

function priorityIntent(p: Priority | null): Intent {
  switch (p) {
    case 'P0':
      return 'danger';
    case 'P1':
      return 'warning';
    case 'P2':
      return 'none';
    default:
      return 'none';
  }
}

function matchesPriority(item: CatalogItem, filter: PriorityFilter): boolean {
  if (filter === 'all') return true;
  const p = priorityOf(item);
  if (filter === 'none') return p === null;
  return p === filter;
}

interface CatalogPanelProps {
  items: CatalogItem[];
  selectedAtcPath: string | null;
  onSelect: (atcPath: string) => void;
  query: string;
  onQueryChange: (value: string) => void;
  /** 선택된 atcPath 집합 (행 체크박스). */
  batchSelected: ReadonlySet<string>;
  onToggleBatch: (atcPath: string) => void;
  /** "실행 대기" 로 보내기 — 선택된 TC 들을 가지고 큐 뷰로 전환. */
  onSendToQueue: () => void;
  onClearBatch: () => void;
  batchRunning: boolean;
}

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

function stepIdsOf(item: CatalogItem): string[] {
  if (typeof item.atc !== 'object' || item.atc === null) return [];
  const maybe = (item.atc as { steps?: unknown }).steps;
  if (!Array.isArray(maybe)) return [];
  const out: string[] = [];
  for (const s of maybe) {
    if (typeof s === 'object' && s !== null && 'id' in s) {
      const id = (s as { id: unknown }).id;
      if (typeof id === 'string') out.push(id);
    }
  }
  return out;
}

function matchesQuery(item: CatalogItem, q: string): boolean {
  if (q.length === 0) return true;
  const needle = q.toLowerCase();
  const haystack = [
    titleOf(item).toLowerCase(),
    item.atcPath.toLowerCase(),
    ...stepIdsOf(item).map((s) => s.toLowerCase()),
  ];
  return haystack.some((h) => h.includes(needle));
}

function StatusIndicator({ item }: { item: CatalogItem }): JSX.Element | null {
  switch (item.status) {
    case 'normal':
      return null;
    case 'stale': {
      const tooltip =
        item.staleMismatches.length > 0
          ? `Stale: ${item.staleMismatches.join(', ')}`
          : 'Stale ATC (manifest mismatch)';
      return (
        <Tag intent="warning" icon="warning-sign" minimal title={tooltip}>
          stale
        </Tag>
      );
    }
    case 'running':
      return <Spinner size={14} intent="primary" />;
    case 'queued': {
      const label =
        item.queuePosition !== null ? String(item.queuePosition) : '…';
      return (
        <Tag intent="none" icon="time" minimal title={`대기 중: ${label}`}>
          {label}
        </Tag>
      );
    }
    case 'failed-recent':
      return (
        <Icon
          icon="cross-circle"
          intent="danger"
          size={16}
          title="직전 실행 실패"
        />
      );
    case 'passed-recent':
      return (
        <Icon
          icon="tick-circle"
          intent="success"
          size={16}
          title="직전 실행 성공"
        />
      );
  }
}

interface CatalogGroup {
  key: string;
  label: string;
  items: CatalogItem[];
}

function groupByCategory(items: CatalogItem[]): CatalogGroup[] {
  const groups = new Map<string, CatalogItem[]>();
  for (const item of items) {
    const k = categoryGroupOf(item);
    const arr = groups.get(k);
    if (arr) arr.push(item);
    else groups.set(k, [item]);
  }
  return [...groups.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([k, arr]) => ({ key: k, label: k, items: arr }));
}

export const CatalogPanel = forwardRef<HTMLInputElement, CatalogPanelProps>(
  function CatalogPanel(
    {
      items,
      selectedAtcPath,
      onSelect,
      query,
      onQueryChange,
      batchSelected,
      onToggleBatch,
      onSendToQueue,
      onClearBatch,
      batchRunning,
    }: CatalogPanelProps,
    searchInputRef,
  ): JSX.Element {
    const [catTop, setCatTop] = useState<string>('all'); // 카테고리 (B)
    const [catMain, setCatMain] = useState<string>('all'); // 대분류 (C)
    const [catSub, setCatSub] = useState<string>('all'); // 중분류 (D)
    const [catFn, setCatFn] = useState<string>('all'); // 소분류 (E)
    const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
    const [bizType, setBizType] = useState<BizType>('all');
    const [pageSize, setPageSize] = useState<number>(50);

    // 검색어 적용된 베이스 (카테고리 옵션 산출 기준).
    const base = useMemo(
      () => items.filter((i) => matchesQuery(i, query.trim())),
      [items, query],
    );
    const distinctSorted = (arr: (string | null)[]): string[] => {
      const s = new Set<string>();
      for (const v of arr) if (v) s.add(v);
      return [...s].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    };
    // 캐스케이딩 옵션 — 상위 선택을 반영해 하위 후보 좁힘.
    const topOptions = useMemo(() => distinctSorted(base.map((i) => i.categoryTop)), [base]);
    const mainOptions = useMemo(
      () =>
        distinctSorted(
          base
            .filter((i) => catTop === 'all' || i.categoryTop === catTop)
            .map((i) => i.category),
        ),
      [base, catTop],
    );
    const subOptions = useMemo(
      () =>
        distinctSorted(
          base
            .filter(
              (i) =>
                (catTop === 'all' || i.categoryTop === catTop) &&
                (catMain === 'all' || i.category === catMain),
            )
            .map((i) => i.categorySub),
        ),
      [base, catTop, catMain],
    );
    const fnOptions = useMemo(
      () =>
        distinctSorted(
          base
            .filter(
              (i) =>
                (catTop === 'all' || i.categoryTop === catTop) &&
                (catMain === 'all' || i.category === catMain) &&
                (catSub === 'all' || i.categorySub === catSub),
            )
            .map((i) => i.categoryFn),
        ),
      [base, catTop, catMain, catSub],
    );

    const filtered = useMemo(
      () =>
        base.filter(
          (i) =>
            (catTop === 'all' || i.categoryTop === catTop) &&
            (catMain === 'all' || i.category === catMain) &&
            (catSub === 'all' || i.categorySub === catSub) &&
            (catFn === 'all' || i.categoryFn === catFn) &&
            matchesPriority(i, priorityFilter) &&
            (bizType === 'all' || i.categorySub === bizType),
        ),
      [base, catTop, catMain, catSub, catFn, priorityFilter, bizType],
    );
    const displayed = useMemo(
      () => (pageSize >= filtered.length ? filtered : filtered.slice(0, pageSize)),
      [filtered, pageSize],
    );
    const grouped = useMemo(() => groupByCategory(displayed), [displayed]);
    const totalCount = filtered.length;
    const selectedCount = batchSelected.size;

    return (
      <div className="catalog-panel">
        {/* Row 1: 검색 입력 + 검색 버튼 */}
        <div className="catalog-panel__filter-row">
          <InputGroup
            className="catalog-panel__search"
            inputRef={searchInputRef}
            leftIcon="search"
            type="search"
            placeholder="테스트 케이스 이름 검색 — Cmd+/"
            value={query}
            onChange={(e): void => onQueryChange(e.target.value)}
            spellCheck={false}
            autoComplete="off"
          />
          <Button intent="success" icon="search">
            검색
          </Button>
        </div>

        {/* Row 2: 카테고리 4단 (캐스케이딩) */}
        <div className="catalog-panel__filter-row catalog-panel__filter-row--cats">
          <HTMLSelect
            value={catTop}
            onChange={(e): void => {
              setCatTop(e.currentTarget.value);
              setCatMain('all');
              setCatSub('all');
              setCatFn('all');
            }}
          >
            <option value="all">모든 카테고리</option>
            {topOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </HTMLSelect>
          <HTMLSelect
            value={catMain}
            onChange={(e): void => {
              setCatMain(e.currentTarget.value);
              setCatSub('all');
              setCatFn('all');
            }}
          >
            <option value="all">모든 대분류</option>
            {mainOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </HTMLSelect>
          <HTMLSelect
            value={catSub}
            onChange={(e): void => {
              setCatSub(e.currentTarget.value);
              setCatFn('all');
            }}
          >
            <option value="all">모든 중분류</option>
            {subOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </HTMLSelect>
          <HTMLSelect
            value={catFn}
            onChange={(e): void => setCatFn(e.currentTarget.value)}
          >
            <option value="all">모든 소분류</option>
            {fnOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </HTMLSelect>
        </div>

        {/* Row 3: 우선순위 + 해구대/위탁 + 페이지크기 + 카운트 */}
        <div className="catalog-panel__filter-row catalog-panel__filter-row--last">
          <HTMLSelect
            value={priorityFilter}
            onChange={(e): void =>
              setPriorityFilter(e.currentTarget.value as PriorityFilter)
            }
          >
            {PRIORITY_FILTER_ORDER.map((p) => (
              <option key={p} value={p}>
                {p === 'all' ? '모든 우선순위' : PRIORITY_FILTER_LABEL[p]}
              </option>
            ))}
          </HTMLSelect>
          <ButtonGroup>
            {BIZ_TYPES.map((b) => (
              <Button
                key={b.key}
                small
                active={bizType === b.key}
                onClick={(): void => setBizType(b.key)}
              >
                {b.label}
              </Button>
            ))}
          </ButtonGroup>
          <HTMLSelect
            value={String(pageSize)}
            onChange={(e): void => setPageSize(Number(e.currentTarget.value))}
          >
            {PAGE_SIZES.map((n) => (
              <option key={String(n)} value={String(n)}>
                {pageSizeLabel(n)}
              </option>
            ))}
          </HTMLSelect>
          <span className="catalog-panel__count">
            {totalCount} / {items.length} 개
          </span>
        </div>

        {/* Bulk actions floating bar — ≥1 선택 시 표시 */}
        <div
          className={
            selectedCount > 0
              ? 'app-shell__bulk-popover app-shell__bulk-popover--open'
              : 'app-shell__bulk-popover'
          }
          role="toolbar"
          aria-label="선택 항목 일괄 액션"
        >
          <Checkbox
            checked
            onChange={(e): void => {
              if (!e.currentTarget.checked) onClearBatch();
            }}
            aria-label="전체 선택 해제"
            style={{ marginBottom: 0 }}
          />
          <span className="app-shell__bulk-popover-count">
            {selectedCount}개 선택됨
          </span>
          <Button
            intent="primary"
            small
            icon="tick"
            loading={batchRunning}
            onClick={onSendToQueue}
            title="선택한 TC 들을 실행 대기 화면으로 보내고 입력값을 채운다"
          >
            실행 대기로 이동
          </Button>
          <Button
            small
            minimal
            icon="eraser"
            disabled={batchRunning}
            onClick={onClearBatch}
          >
            비우기
          </Button>
        </div>

        {/* 빈 상태 */}
        {grouped.length === 0 ? (
          <div className="catalog-panel__empty">
            일치하는 ATC 가 없습니다.
          </div>
        ) : (
          /* 도메인 그룹 (스크롤 영역) — Blueprint Section + HTMLTable */
          <div className="catalog-panel__scroll">
            {grouped.map(({ key: groupKey, label: groupLabel, items: domainItems }) => (
              <Section
                key={groupKey}
                collapsible
                compact
                title={groupLabel}
                rightElement={<Tag minimal>{domainItems.length}</Tag>}
                className="catalog-panel__section"
              >
                <SectionCard padded={false}>
                  <HTMLTable interactive compact className="catalog-panel__table">
                    <tbody>
                      {domainItems.map((item) => {
                        const selected = item.atcPath === selectedAtcPath;
                        const checked = batchSelected.has(item.atcPath);
                        return (
                          <tr
                            key={item.atcPath}
                            data-selected={selected ? 'true' : undefined}
                            data-checked={
                              checked && !selected ? 'true' : undefined
                            }
                          >
                            <td className="catalog-panel__cell-check">
                              <Checkbox
                                checked={checked}
                                disabled={batchRunning}
                                onChange={(): void =>
                                  onToggleBatch(item.atcPath)
                                }
                                aria-label="실행 대기에 추가"
                                style={{ marginBottom: 0 }}
                              />
                            </td>
                            <td
                              className="catalog-panel__cell-title"
                              onClick={(): void => onSelect(item.atcPath)}
                            >
                              <div className="catalog-panel__title-row">
                                {(() => {
                                  const p = priorityOf(item);
                                  if (p === null) return null;
                                  return (
                                    <Tag
                                      intent={priorityIntent(p)}
                                      minimal
                                      className="catalog-panel__priority-tag"
                                      title={`우선순위 ${p}`}
                                    >
                                      {p}
                                    </Tag>
                                  );
                                })()}
                                {item.isFragment && (
                                  <Tag
                                    intent="warning"
                                    minimal
                                    className="catalog-panel__fragment-tag"
                                    title="조각 ATC (composition fragment)"
                                  >
                                    ƒ
                                  </Tag>
                                )}
                                <span
                                  className={
                                    item.isFragment
                                      ? 'catalog-panel__title catalog-panel__title--fragment'
                                      : 'catalog-panel__title'
                                  }
                                  title={titleOf(item)}
                                >
                                  {titleOf(item)}
                                </span>
                              </div>
                              {(() => {
                                const bc = breadcrumbOf(item);
                                if (!bc) return null;
                                return (
                                  <div
                                    className="catalog-panel__category"
                                    title={bc}
                                  >
                                    {bc}
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="catalog-panel__cell-status">
                              <StatusIndicator item={item} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </HTMLTable>
                </SectionCard>
              </Section>
            ))}
          </div>
        )}
      </div>
    );
  },
);
