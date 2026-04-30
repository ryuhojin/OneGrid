export interface GridResizeObserverHandle {
  disconnect(): void;
}

export function observeGridHostResize(host: HTMLElement): GridResizeObserverHandle | undefined {
  if (typeof ResizeObserver === "undefined") {
    return undefined;
  }

  const observer = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (!entry) {
      return;
    }

    const { width, height } = entry.contentRect;
    host.dataset.resizeObserved = "true";
    host.style.setProperty("--og-host-width", `${Math.round(width)}px`);
    host.style.setProperty("--og-host-height", `${Math.round(height)}px`);
  });
  observer.observe(host);

  return {
    disconnect() {
      observer.disconnect();
    }
  };
}
