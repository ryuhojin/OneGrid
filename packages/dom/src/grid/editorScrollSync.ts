import type { GridEditRuntime } from "./editRuntime.js";
import type { GridScrollCoordinator, GridScrollLayoutState } from "./scrollCoordinator.js";

export interface EditorScrollSyncHandle {
  destroy(): void;
}

const editorScrollSyncHandles = new WeakMap<HTMLElement, EditorScrollSyncHandle>();

export function attachEditorScrollSyncForHost(
  host: HTMLElement,
  viewport: HTMLElement,
  editRuntime: GridEditRuntime | undefined,
  scrollCoordinator?: GridScrollCoordinator
): void {
  disposeEditorScrollSync(host);
  if (!editRuntime) {
    return;
  }

  editorScrollSyncHandles.set(host, attachEditorScrollSync(viewport, editRuntime, scrollCoordinator));
}

export function disposeEditorScrollSync(host: HTMLElement): void {
  editorScrollSyncHandles.get(host)?.destroy();
  editorScrollSyncHandles.delete(host);
}

function attachEditorScrollSync(
  viewport: HTMLElement,
  editRuntime: GridEditRuntime,
  scrollCoordinator: GridScrollCoordinator | undefined
): EditorScrollSyncHandle {
  if (!editRuntime) {
    return { destroy: () => undefined };
  }

  const abortController = new AbortController();
  let frame = 0;
  const sync = (state?: GridScrollLayoutState): void => {
    editRuntime.syncActiveEditOnScroll(viewport, state);
    if (frame !== 0) {
      cancelAnimationFrame(frame);
    }
    frame = requestAnimationFrame(() => {
      frame = 0;
      editRuntime.syncActiveEditOnScroll(viewport, scrollCoordinator?.read());
    });
  };
  const syncFromViewport = (): void => {
    sync(scrollCoordinator?.read());
  };
  const unsubscribe = scrollCoordinator?.subscribe(sync);

  if (!scrollCoordinator) {
    viewport.addEventListener("scroll", syncFromViewport, {
      passive: true,
      signal: abortController.signal
    });
    viewport.addEventListener("wheel", syncFromViewport, {
      passive: true,
      signal: abortController.signal
    });
  }
  window.addEventListener("scroll", syncFromViewport, {
    capture: true,
    passive: true,
    signal: abortController.signal
  });
  window.addEventListener("resize", syncFromViewport, { passive: true, signal: abortController.signal });

  return {
    destroy() {
      abortController.abort();
      unsubscribe?.();
      if (frame !== 0) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    }
  };
}
