/**
 * UrlPoolPanel — URL 풀 화면.
 *
 * 매 실행마다 새 URL 이 필요한 ATC (e2e/url-collect-and-ai-fix 등) 가
 * 큐에서 자동으로 head URL 하나씩 consume 한다. 풀이 비어 있으면 그 ATC 는
 * 빈 값으로 spawn → spec.ts 의 missing_input 분기로 fail.
 *
 * 동작:
 *   - 풀 목록은 `atcAPI.poolList()` 로 최초 1회 로드 + `onPoolUpdated` push 로 live 갱신
 *     (run-queue 의 headPop 시 main 이 broadcast).
 *   - 추가: TextArea 한 줄 = 한 URL. 빈 줄/공백/# 코멘트는 무시.
 *   - 삭제: 각 행 옆 휴지통 버튼.
 *
 * INV-3 / INV-4: renderer 는 lib/* 직접 import 금지. 모든 호출은 window.atcAPI (IPC) 경유.
 */

import {
  Button,
  Callout,
  Card,
  Elevation,
  H4,
  NonIdealState,
  Tag,
  TextArea,
} from '@blueprintjs/core';
import { useCallback, useEffect, useState, type JSX } from 'react';

export function UrlPoolPanel(): JSX.Element {
  const [urls, setUrls] = useState<string[]>([]);
  const [draft, setDraft] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const list = await window.atcAPI.poolList();
      setUrls(list);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    void refresh();
    const unsubscribe = window.atcAPI.onPoolUpdated((next) => {
      setUrls(next);
    });
    return (): void => {
      unsubscribe();
    };
  }, [refresh]);

  const handleAdd = useCallback(async (): Promise<void> => {
    const candidates = draft
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('#'));
    if (candidates.length === 0) {
      setErrorMessage('추가할 URL 이 없습니다 (한 줄에 한 URL).');
      return;
    }
    setBusy(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const result = await window.atcAPI.poolAdd({ urls: candidates });
      setUrls(result.urls);
      setDraft('');
      const dup = candidates.length - result.affected;
      setStatusMessage(
        result.affected === 0
          ? `중복으로 모두 제외됨 (${candidates.length}건).`
          : `${result.affected}개 추가됨${dup > 0 ? ` (중복 ${dup}건 제외)` : ''}.`,
      );
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, [draft]);

  const handleRemove = useCallback(
    async (url: string): Promise<void> => {
      setBusy(true);
      setErrorMessage(null);
      try {
        const result = await window.atcAPI.poolRemove({ url });
        setUrls(result.urls);
        setStatusMessage(`제거됨 (${result.affected}건).`);
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  return (
    <div className="url-pool-panel" style={{ padding: 12, overflow: 'auto' }}>
      <Card elevation={Elevation.ZERO} compact>
        <H4 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          URL 풀
          <Tag minimal intent={urls.length === 0 ? 'warning' : 'primary'}>
            {urls.length}개
          </Tag>
        </H4>
        <p className="bp6-text-muted" style={{ marginTop: 0, fontSize: 13 }}>
          매 실행마다 새 URL 이 필요한 ATC (예: e2e URL 수집) 가 큐에서 자동으로 head URL
          1개씩 consume 합니다. 시도 시점에 풀에서 제거되며 (성공/실패 무관) — 재시도
          하려면 같은 URL 을 다시 추가해야 합니다. 풀이 비면 그 TC 는 fail.
        </p>
      </Card>

      <Card elevation={Elevation.ZERO} compact style={{ marginTop: 12 }}>
        <H4 style={{ marginTop: 0 }}>URL 추가</H4>
        <p className="bp6-text-muted" style={{ marginTop: 0, fontSize: 12 }}>
          한 줄에 한 URL. 빈 줄 / # 으로 시작하는 코멘트는 무시. 중복은 자동 제거.
        </p>
        <TextArea
          fill
          rows={6}
          value={draft}
          disabled={busy}
          onChange={(e): void => setDraft(e.currentTarget.value)}
          placeholder={'https://detail.tmall.com/item.htm?id=...\nhttps://item.taobao.com/item.htm?id=...'}
          style={{ fontFamily: 'monospace', fontSize: 12, marginTop: 8 }}
          spellCheck={false}
        />
        <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
          <Button
            intent="primary"
            icon="add"
            text="풀에 추가"
            onClick={(): void => {
              void handleAdd();
            }}
            disabled={busy || draft.trim().length === 0}
          />
          <Button
            text="초기화"
            icon="cross"
            onClick={(): void => setDraft('')}
            disabled={busy || draft.length === 0}
            minimal
          />
        </div>
      </Card>

      {errorMessage !== null && (
        <Callout
          intent="danger"
          icon="error"
          style={{ marginTop: 12 }}
          title="작업 실패"
        >
          {errorMessage}
        </Callout>
      )}
      {statusMessage !== null && errorMessage === null && (
        <Callout intent="success" icon="tick" style={{ marginTop: 12 }}>
          {statusMessage}
        </Callout>
      )}

      <Card elevation={Elevation.ZERO} compact style={{ marginTop: 12 }}>
        <H4 style={{ marginTop: 0 }}>대기 중인 URL (head → tail)</H4>
        {urls.length === 0 ? (
          <NonIdealState
            icon="inbox"
            title="풀이 비어있습니다"
            description="위 입력 박스에 URL 을 한 줄씩 추가하세요."
          />
        ) : (
          <div style={{ marginTop: 4 }}>
            {urls.map((url, idx) => (
              <div
                key={`${idx}-${url}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 0',
                  borderBottom: '1px solid rgba(17,20,24,0.08)',
                }}
              >
                <Tag minimal round style={{ minWidth: 32, justifyContent: 'center' }}>
                  {idx + 1}
                </Tag>
                <code
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 11,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={url}
                >
                  {url}
                </code>
                <Button
                  icon="trash"
                  intent="danger"
                  minimal
                  small
                  disabled={busy}
                  onClick={(): void => {
                    void handleRemove(url);
                  }}
                  title="이 URL 을 풀에서 제거"
                />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
