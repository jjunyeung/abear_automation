/**
 * Ambient declaration for the contextBridge-exposed `window.atcAPI` surface.
 *
 * The preload script (`gui/preload/index.ts`) calls
 * `contextBridge.exposeInMainWorld('atcAPI', api)` — this file informs TypeScript
 * that renderer code may consume `window.atcAPI` with the `AtcAPI` interface
 * from gui/shared/ipc.ts.
 *
 * INV-3: renderer imports `AtcAPI` from gui/shared/ipc (the shared layer), not from preload.
 * R-T1.3: strict TS — no `any`.
 */

import type { AtcAPI } from '../../shared/ipc';

declare global {
  interface Window {
    readonly atcAPI: AtcAPI;
  }
}

export {};
