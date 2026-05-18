/**
 * QueueView — "실행 대기" 화면.
 *
 * 카탈로그에서 체크박스로 선택한 TC 들이 카드 형태로 쌓이고, 각 TC 마다
 * 사전에 받아야 하는 inputs 를 채워 넣는다. 상단 "전체 실행" 으로 한 번에
 * 순차 spawn — main 의 run-queue 가 R-B6.1 직렬화.
 *
 * INV-3 / INV-4: 순수 controlled 컴포넌트. 모든 state 는 App 가 관리.
 */

import { Button as BpButton } from '@blueprintjs/core';
import { Loader2, Play, Trash2 } from 'lucide-react';
import { type JSX } from 'react';
import type { CatalogItem } from '../../../shared/ipc';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';

export interface InputSpec {
  type: string;
  description?: string;
  example?: string;
}
interface AtcBody {
  title: string;
  inputs: Record<string, InputSpec>;
}

function isInputSpec(v: unknown): v is InputSpec {
  return (
    typeof v === 'object' &&
    v !== null &&
    'type' in v &&
    typeof (v as { type: unknown }).type === 'string'
  );
}
function narrowAtcBody(raw: unknown): AtcBody {
  if (typeof raw !== 'object' || raw === null) {
    return { title: '', inputs: {} };
  }
  const obj = raw as Record<string, unknown>;
  const title = typeof obj.title === 'string' ? obj.title : '';
  const inputsRaw = obj.inputs;
  const inputs: Record<string, InputSpec> = {};
  if (typeof inputsRaw === 'object' && inputsRaw !== null) {
    for (const [key, value] of Object.entries(inputsRaw)) {
      if (isInputSpec(value)) inputs[key] = value;
    }
  }
  return { title, inputs };
}
function htmlInputType(specType: string): string {
  const t = specType.toLowerCase();
  if (t === 'number' || t === 'integer') return 'number';
  if (t === 'url') return 'url';
  if (t === 'date') return 'date';
  if (t === 'email') return 'email';
  return 'text';
}
function titleOf(item: CatalogItem): string {
  const body = narrowAtcBody(item.atc);
  if (body.title.length > 0) return body.title;
  return item.atcPath.split('/').pop() ?? item.atcPath;
}

interface QueueViewProps {
  /** 큐에 들어있는 atcPath 들 (선택 순서). */
  order: readonly string[];
  catalog: readonly CatalogItem[];
  /** atcPath → inputName → value. App 가 보유. */
  inputs: Readonly<Record<string, Record<string, string>>>;
  onInputChange: (atcPath: string, name: string, value: string) => void;
  onRemove: (atcPath: string) => void;
  onRunAll: () => void;
  onCancel: () => void;
  running: boolean;
  headless: boolean;
}

export function QueueView({
  order,
  catalog,
  inputs,
  onInputChange,
  onRemove,
  onRunAll,
  onCancel,
  running,
  headless,
}: QueueViewProps): JSX.Element {
  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {/* Header — 액션 바 */}
      <header className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-3">
        <BpButton
          icon="arrow-left"
          intent="primary"
          small
          onClick={onCancel}
          disabled={running}
          text="카탈로그로"
          title="카탈로그 화면으로 돌아가기"
        />
        <div className="ml-2">
          <h2 className="text-sm font-semibold">실행 대기</h2>
          <p className="text-xs text-muted-foreground">
            {order.length}개 TC · 입력 채우고 전체 실행
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {headless && (
            <Badge
              variant="outline"
              className="border-amber-300 bg-amber-50 text-amber-800"
            >
              Headless
            </Badge>
          )}
          <Button
            size="sm"
            onClick={onRunAll}
            disabled={running || order.length === 0}
            className="gap-1.5"
          >
            {running ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Play className="size-4" />
            )}
            {running ? '실행 중…' : `전체 실행 (${order.length})`}
          </Button>
        </div>
      </header>

      {/* TC 카드 리스트 — 스크롤 영역 */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
        {order.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            카탈로그에서 tc를 먼저 선택 후 실행 대기로 보내주세요
          </div>
        ) : (
          order.map((atcPath, idx) => {
            const item = catalog.find((c) => c.atcPath === atcPath);
            if (item === undefined) {
              return (
                <Card
                  key={atcPath}
                  className="border-destructive/30 bg-destructive/5"
                >
                  <CardContent>
                    <p className="text-sm text-destructive">
                      카탈로그에서 찾을 수 없음: {atcPath}
                    </p>
                  </CardContent>
                </Card>
              );
            }
            const body = narrowAtcBody(item.atc);
            const inputNames = Object.keys(body.inputs);
            const tcInputs = inputs[atcPath] ?? {};
            return (
              <Card
                key={atcPath}
                className="gap-0 overflow-hidden p-0 shadow-sm"
              >
                <CardHeader className="border-b border-border bg-muted/40 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <Badge
                      variant="secondary"
                      className="mt-0.5 font-mono"
                    >
                      #{idx + 1}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold">
                          {titleOf(item)}
                        </span>
                        {item.isFragment && (
                          <Badge
                            variant="outline"
                            className="border-amber-300 bg-amber-50 px-1.5 font-mono text-[10px] text-amber-800"
                          >
                            ƒ
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        <span className="font-mono">{item.domain}</span> ·{' '}
                        {item.atcPath}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(): void => onRemove(atcPath)}
                      disabled={running}
                      title="이 TC 큐에서 제거"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  {inputNames.length === 0 ? (
                    <p className="text-xs italic text-muted-foreground">
                      이 TC 는 입력이 필요하지 않습니다.
                    </p>
                  ) : (
                    <div className="grid gap-3">
                      {inputNames.map((name) => {
                        const spec = body.inputs[name];
                        const fieldId = `q-${idx}-${name}`;
                        return (
                          <div key={name} className="grid gap-1.5">
                            <Label htmlFor={fieldId}>
                              <span className="font-mono text-[12px]">
                                {name}
                              </span>
                              {spec.description && (
                                <span className="ml-2 font-normal text-muted-foreground">
                                  — {spec.description}
                                </span>
                              )}
                            </Label>
                            <Input
                              id={fieldId}
                              type={htmlInputType(spec.type)}
                              placeholder={spec.example ?? ''}
                              value={tcInputs[name] ?? ''}
                              onChange={(e): void =>
                                onInputChange(
                                  atcPath,
                                  name,
                                  e.currentTarget.value,
                                )
                              }
                              disabled={running}
                              spellCheck={false}
                              autoComplete="off"
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
