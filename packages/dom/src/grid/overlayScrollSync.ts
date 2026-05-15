import type { GridScrollLayoutState } from "./scrollCoordinator.js";
import { getGridScrollCoordinator } from "./scrollCoordinator.js";

export interface OverlayScrollSyncHandle {
  destroy(): void;
}

export function attachOverlayScrollSync(input: {
  readonly anchor?: HTMLElement;
  readonly onUpdate: (state?: GridScrollLayoutState) => void;
  readonly onAnchorMissing?: () => void;
}): OverlayScrollSyncHandle {
  const abortController = new AbortController();
  const coordinator = input.anchor ? getGridScrollCoordinator(input.anchor) : undefined;
  let frame = 0;

  const schedule = (state?: GridScrollLayoutState): void => {
    if (frame !== 0) {
      cancelAnimationFrame(frame);
    }
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (input.anchor && !input.anchor.isConnected) {
        input.onAnchorMissing?.();
        return;
      }
      input.onUpdate(state ?? coordinator?.read());
    });
  };
  const scheduleFromDom = (): void => {
    schedule(coordinator?.read());
  };
  const unsubscribe = coordinator?.subscribe(schedule);

  window.addEventListener("resize", scheduleFromDom, {
    passive: true,
    signal: abortController.signal
  });
  window.addEventListener("scroll", scheduleFromDom, {
    capture: true,
    passive: true,
    signal: abortController.signal
  });

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
