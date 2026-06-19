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
import type { CatalogItem, Domain } from '../../../shared/ipc';
import './CatalogPanel.css';

// 필터/그룹 기준 — 우선순위(기존) vs 카테고리(엑셀 Category 트리).
type FilterMode = 'priority' | 'category';

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

const DOMAIN_ORDER: readonly Domain[] = [
  'collected-product',
  'product-collect',
  'registered-product',
  'delivery-agency',
  'base-setting',
  'upload',
  'order-mgmt',
  'windly-shell',
  'smartstore-customs-tax',
  'e2e',
] as const;

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

function groupByDomain(items: CatalogItem[]): CatalogGroup[] {
  const groups = new Map<Domain, CatalogItem[]>();
  for (const item of items) {
    const arr = groups.get(item.domain);
    if (arr) arr.push(item);
    else groups.set(item.domain, [item]);
  }
  const out: CatalogGroup[] = [];
  for (const d of DOMAIN_ORDER) {
    const arr = groups.get(d);
    if (arr && arr.length > 0) out.push({ key: d, label: d.toUpperCase(), items: arr });
  }
  return out;
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
    const [filterMode, setFilterMode] = useState<FilterMode>('priority');
    const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');

    // 카테고리 모드용 — 현재 검색어 적용된 항목들의 distinct 카테고리 목록.
    const categoryOptions = useMemo(() => {
      const set = new Set<string>();
      for (const item of items) {
        if (matchesQuery(item, query.trim())) set.add(categoryGroupOf(item));
      }
      return [...set].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    }, [items, query]);

    const filtered = useMemo(
      () =>
        items.filter((item) => {
          if (!matchesQuery(item, query.trim())) return false;
          if (filterMode === 'priority') return matchesPriority(item, priorityFilter);
          return categoryFilter === 'all' || categoryGroupOf(item) === categoryFilter;
        }),
      [items, query, filterMode, priorityFilter, categoryFilter],
    );
    const grouped = useMemo(
      () => (filterMode === 'category' ? groupByCategory(filtered) : groupByDomain(filtered)),
      [filtered, filterMode],
    );
    const totalCount = filtered.length;
    const selectedCount = batchSelected.size;

    // 각 priority 별 전체 카운트 (현재 검색어 적용된 상태에서). filter 칩에 숫자 함께 노출.
    const priorityCounts = useMemo(() => {
      const base = items.filter((item) => matchesQuery(item, query.trim()));
      const counts: Record<PriorityFilter, number> = {
        all: base.length,
        P0: 0,
        P1: 0,
        P2: 0,
        none: 0,
      };
      for (const item of base) {
        const p = priorityOf(item);
        if (p === null) counts.none += 1;
        else counts[p] += 1;
      }
      return counts;
    }, [items, query]);

    return (
      <div className="catalog-panel">
        {/* Header — 검색 + 카운트 */}
        <div className="catalog-panel__header">
          <InputGroup
            inputRef={searchInputRef}
            leftIcon="search"
            type="search"
            placeholder="검색 — Cmd+/"
            value={query}
            onChange={(e): void => onQueryChange(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            fill
          />
          <Tag minimal>{totalCount}</Tag>
        </div>

        {/* 필터 기준 토글 — 우선순위 vs 카테고리 */}
        <div className="catalog-panel__filter-mode">
          <ButtonGroup>
            <Button
              small
              active={filterMode === 'priority'}
              icon="sort"
              onClick={(): void => setFilterMode('priority')}
            >
              우선순위
            </Button>
            <Button
              small
              active={filterMode === 'category'}
              icon="folder-close"
              onClick={(): void => setFilterMode('category')}
            >
              카테고리
            </Button>
          </ButtonGroup>
        </div>

        {/* 필터 본체 — 모드에 따라 우선순위 칩 또는 카테고리 셀렉트 */}
        {filterMode === 'priority' ? (
          <div className="catalog-panel__priority-filter">
            <ButtonGroup>
              {PRIORITY_FILTER_ORDER.map((p) => {
                const active = priorityFilter === p;
                return (
                  <Button
                    key={p}
                    small
                    active={active}
                    intent={
                      active && p !== 'all' && p !== 'none'
                        ? priorityIntent(p)
                        : undefined
                    }
                    onClick={(): void => setPriorityFilter(p)}
                    title={`${PRIORITY_FILTER_LABEL[p]} (${priorityCounts[p]})`}
                  >
                    {PRIORITY_FILTER_LABEL[p]} {priorityCounts[p]}
                  </Button>
                );
              })}
            </ButtonGroup>
          </div>
        ) : (
          <div className="catalog-panel__category-filter">
            <HTMLSelect
              fill
              value={categoryFilter}
              onChange={(e): void => setCategoryFilter(e.currentTarget.value)}
            >
              <option value="all">전체 카테고리 ({categoryOptions.length})</option>
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </HTMLSelect>
          </div>
        )}

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
