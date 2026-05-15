export interface GridResizeObserverHandle {
  disconnect(): void;
}

export interface GridResizeRect {
  readonly width: number;
  readonly height: number;
}

export type GridResizeCallback = (rect: GridResizeRect) => void;

const retainedResizeHandles = new WeakMap<HTMLElement, Set<GridResizeObserverHandle>>();

export function observeGridHostResize(
  host: HTMLElement,
  onResize?: GridResizeCallback
): GridResizeObserverHandle | undefined {
  return observeElementResize(host, ({ width, height }) => {
    host.dataset.resizeObserved = "true";
    host.style.setProperty("--og-host-width", `${Math.round(width)}px`);
    host.style.setProperty("--og-host-height", `${Math.round(height)}px`);
    onResize?.({ width, height });
  });
}

export function observeElementResize(
  element: HTMLElement,
  onResize: GridResizeCallback
): GridResizeObserverHandle | undefined {
  if (typeof ResizeObserver === "undefined") {
    return undefined;
  }

  let frame = 0;
  let lastWidth = -1;
  let lastHeight = -1;
  const observer = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (!entry) {
      return;
    }

    const { width, height } = entry.contentRect;
    if (Math.abs(width - lastWidth) < 0.5 && Math.abs(height - lastHeight) < 0.5) {
      return;
    }
    lastWidth = width;
    lastHeight = height;
    if (frame !== 0) {
      cancelAnimationFrame(frame);
    }
    frame = requestAnimationFrame(() => {
      frame = 0;
      onResize({ width, height });
    });
  });
  observer.observe(element);

  const handle: GridResizeObserverHandle = {
    disconnect() {
      if (frame !== 0) {
        cancelAnimationFrame(frame);
      }
      observer.disconnect();
      retainedResizeHandles.get(element)?.delete(handle);
    }
  };
  let handles = retainedResizeHandles.get(element);
  if (!handles) {
    handles = new Set();
    retainedResizeHandles.set(element, handles);
  }
  handles.add(handle);
  return handle;
}
