import type { LayoutPane } from "@onegrid/core";
import {
  getKeyboardDelta,
  getMaxScroll,
  getPointerPosition,
  getScrollPosition,
  getThumbOffset,
  getThumbSize,
  getTrackRectSize,
  getTrackSize,
  setScrollPosition
} from "./gridScrollbarMetrics.js";
import type { Orientation, ScrollPositionOptions } from "./gridScrollbarMetrics.js";
import type { GridScrollCoordinator, GridScrollLayoutState } from "./scrollCoordinator.js";
import { readGridScrollLayoutState } from "./scrollCoordinator.js";

const MIN_THUMB_SIZE = 28;
let nextScrollbarViewportId = 0;

export interface GridScrollbarInput<TData> {
  readonly grid: HTMLElement;
  readonly layerHost?: HTMLElement;
  readonly viewport: HTMLElement;
  readonly panes: Readonly<Record<"left" | "center" | "right", LayoutPane<TData>>>;
  readonly scrollCoordinator?: GridScrollCoordinator;
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
  layer.style.visibility = "hidden";
  const layerHost = input.layerHost ?? input.grid;

  const viewportId = ensureViewportId(input.viewport);
  const vertical = createTrack("vertical", viewportId);
  const horizontal = createTrack("horizontal", viewportId);
  layer.append(vertical.track, horizontal.track);
  syncLayerBounds(layerHost, input.grid, layer);
  layerHost.append(layer);

  const sync = () => {
    frame = 0;
    syncLayerBounds(layerHost, input.grid, layer);
    const state = input.scrollCoordinator?.sync() ?? readGridScrollLayoutState(input.viewport);
    const changed = syncScrollbarPresence(input.grid, state);
    syncTrack(input.viewport, vertical, "vertical", state);
    syncTrack(input.viewport, horizontal, "horizontal", state);
    if (changed) {
      scheduleSync();
    }
    layer.style.visibility = "";
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
  addTrackInteractions(input.viewport, vertical, "vertical", abortController.signal, input.scrollCoordinator);
  addTrackInteractions(input.viewport, horizontal, "horizontal", abortController.signal, input.scrollCoordinator);

  let resizeObserver: ResizeObserver | undefined;
  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(scheduleSync);
    resizeObserver.observe(layerHost);
    resizeObserver.observe(input.grid);
    resizeObserver.observe(input.viewport);
  }

  sync();

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

function syncLayerBounds(layerHost: HTMLElement, grid: HTMLElement, layer: HTMLElement): void {
  if (layerHost === grid) {
    layer.style.inset = "0";
    layer.style.blockSize = "";
    layer.style.inlineSize = "";
    return;
  }

  const hostRect = layerHost.getBoundingClientRect();
  const gridRect = grid.getBoundingClientRect();
  layer.style.inset = "";
  layer.style.insetBlockStart = `${gridRect.top - hostRect.top}px`;
  layer.style.insetInlineStart = `${gridRect.left - hostRect.left}px`;
  layer.style.inlineSize = `${gridRect.width}px`;
  layer.style.blockSize = `${gridRect.height}px`;
}

interface ScrollbarTrack {
  readonly track: HTMLElement;
  readonly thumb: HTMLElement;
}

function createTrack(orientation: Orientation, viewportId: string): ScrollbarTrack {
  const track = document.createElement("div");
  track.className = `og-grid__scrollbar og-grid__scrollbar--${orientation}`;
  track.dataset.scrollbarOrientation = orientation;
  track.dataset.scrollbarControls = viewportId;
  track.setAttribute("aria-controls", viewportId);
  track.setAttribute("aria-label", orientation === "vertical"
    ? "Vertical grid scrollbar"
    : "Horizontal grid scrollbar");
  track.setAttribute("aria-orientation", orientation);
  track.setAttribute("aria-valuemin", "0");
  track.setAttribute("role", "scrollbar");
  track.tabIndex = 0;

  const thumb = document.createElement("div");
  thumb.className = "og-grid__scrollbar-thumb";
  thumb.setAttribute("aria-hidden", "true");
  track.append(thumb);
  return { track, thumb };
}

function ensureViewportId(viewport: HTMLElement): string {
  if (!viewport.id) {
    viewport.id = `og-body-viewport-${++nextScrollbarViewportId}`;
  }
  return viewport.id;
}

function syncScrollbarPresence(host: HTMLElement, state: GridScrollLayoutState): boolean {
  const hasVertical = state.hasVerticalScroll;
  const hasHorizontal = state.hasHorizontalScroll;
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
  orientation: Orientation,
  state: GridScrollLayoutState
): void {
  const maxScroll = orientation === "vertical" ? state.maxScrollTop : state.maxScrollLeft;
  scrollbar.track.hidden = maxScroll <= 0;
  if (maxScroll <= 0) {
    scrollbar.track.tabIndex = -1;
    return;
  }
  scrollbar.track.tabIndex = 0;

  const trackSize = getTrackSize(scrollbar.track, orientation);
  const viewportSize = orientation === "vertical" ? state.viewportHeight : state.viewportWidth;
  const scrollSize = orientation === "vertical" ? state.scrollHeight : state.scrollWidth;
  const thumbSize = Math.max(MIN_THUMB_SIZE, Math.round((trackSize * viewportSize) / scrollSize));
  const travel = Math.max(0, trackSize - thumbSize);
  const scrollPosition = orientation === "vertical" ? state.scrollTop : state.scrollLeft;
  const offset = Math.round((travel * scrollPosition) / maxScroll);

  setThumbGeometry(scrollbar.thumb, orientation, thumbSize, offset);
  scrollbar.track.setAttribute("aria-valuemax", String(Math.round(maxScroll)));
  scrollbar.track.setAttribute("aria-valuenow", String(Math.round(scrollPosition)));
  scrollbar.track.setAttribute("aria-valuetext", createScrollValueText(scrollPosition, maxScroll));
}

function addTrackInteractions(
  viewport: HTMLElement,
  scrollbar: ScrollbarTrack,
  orientation: Orientation,
  signal: AbortSignal,
  scrollCoordinator: GridScrollCoordinator | undefined
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
      const trackSize = getTrackRectSize(trackRect, orientation);
      const thumbSize = getThumbSize(scrollbar.thumb, orientation);
      const travel = Math.max(1, trackSize - thumbSize);
      const maxScroll = getMaxScroll(viewport, orientation);
      const nextOffset = !thumbDrag
        ? getTrackClickOffset(pointer, trackStart, trackSize, thumbSize, travel)
        : Math.max(0, Math.min(travel, pointer - trackStart - pointerAnchor));
      setScrollbarPosition(
        viewport,
        orientation,
        (nextOffset * maxScroll) / travel,
        options,
        scrollCoordinator
      );
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
        setScrollbarPosition(
          viewport,
          orientation,
          getScrollPosition(viewport, orientation),
          {},
          scrollCoordinator
        );
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
    setScrollbarPosition(
      viewport,
      orientation,
      getScrollPosition(viewport, orientation) + delta,
      {},
      scrollCoordinator
    );
  }, { signal });
}

function setScrollbarPosition(
  viewport: HTMLElement,
  orientation: Orientation,
  value: number,
  options: ScrollPositionOptions,
  scrollCoordinator: GridScrollCoordinator | undefined
): void {
  if (scrollCoordinator) {
    scrollCoordinator.setScroll(orientation, value, options);
    return;
  }

  setScrollPosition(viewport, orientation, value, options);
}

function getTrackClickOffset(
  pointer: number,
  trackStart: number,
  trackSize: number,
  thumbSize: number,
  travel: number
): number {
  if (pointer >= trackStart + trackSize - thumbSize / 2) {
    return travel;
  }
  if (pointer <= trackStart + thumbSize / 2) {
    return 0;
  }

  const pointerOffset = pointer - trackStart + (Number.isInteger(pointer) ? 0.5 : 0);
  return Math.max(0, Math.min(travel, (pointerOffset / trackSize) * travel));
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

function createScrollValueText(scrollPosition: number, maxScroll: number): string {
  const percent = maxScroll <= 0
    ? 0
    : Math.round((Math.max(0, Math.min(scrollPosition, maxScroll)) / maxScroll) * 100);
  return `${percent}%`;
}
