/**
 * ErrorToast — surfaces main-process errors as Blueprint toasts.
 *
 * Migration note: 기존 자체 stack 구현을 Blueprint OverlayToaster (imperative API)
 * 로 교체. 본 컴포넌트는 토스트를 띄우는 사이드 이펙트만 갖는다 — JSX 자체는
 * 마운트되지 않으므로 null 을 반환.
 *
 * Fulfills:
 *   R-B4.1 — 메인 프로세스가 push 하는 `app:uncaught-error` 를 받아 비차단
 *            토스트로 사용자에게 알림.
 *
 * INV-3 / INV-4: window.atcAPI 만 사용. 토스트 UI 는 Blueprint Portal 로 자체 렌더.
 */

import { OverlayToaster, type Toaster } from '@blueprintjs/core';
import { useEffect, useRef, type JSX } from 'react';
import type { AppUncaughtErrorEvent } from '../../../shared/ipc';

let cachedToaster: Toaster | null = null;
async function getToaster(): Promise<Toaster> {
  if (cachedToaster !== null) return cachedToaster;
  cachedToaster = await OverlayToaster.createAsync({
    position: 'top-right',
    maxToasts: 4,
  });
  return cachedToaster;
}

export function ErrorToast(): JSX.Element | null {
  // 중복 구독 방지를 위해 mount 1회로 강제.
  const mountedRef = useRef<boolean>(false);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    const unsubscribe = window.atcAPI.onAppUncaughtError(
      (event: AppUncaughtErrorEvent) => {
        const detail = event.detail !== null ? `\n${event.detail}` : '';
        void getToaster().then((toaster) => {
          toaster.show({
            message: `[${event.scope}] ${event.message}${detail}`,
            intent: 'danger',
            icon: 'error',
            timeout: 6_000,
          });
        });
      },
    );
    return (): void => {
      unsubscribe();
    };
  }, []);

  return null;
}
