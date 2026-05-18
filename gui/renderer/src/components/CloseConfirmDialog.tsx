/**
 * CloseConfirmDialog — modal dialog shown when the user tries to close the window
 * (or quit the app) while a Playwright spawn is active.
 *
 * Fulfills:
 *   R-B6.3   — kill / detach / cancel choice surface
 *   R-T18.1  — "kill" path → SIGTERM (main handles cancelActive + window.close)
 *   R-T18.2  — "detach" path → child unref + window closes + completion notification
 *   R-U9.3   — Esc closes the modal (cancel)
 *
 * INV-3 / INV-4: window.atcAPI.appCloseConfirm only — no fs/HTTP.
 * R-T1.3: strict TS, no `any`.
 */

import { Button, Dialog, DialogBody, DialogFooter } from '@blueprintjs/core';
import { useEffect, useState, type JSX } from 'react';
import type { AppCloseAttemptEvent, CloseConfirmChoice } from '../../../shared/ipc';

export function CloseConfirmDialog(): JSX.Element | null {
  const [attempt, setAttempt] = useState<AppCloseAttemptEvent | null>(null);

  useEffect(() => {
    const unsubscribe = window.atcAPI.onAppCloseAttempt((event) => {
      setAttempt(event);
    });
    return (): void => {
      unsubscribe();
    };
  }, []);

  const choose = (choice: CloseConfirmChoice): void => {
    window.atcAPI.appCloseConfirm({ choice });
    setAttempt(null);
  };

  // R-U9.3 — Esc 는 Dialog 의 onClose (canEscapeKeyClose=true) 가 처리.
  return (
    <Dialog
      isOpen={attempt !== null}
      title="실행 중인 ATC 가 있습니다"
      icon="warning-sign"
      onClose={(): void => choose('cancel')}
      canOutsideClickClose={false}
      canEscapeKeyClose={true}
    >
      <DialogBody>
        <p>
          현재 실행 중인 run (<code>{attempt?.queueId || '—'}</code>) 을 어떻게
          처리할까요?
        </p>
      </DialogBody>
      <DialogFooter
        actions={
          <>
            <Button onClick={(): void => choose('cancel')}>취소</Button>
            <Button
              intent="warning"
              icon="offline"
              onClick={(): void => choose('detach')}
            >
              Detach (백그라운드 계속)
            </Button>
            <Button
              intent="danger"
              icon="cross"
              onClick={(): void => choose('kill')}
            >
              Kill (즉시 종료)
            </Button>
          </>
        }
      />
    </Dialog>
  );
}
