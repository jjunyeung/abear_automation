/**
 * useKeyboardShortcuts — global keyboard handlers for the renderer shell.
 *
 * Fulfills:
 *   R-U9.1 — Cmd+Enter triggers Run (parent provides `onRun`)
 *   R-U9.2 — Cmd+/ focuses catalog search (parent provides `onFocusSearch`)
 *   R-U9.3 — Esc handled by individual overlays (CloseConfirmDialog, Cmd+K palette);
 *            this hook intentionally does NOT intercept Esc globally to avoid
 *            stealing it from the overlays that own it.
 *
 * R-U9.4 (Cmd+K command palette) and R-U9.5 (Cmd+Shift+Enter instant run from
 * palette) are deferred to a follow-up task that ships the palette component
 * itself; this hook exposes hook points (`onOpenPalette`) that the palette
 * task can wire into.
 *
 * Cmd+R is a renderer reload (calls window.atcAPI.catalogReload). It is NOT
 * mapped to the browser's hard reload because the renderer is an Electron
 * BrowserWindow — a literal window.location.reload would discard the React
 * tree and disconnect IPC listeners.
 *
 * INV-3 / INV-4: pure DOM + window.atcAPI; no fs/HTTP.
 * R-T1.3: strict TS, no `any`.
 */

import { useEffect } from 'react';

export interface KeyboardShortcutsOptions {
  /** Called on Cmd+Enter when not inside an overlay. */
  onRun?: () => void;
  /** Called on Cmd+R; defaults to no-op if undefined. */
  onReload?: () => void;
  /** Called on Cmd+/ to focus the catalog search input. */
  onFocusSearch?: () => void;
  /** Called on Cmd+K to open the command palette (future). */
  onOpenPalette?: () => void;
  /** When true, all shortcuts are no-ops (e.g. a confirm modal is up). */
  disabled?: boolean;
}

function isMetaCombo(e: KeyboardEvent): boolean {
  // macOS-only project (INV-8); Cmd is e.metaKey.
  return e.metaKey && !e.ctrlKey && !e.altKey;
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions): void {
  const { onRun, onReload, onFocusSearch, onOpenPalette, disabled } = options;

  useEffect(() => {
    if (disabled === true) return;

    const handler = (e: KeyboardEvent): void => {
      // R-U9.1 — Cmd+Enter → Run
      if (isMetaCombo(e) && !e.shiftKey && e.key === 'Enter') {
        if (onRun) {
          e.preventDefault();
          onRun();
        }
        return;
      }

      // Cmd+R / Cmd+Shift+R — reload catalog. Both forms triggered the same IPC
      // because users naturally try Shift+R as a "harder" reload; without
      // intercepting it, Electron's default fires a browser-style renderer reload
      // that hits the cached `catalog:list` snapshot and never re-parses YAML.
      if (isMetaCombo(e) && e.key.toLowerCase() === 'r') {
        if (onReload) {
          e.preventDefault();
          onReload();
        }
        return;
      }

      // R-U9.2 — Cmd+/ → focus catalog search
      if (isMetaCombo(e) && !e.shiftKey && e.key === '/') {
        if (onFocusSearch) {
          e.preventDefault();
          onFocusSearch();
        }
        return;
      }

      // R-U9.4 surface — Cmd+K → open palette
      if (isMetaCombo(e) && !e.shiftKey && e.key.toLowerCase() === 'k') {
        if (onOpenPalette) {
          e.preventDefault();
          onOpenPalette();
        }
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return (): void => {
      window.removeEventListener('keydown', handler);
    };
  }, [onRun, onReload, onFocusSearch, onOpenPalette, disabled]);
}
