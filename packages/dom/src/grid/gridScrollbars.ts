import type { LayoutPane } from "@onegrid/core";

const MIN_THUMB_SIZE = 28;
const SCROLL_LINE = 40;
const LOGICAL_SCROLL_EVENT = "onegrid:logical-scroll";
const CONTROLLED_SCROLL_RESTORE = "true";
let nextScrollbarViewportId = 0;

export interface GridScrollbarInput<TData> {
  readonly grid: HTMLElement;
  readonly viewport: HTMLElement;
  readonly panes: Readonly<Record<"left" | "center" | "right", LayoutPane<TData>>>;
}

export interface GridScrollbarHandle {
  destroy(): void;
}

const scrollbarHandles = new WeakMap<HTMLElement, GridScrollbarHandle>();

export function attachGridScrollbarsForHost<TData>(
  host: HTMLElement,
  input: GridScrollbarInput<TData>
): void {
  disposeGridScrollbars(host);
  scrollbarHandles.set(host, attachGridScrollbars(input));
}

export function disposeGridScrollbars(host: HTMLElement): void {
  scrollbarHandles.get(host)?.destroy();
  scrollbarHandles.delete(host);
}

export function attachGridScrollbars<TData>(input: GridScrollbarInput<TData>): GridScrollbarHandle {
  const abortController = new AbortController();
  let frame = 0;
  const layer = document.createElement("div");
  layer.className = "og-grid__scrollbar-layer";
  layer.setAttribute("role", "presentation");

  const viewportId = ensureViewportId(input.viewport);
  const vertical = createTrack("vertical", viewportId);
  const horizontal = createTrack("horizontal", viewportId);
  layer.append(vertical.track, horizontal.track);
  input.grid.append(layer);

  const sync = () => {
    frame = 0;
    const changed = syncScrollbarPresence(input.grid, input.viewport);
    syncTrack(input.viewport, vertical, "vertical");
    syncTrack(input.viewport, horizontal, "horizontal");
    if (changed) {
      scheduleSync();
    }
  };
  const scheduleSync = () => {
    if (frame === 0) {
      frame = requestAnimationFrame(sync);
    }
  };

  input.viewport.addEventListener("scroll", scheduleSync, {
    passive: true,
    signal: abortController.signal
  });
  addTrackInteractions(input.viewport, vertical, "vertical", abortController.signal);
  addTrackInteractions(input.viewport, horizontal, "horizontal", abortController.signal);

  let resizeObserver: ResizeObserver | undefined;
  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(scheduleSync);
    resizeObserver.observe(input.grid);
    resizeObserver.observe(input.viewport);
  }

  scheduleSync();

  return {
    destroy() {
      abortController.abort();
      if (frame !== 0) {
        cancelAnimationFrame(frame);
      }
      resizeObserver?.disconnect();
      layer.remove();
    }
  };
}

type Orientation = "vertical" | "horizontal";

interface ScrollbarTrack {
  readonly track: HTMLElement;
  readonly thumb: HTMLElement;
}

interface ScrollPositionOptions {
  readonly deferRemoteLoad?: boolean;
}

function createTrack(orientation: Orientation, viewportId: string): ScrollbarTrack {
  const track = document.createElement("div");
  track.className = `og-grid__scrollbar og-grid__scrollbar--${orientation}`;
  track.dataset.scrollbarOrientation = orientation;
  track.setAttribute("aria-hidden", "true");
  track.dataset.scrollbarControls = viewportId;

  const thumb = document.createElement("div");
  thumb.className = "og-grid__scrollbar-thumb";
  track.append(thumb);
  return { track, thumb };
}

function ensureViewportId(viewport: HTMLElement): string {
  if (!viewport.id) {
    viewport.id = `og-body-viewport-${++nextScrollbarViewportId}`;
  }
  return viewport.id;
}

function syncScrollbarPresence(host: HTMLElement, viewport: HTMLElement): boolean {
  const hasVertical = getMaxScroll(viewport, "vertical") > 0;
  const hasHorizontal = getMaxScroll(viewport, "horizontal") > 0;
  const root = host.closest(".og-grid");
  const rootElement = root instanceof HTMLElement ? root : undefined;
  const hostVerticalChanged = setDatasetFlag(host, "scrollbarVertical", hasVertical);
  const hostHorizontalChanged = setDatasetFlag(host, "scrollbarHorizontal", hasHorizontal);
  const rootVerticalChanged = setRootDatasetFlag(rootElement, "scrollbarVertical", hasVertical);
  const rootHorizontalChanged = setRootDatasetFlag(rootElement, "scrollbarHorizontal", hasHorizontal);
  return hostVerticalChanged || hostHorizontalChanged || rootVerticalChanged || rootHorizontalChanged;
}

function setDatasetFlag(element: HTMLElement, key: "scrollbarVertical" | "scrollbarHorizontal", enabled: boolean): boolean {
  const current = element.dataset[key] === "true";
  if (current === enabled) {
    return false;
  }

  if (enabled) {
    element.dataset[key] = "true";
    return true;
  }

  if (key === "scrollbarVertical") {
    delete element.dataset.scrollbarVertical;
    return true;
  }

  delete element.dataset.scrollbarHorizontal;
  return true;
}

function setRootDatasetFlag(
  element: HTMLElement | undefined,
  key: "scrollbarVertical" | "scrollbarHorizontal",
  enabled: boolean
): boolean {
  if (!element) {
    return false;
  }

  return setDatasetFlag(element, key, enabled);
}

function syncTrack(
  viewport: HTMLElement,
  scrollbar: ScrollbarTrack,
  orientation: Orientation
): void {
  const maxScroll = getMaxScroll(viewport, orientation);
  scrollbar.track.hidden = maxScroll <= 0;
  if (maxScroll <= 0) {
    return;
  }

  const trackSize = getTrackSize(scrollbar.track, orientation);
  const viewportSize = getViewportSize(viewport, orientation);
  const scrollSize = getScrollSize(viewport, orientation);
  const thumbSize = Math.max(MIN_THUMB_SIZE, Math.round((trackSize * viewportSize) / scrollSize));
  const travel = Math.max(0, trackSize - thumbSize);
  const offset = Math.round((travel * getScrollPosition(viewport, orientation)) / maxScroll);

  setThumbGeometry(scrollbar.thumb, orientation, thumbSize, offset);
  scrollbar.track.setAttribute("aria-valuemax", String(Math.round(maxScroll)));
  scrollbar.track.setAttribute("aria-valuenow", String(Math.round(getScrollPosition(viewport, orientation))));
}

function addTrackInteractions(
  viewport: HTMLElement,
  scrollbar: ScrollbarTrack,
  orientation: Orientation,
  signal: AbortSignal
): void {
  scrollbar.track.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    const target = event.target instanceof Node ? event.target : undefined;
    const thumbDrag = target ? scrollbar.thumb.contains(target) : false;
    const startPointer = getPointerPosition(event, orientation);
    const pointerAnchor = getPointerAnchor(scrollbar, orientation, startPointer, thumbDrag);
    const setScrollFromPointer = (pointer: number, options: ScrollPositionOptions = {}) => {
      const trackRect = scrollbar.track.getBoundingClientRect();
      const trackStart = orientation === "vertical" ? trackRect.top : trackRect.left;
      const trackSize = getTrackSize(scrollbar.track, orientation);
      const thumbSize = getThumbSize(scrollbar.thumb, orientation);
      const travel = Math.max(1, trackSize - thumbSize);
      const maxScroll = getMaxScroll(viewport, orientation);
      const nextOffset = !thumbDrag && pointer >= trackStart + trackSize - thumbSize / 2
        ? travel
        : !thumbDrag && pointer <= trackStart + thumbSize / 2
          ? 0
          : Math.max(0, Math.min(travel, pointer - trackStart - pointerAnchor));
      setScrollPosition(viewport, orientation, (nextOffset * maxScroll) / travel, options);
    };

    scrollbar.track.setPointerCapture(event.pointerId);
    if (!thumbDrag) {
      setScrollFromPointer(startPointer);
    }

    const onMove = (moveEvent: PointerEvent) => {
      setScrollFromPointer(getPointerPosition(moveEvent, orientation), { deferRemoteLoad: thumbDrag });
    };
    const onUp = (upEvent: PointerEvent) => {
      if (thumbDrag) {
        setScrollPosition(viewport, orientation, getScrollPosition(viewport, orientation));
      }
      scrollbar.track.releasePointerCapture(upEvent.pointerId);
      scrollbar.track.removeEventListener("pointermove", onMove);
      scrollbar.track.removeEventListener("pointerup", onUp);
      scrollbar.track.removeEventListener("pointercancel", onUp);
    };

    scrollbar.track.addEventListener("pointermove", onMove, { signal });
    scrollbar.track.addEventListener("pointerup", onUp, { signal });
    scrollbar.track.addEventListener("pointercancel", onUp, { signal });
  }, { signal });

  scrollbar.track.addEventListener("keydown", (event) => {
    const delta = getKeyboardDelta(event.key, viewport, orientation);
    if (delta === 0) {
      return;
    }

    event.preventDefault();
    setScrollPosition(viewport, orientation, getScrollPosition(viewport, orientation) + delta);
  }, { signal });
}

function getPointerAnchor(
  scrollbar: ScrollbarTrack,
  orientation: Orientation,
  pointer: number,
  thumbDrag: boolean
): number {
  const trackRect = scrollbar.track.getBoundingClientRect();
  const trackStart = orientation === "vertical" ? trackRect.top : trackRect.left;
  const thumbSize = getThumbSize(scrollbar.thumb, orientation);
  if (!thumbDrag) {
    return thumbSize / 2;
  }

  return pointer - trackStart - getThumbOffset(scrollbar.thumb, orientation);
}

function setThumbGeometry(
  thumb: HTMLElement,
  orientation: Orientation,
  size: number,
  offset: number
): void {
  if (orientation === "vertical") {
    thumb.style.blockSize = `${size}px`;
    thumb.style.inlineSize = "";
    thumb.style.transform = `translateY(${offset}px)`;
    return;
  }

  thumb.style.inlineSize = `${size}px`;
  thumb.style.blockSize = "";
  thumb.style.transform = `translateX(${offset}px)`;
}

function getKeyboardDelta(key: string, viewport: HTMLElement, orientation: Orientation): number {
  const page = orientation === "vertical" ? viewport.clientHeight : viewport.clientWidth;
  const line = SCROLL_LINE;
  if (key === "ArrowDown" || key === "ArrowRight") return line;
  if (key === "ArrowUp" || key === "ArrowLeft") return -line;
  if (key === "PageDown") return page;
  if (key === "PageUp") return -page;
  if (key === "Home") return -getScrollPosition(viewport, orientation);
  if (key === "End") return getMaxScroll(viewport, orientation);
  return 0;
}

function getPointerPosition(event: PointerEvent, orientation: Orientation): number {
  return orientation === "vertical" ? event.clientY : event.clientX;
}

function getScrollPosition(viewport: HTMLElement, orientation: Orientation): number {
  if (orientation === "vertical") {
    return getLogicalScrollMetric(viewport, "logicalScrollTop") ?? viewport.scrollTop;
  }

  return viewport.scrollLeft;
}

function getMaxScroll(viewport: HTMLElement, orientation: Orientation): number {
  if (orientation === "vertical") {
    return getLogicalScrollMetric(viewport, "logicalScrollMax")
      ?? Math.max(0, viewport.scrollHeight - viewport.clientHeight);
  }

  return Math.max(0, viewport.scrollWidth - viewport.clientWidth);
}

function getViewportSize(viewport: HTMLElement, orientation: Orientation): number {
  return orientation === "vertical" ? viewport.clientHeight : viewport.clientWidth;
}

function getScrollSize(viewport: HTMLElement, orientation: Orientation): number {
  if (orientation === "vertical") {
    return getLogicalScrollMetric(viewport, "logicalScrollHeight") ?? viewport.scrollHeight;
  }

  return viewport.scrollWidth;
}

function setScrollPosition(
  viewport: HTMLElement,
  orientation: Orientation,
  value: number,
  options: ScrollPositionOptions = {}
): void {
  const maxScroll = getMaxScroll(viewport, orientation);
  const nextValue = Math.max(0, Math.min(maxScroll, value));
  if (orientation === "vertical" && hasLogicalVerticalScroll(viewport)) {
    viewport.dataset.logicalScrollTop = String(nextValue);
    viewport.dataset.logicalScrollRestoring = CONTROLLED_SCROLL_RESTORE;
    viewport.dispatchEvent(new CustomEvent(LOGICAL_SCROLL_EVENT, {
      detail: {
        scrollTop: nextValue,
        deferRemoteLoad: options.deferRemoteLoad === true
      }
    }));
    viewport.dispatchEvent(new Event("scroll"));
    requestAnimationFrame(() => {
      if (viewport.dataset.logicalScrollRestoring === CONTROLLED_SCROLL_RESTORE) {
        delete viewport.dataset.logicalScrollRestoring;
      }
    });
    return;
  }

  if (orientation === "vertical") {
    viewport.scrollTop = nextValue;
    return;
  }

  viewport.scrollLeft = nextValue;
}

function hasLogicalVerticalScroll(viewport: HTMLElement): boolean {
  return getLogicalScrollMetric(viewport, "logicalScrollMax") !== undefined
    && getLogicalScrollMetric(viewport, "logicalScrollHeight") !== undefined;
}

function getLogicalScrollMetric(
  viewport: HTMLElement,
  key: "logicalScrollTop" | "logicalScrollMax" | "logicalScrollHeight"
): number | undefined {
  const rawValue = viewport.dataset[key];
  if (rawValue === undefined) {
    return undefined;
  }

  const value = Number(rawValue);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

function getTrackSize(track: HTMLElement, orientation: Orientation): number {
  return orientation === "vertical" ? track.clientHeight : track.clientWidth;
}

function getThumbSize(thumb: HTMLElement, orientation: Orientation): number {
  return orientation === "vertical" ? thumb.offsetHeight : thumb.offsetWidth;
}

function getThumbOffset(thumb: HTMLElement, orientation: Orientation): number {
  const style = getComputedStyle(thumb).transform;
  const transform = style === "none"
    ? new DOMMatrixReadOnly()
    : new DOMMatrixReadOnly(style);
  return orientation === "vertical" ? transform.m42 : transform.m41;
}
