/**
 * Screenshot read handler (main process).
 *
 * Fulfills:
 *   R-U7.1 — thumbnail bytes served to renderer for in-card display
 *   R-U7.2 — same bytes drive the lightbox overlay at full resolution
 *
 * Invariants:
 *   INV-2 / R-T8.2 — reports/runs/ is read-only. We only `readFile` PNGs;
 *                    never write/move/delete.
 *   INV-3         — only electron + node stdlib + ../shared/ipc.
 *   INV-4         — no http/ws.
 *
 * Sandbox:
 *   The renderer hands us an absolute path. We resolve it and refuse to read
 *   anything outside the project's `reports/runs/` tree. This prevents a
 *   compromised or buggy renderer from probing the user's filesystem via the
 *   IPC channel.
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import type { ScreenshotReadResult } from '../shared/ipc';

const RUNS_DIR_REL = path.join('reports', 'runs');
const ALLOWED_EXT = new Set<string>(['.png', '.jpg', '.jpeg']);

function runsRoot(): string {
  return path.resolve(process.cwd(), RUNS_DIR_REL);
}

/**
 * Read a screenshot file from inside `reports/runs/` and return it as a
 * data URL the renderer can drop into an `<img src>` attribute.
 *
 * Throws when:
 *   - path resolves outside `reports/runs/` (sandbox violation)
 *   - extension is not a known image format
 *   - file does not exist / cannot be read
 */
export async function readScreenshot(
  absPath: string,
): Promise<ScreenshotReadResult> {
  if (typeof absPath !== 'string' || absPath.length === 0) {
    throw new Error('screenshot:read — absPath required');
  }

  const resolved = path.resolve(absPath);
  const root = runsRoot();
  // Strict containment check: resolved must be a descendant of root.
  // We append path.sep to root so e.g. `/x/reports/runs-other/...` is rejected.
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (resolved !== root && !resolved.startsWith(rootWithSep)) {
    throw new Error(
      `screenshot:read — refusing path outside reports/runs: ${resolved}`,
    );
  }

  const ext = path.extname(resolved).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    throw new Error(`screenshot:read — unsupported extension: ${ext}`);
  }

  const buf = await fs.readFile(resolved);
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
  const dataUrl = `data:${mime};base64,${buf.toString('base64')}`;
  return { dataUrl };
}
