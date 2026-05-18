/**
 * ScreenshotThumb — small in-card thumbnail + click-to-lightbox.
 *
 * Fulfills:
 *   R-U7.1 — thumbnails embedded inside step cards, ≤160px wide, filename label
 *   R-U7.2 — clicking the thumbnail opens a near-full-screen lightbox; Esc closes
 *
 * Loads the PNG bytes via `window.atcAPI.screenshotRead` (sandboxed inside
 * `reports/runs/` by the main-process handler).
 *
 * INV-3 / INV-4: IPC only. No fs/HTTP. No image fetched from disk in renderer.
 * R-T1.3: strict TS, no `any`.
 */

import { Button, Dialog, Spinner } from '@blueprintjs/core';
import { useCallback, useEffect, useState, type JSX } from 'react';
import './ScreenshotThumb.css';

interface ScreenshotThumbProps {
  /** Absolute filesystem path inside reports/runs/. Main validates the sandbox. */
  absPath: string;
}

function basenameOf(absPath: string): string {
  const parts = absPath.split('/');
  return parts[parts.length - 1] ?? absPath;
}

export function ScreenshotThumb({ absPath }: ScreenshotThumbProps): JSX.Element {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    setDataUrl(null);
    setError(null);
    window.atcAPI
      .screenshotRead({ absPath })
      .then((res) => {
        if (cancelled) return;
        setDataUrl(res.dataUrl);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
      });
    return (): void => {
      cancelled = true;
    };
  }, [absPath]);

  const openLightbox = useCallback((): void => {
    if (dataUrl !== null) setLightboxOpen(true);
  }, [dataUrl]);

  const closeLightbox = useCallback((): void => {
    setLightboxOpen(false);
  }, []);

  const filename = basenameOf(absPath);

  if (error !== null) {
    return (
      <div className="screenshot-thumb screenshot-thumb--error" title={absPath}>
        <span className="screenshot-thumb__error">스크린샷 로드 실패: {error}</span>
        <span className="screenshot-thumb__filename">{filename}</span>
      </div>
    );
  }

  if (dataUrl === null) {
    return (
      <div className="screenshot-thumb screenshot-thumb--loading" title={absPath}>
        <div className="screenshot-thumb__placeholder" aria-label="로딩 중">
          <Spinner />
        </div>
        <span className="screenshot-thumb__filename">{filename}</span>
      </div>
    );
  }

  return (
    <>
      <div className="screenshot-thumb">
        <Button
          minimal
          className="screenshot-thumb__button"
          onClick={openLightbox}
          title={`${filename} — 클릭하여 확대`}
        >
          <img
            src={dataUrl}
            alt={filename}
            className="screenshot-thumb__img"
            draggable={false}
          />
        </Button>
        <span className="screenshot-thumb__filename" title={absPath}>
          {filename}
        </span>
      </div>
      <Dialog
        isOpen={lightboxOpen}
        onClose={closeLightbox}
        title={filename}
        className="screenshot-lightbox-dialog"
        canEscapeKeyClose
        canOutsideClickClose
        style={{ width: '90vw', maxWidth: 'none' }}
      >
        <div className="screenshot-lightbox" onClick={closeLightbox}>
          <img
            src={dataUrl}
            alt={filename}
            className="screenshot-lightbox__img"
            onClick={(e): void => e.stopPropagation()}
            draggable={false}
          />
        </div>
      </Dialog>
    </>
  );
}
