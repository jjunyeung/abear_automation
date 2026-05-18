/**
 * BatchPreview — 카탈로그 체크박스로 선택된 TC 목록을 오른쪽 영역에 표시.
 *
 * 사용 흐름:
 *  - TC 행 클릭 → InputForm (description) 표시
 *  - 체크박스로 N개 선택 → 이 컴포넌트가 InputForm 대신 표시 (선택 우선)
 *  - 모두 체크 해제 → empty view
 *
 * INV-3 / INV-4: pure presentational. App 가 batchOrder / catalog state 보유.
 * R-T1.3: strict TS, no `any`.
 */

import { Button, Card, H4, Tag } from '@blueprintjs/core';
import { type JSX } from 'react';
import type { CatalogItem } from '../../../shared/ipc';
import './BatchPreview.css';

interface BatchPreviewProps {
  /** 카탈로그에서 체크된 atcPath 들 (선택 순서). */
  order: readonly string[];
  catalog: readonly CatalogItem[];
  /** 행 제거 (체크 해제와 동일). */
  onRemove: (atcPath: string) => void;
  /** 전체 비우기. */
  onClear: () => void;
  /** 실행 대기 화면으로 보내기. */
  onSendToQueue: () => void;
  /** 선택된 N개 TC 를 한 묶음 스케줄로 예약. */
  onSchedule?: () => void;
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

export function BatchPreview({
  order,
  catalog,
  onRemove,
  onClear,
  onSendToQueue,
  onSchedule,
}: BatchPreviewProps): JSX.Element {
  return (
    <div className="batch-preview">
      <header className="batch-preview__header">
        <div className="batch-preview__title">
          <H4 className="batch-preview__h">선택된 TC</H4>
          <Tag minimal large>
            {order.length}
          </Tag>
        </div>
        <div className="batch-preview__actions">
          <Button
            icon="eraser"
            minimal
            small
            onClick={onClear}
            text="비우기"
          />
          {onSchedule !== undefined && (
            <Button
              icon="calendar"
              small
              onClick={onSchedule}
              text="예약"
              title="선택한 TC 들을 한 묶음으로 스케줄에 등록"
            />
          )}
          <Button
            icon="arrow-right"
            intent="primary"
            small
            onClick={onSendToQueue}
            text="실행 대기로 이동"
          />
        </div>
      </header>

      <div className="batch-preview__list">
        {order.map((atcPath, idx) => {
          const item = catalog.find((c) => c.atcPath === atcPath);
          if (item === undefined) {
            return (
              <Card key={atcPath} className="batch-preview__row batch-preview__row--missing">
                <Tag minimal className="batch-preview__index">
                  #{idx + 1}
                </Tag>
                <span className="batch-preview__missing-msg">
                  카탈로그에서 찾을 수 없음: {atcPath}
                </span>
                <Button
                  icon="cross"
                  minimal
                  small
                  onClick={(): void => onRemove(atcPath)}
                  title="제거"
                />
              </Card>
            );
          }
          return (
            <Card key={atcPath} className="batch-preview__row" compact>
              <Tag minimal className="batch-preview__index">
                #{idx + 1}
              </Tag>
              <div className="batch-preview__row-body">
                <div className="batch-preview__row-title">
                  {item.isFragment && (
                    <Tag minimal intent="warning" className="batch-preview__fragment">
                      ƒ
                    </Tag>
                  )}
                  <span title={titleOf(item)}>{titleOf(item)}</span>
                </div>
                <div className="batch-preview__row-meta">
                  <Tag minimal>{item.domain}</Tag>
                  <span className="batch-preview__path" title={item.atcPath}>
                    {item.atcPath}
                  </span>
                </div>
              </div>
              <Button
                icon="cross"
                minimal
                small
                onClick={(): void => onRemove(atcPath)}
                title="이 TC 제거 (체크 해제)"
              />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
