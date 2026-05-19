/**
 * URL pool — IPC handler 본체.
 *
 * 책임:
 *   - renderer 의 pool:list / pool:add / pool:remove 요청을 `lib/url-pool` 로 위임.
 *   - run-queue 가 spawn 직전 headPop 으로 풀을 변경했을 때 renderer 에 push (broadcastPoolUpdated).
 *
 * INV-3: lib/url-pool 만 import. tests/atcs/recoveries 미import.
 * INV-4: 네트워크 X — Electron IPC + 파일시스템 (lib/url-pool 경유) 만.
 */

import { BrowserWindow } from 'electron';
import {
  PUSH_CHANNELS,
  type PoolAddArgs,
  type PoolMutationResult,
  type PoolRemoveArgs,
} from '../shared/ipc';
import { addToPool, listPool, removeFromPool } from '../../lib/url-pool';

export function handlePoolList(): string[] {
  return listPool();
}

export function handlePoolAdd(args: PoolAddArgs): PoolMutationResult {
  const result = addToPool(args.urls);
  const urls = listPool();
  broadcastPoolUpdated(urls);
  return { urls, affected: result.added };
}

export function handlePoolRemove(args: PoolRemoveArgs): PoolMutationResult {
  const result = removeFromPool(args.url);
  const urls = listPool();
  broadcastPoolUpdated(urls);
  return { urls, affected: result.removed };
}

/**
 * 모든 활성 BrowserWindow 에 pool:updated push. run-queue 의 headPop 도 같은 함수
 * 호출해 UI 가 즉시 새로 그려지게 한다.
 */
export function broadcastPoolUpdated(urls: string[]): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue;
    win.webContents.send(PUSH_CHANNELS.poolUpdated, urls);
  }
}
