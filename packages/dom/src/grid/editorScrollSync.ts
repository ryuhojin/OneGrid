import type { GridEditRuntime } from "./editRuntime.js";

export interface EditorScrollSyncHandle {
  destroy(): void;
}

const editorScrollSyncHandles = new WeakMap<HTMLElement, EditorScrollSyncHandle>();

export function attachEditorScrollSyncForHost(
  host: HTMLElement,
  viewport: HTMLElement,
  editRuntime: GridEditRuntime | undefined
): void {
  disposeEditorScrollSync(host);
  if (!editRuntime) {
    return;
  }

  editorScrollSyncHandles.set(host, attachEditorScrollSync(viewport, editRuntime));
}

export function disposeEditorScrollSync(host: HTMLElement): void {
  editorScrollSyncHandles.get(host)?.destroy();
  editorScrollSyncHandles.delete(host);
}

function attachEditorScrollSync(
  viewport: HTMLElement,
  editRuntime: GridEditRuntime
): EditorScrollSyncHandle {
  if (!editRuntime) {
    return { destroy: () => undefined };
  }

  const abortController = new AbortController();
  let frame = 0;
  const sync = (): void => {
    editRuntime.syncActiveEditOnScroll(viewport);
    if (frame !== 0) {
      cancelAnimationFrame(frame);
    }
    frame = requestAnimationFrame(() => {
      frame = 0;
      editRuntime.syncActiveEditOnScroll(viewport);
    });
  };

  viewport.addEventListener("scroll", sync, { passive: true, signal: abortController.signal });
  viewport.addEventListener("wheel", sync, { passive: true, signal: abortController.signal });
  window.addEventListener("scroll", sync, {
    capture: true,
    passive: true,
    signal: abortController.signal
  });
  window.addEventListener("resize", sync, { passive: true, signal: abortController.signal });

  return {
    destroy() {
      abortController.abort();
      if (frame !== 0) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    }
  };
}
