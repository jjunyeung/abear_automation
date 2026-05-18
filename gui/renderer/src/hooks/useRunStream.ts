/**
 * useRunStream — 단일 queueId 에 대한 atc:log + atc:done IPC 스트림을 받아
 * 실시간 step 모델 + 종료 정보를 반환하는 훅.
 *
 * 기존 RunView 안에 박혀 있던 로직을 추출 — MultiRunView 가 큐 여러 개를
 * 동시에 구독해서 각각 collapsible 그룹으로 그릴 수 있게 한다.
 *
 * INV-3 / INV-4: window.atcAPI 만 사용 (renderer-only).
 */

import { useEffect, useRef, useState } from 'react';
import type {
  AtcDoneEvent,
  AtcLogEvent,
} from '../../../shared/ipc';
import type { StepCardModel, StepStatus } from '../components/StepCard';

const RE_STEP_START = /^▶ step '([^']+)': (.+)$/;
const RE_UNHANDLED = /^✗ unhandled error '([^']+)' at step '([^']+)'$/;
const RE_RECOVERY_START = /^⚠ recovery '([^']+)' 시작\.\.\.$/;
const RE_RECOVERY_DONE = /^✓ recovery '([^']+)' 완료$/;
const RE_SCREENSHOT = /📸 screenshot:\s*(\S.+)$/;

function stripLogPrefix(line: string): string {
  const idx = line.search(/[▶✓✗⚠📸]/);
  return idx >= 0 ? line.slice(idx) : line;
}

function appendLine(prev: string, line: string): string {
  const next = prev.length > 0 ? `${prev}\n${line}` : line;
  if (next.length <= 16_384) return next;
  return next.slice(next.length - 16_384);
}

export interface RunStream {
  steps: readonly StepCardModel[];
  done: AtcDoneEvent | null;
}

export function useRunStream(queueId: string | null): RunStream {
  const [steps, setSteps] = useState<StepCardModel[]>([]);
  const [done, setDone] = useState<AtcDoneEvent | null>(null);
  const activeIdxRef = useRef<number>(-1);
  const startedAtRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    setSteps([]);
    setDone(null);
    activeIdxRef.current = -1;
    startedAtRef.current = new Map();
  }, [queueId]);

  useEffect(() => {
    if (queueId === null) return;

    const unsubLog = window.atcAPI.onAtcLog((event: AtcLogEvent) => {
      if (event.queueId !== queueId) return;
      const line = event.line;
      const stripped = stripLogPrefix(line);

      const startMatch = stripped.match(RE_STEP_START);
      if (startMatch) {
        const id = startMatch[1];
        const doText = startMatch[2];
        setSteps((prev) => {
          const next = prev.map((s, idx): StepCardModel => {
            if (idx !== activeIdxRef.current) return s;
            if (s.status === 'running') {
              const started = startedAtRef.current.get(s.id);
              const dur =
                started !== undefined ? Date.now() - started : s.durationMs;
              return { ...s, status: 'success', durationMs: dur };
            }
            return s;
          });
          const newCard: StepCardModel = {
            id,
            do: doText,
            status: 'running',
            log: '',
            durationMs: null,
          };
          activeIdxRef.current = next.length;
          startedAtRef.current.set(id, Date.now());
          return [...next, newCard];
        });
        return;
      }

      const unhandled = stripped.match(RE_UNHANDLED);
      if (unhandled) {
        const id = unhandled[2];
        setSteps((prev) =>
          prev.map((s): StepCardModel => {
            if (s.id !== id) return s;
            const started = startedAtRef.current.get(s.id) ?? Date.now();
            return {
              ...s,
              status: 'unhandled',
              durationMs: Date.now() - started,
              log: appendLine(s.log, line),
            };
          }),
        );
        return;
      }

      const recStart = stripped.match(RE_RECOVERY_START);
      if (recStart) {
        const rid = recStart[1];
        setSteps((prev) =>
          prev.map((s, idx): StepCardModel =>
            idx === activeIdxRef.current
              ? {
                  ...s,
                  status: 'recovering',
                  recoveryId: rid,
                  log: appendLine(s.log, line),
                }
              : s,
          ),
        );
        return;
      }

      const recDone = stripped.match(RE_RECOVERY_DONE);
      if (recDone) {
        const rid = recDone[1];
        setSteps((prev) =>
          prev.map((s, idx): StepCardModel => {
            if (idx !== activeIdxRef.current) return s;
            const started = startedAtRef.current.get(s.id) ?? Date.now();
            return {
              ...s,
              status: 'recovered',
              recoveryId: rid,
              durationMs: Date.now() - started,
              log: appendLine(s.log, line),
            };
          }),
        );
        return;
      }

      const shot = stripped.match(RE_SCREENSHOT);
      if (shot) {
        const absPath = shot[1].trim();
        setSteps((prev) =>
          prev.map((s, idx): StepCardModel => {
            if (idx !== activeIdxRef.current) return s;
            const existing = s.screenshotPaths ?? [];
            if (existing.includes(absPath)) {
              return { ...s, log: appendLine(s.log, line) };
            }
            return {
              ...s,
              screenshotPaths: [...existing, absPath],
              log: appendLine(s.log, line),
            };
          }),
        );
        return;
      }

      setSteps((prev) =>
        prev.map((s, idx): StepCardModel =>
          idx === activeIdxRef.current
            ? { ...s, log: appendLine(s.log, line) }
            : s,
        ),
      );
    });

    const unsubDone = window.atcAPI.onAtcDone((event: AtcDoneEvent) => {
      if (event.queueId !== queueId) return;
      setDone(event);
      setSteps((prev) =>
        prev.map((s, idx): StepCardModel => {
          if (s.status !== 'running' && s.status !== 'recovering') return s;
          const started = startedAtRef.current.get(s.id) ?? Date.now();
          const terminal: StepStatus =
            event.exitCode === 0
              ? 'success'
              : idx === activeIdxRef.current
                ? 'failed'
                : 'success';
          return { ...s, status: terminal, durationMs: Date.now() - started };
        }),
      );
    });

    return (): void => {
      unsubLog();
      unsubDone();
    };
  }, [queueId]);

  return { steps, done };
}
