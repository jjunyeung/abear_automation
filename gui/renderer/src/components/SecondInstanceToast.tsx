/**
 * SecondInstanceToast — Blueprint toast triggered when main detects a second
 * Electron launch.
 *
 * Migration: 자체 transient div → Blueprint OverlayToaster.show. ErrorToast 와는
 * 다른 의도(intent=primary)로 띄워서 사용자에게 정보성 알림임을 명확히.
 *
 * Fulfills:
 *   R-U10.2 — "Already open — only one window allowed" 4–6초 토스트
 *   R-U10.3 — 구조적 차단은 main 측 책임 — 본 컴포넌트는 informational only
 */

import { OverlayToaster, type Toaster } from '@blueprintjs/core';
import { useEffect, useRef, type JSX } from 'react';

let cachedToaster: Toaster | null = null;
async function getToaster(): Promise<Toaster> {
  if (cachedToaster !== null) return cachedToaster;
  cachedToaster = await OverlayToaster.createAsync({
    position: 'top',
    maxToasts: 2,
  });
  return cachedToaster;
}

export function SecondInstanceToast(): JSX.Element | null {
  const mountedRef = useRef<boolean>(false);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    const unsubscribe = window.atcAPI.onAppSecondInstance(() => {
      void getToaster().then((toaster) => {
        toaster.show({
          message: '이미 실행 중인 윈도우입니다 — only one window allowed.',
          intent: 'primary',
          icon: 'info-sign',
          timeout: 5_000,
        });
      });
    });
    return (): void => {
      unsubscribe();
    };
  }, []);

  return null;
}
