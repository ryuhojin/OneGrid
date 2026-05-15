const SCROLL_LINE = 40;
import {
  getGridMaxScroll,
  getGridScrollPosition,
  getGridScrollSize,
  getGridViewportSize,
  setGridScrollPosition
} from "./scrollCoordinator.js";

export type Orientation = "vertical" | "horizontal";

export interface ScrollPositionOptions {
  readonly deferRemoteLoad?: boolean;
}

export function getKeyboardDelta(key: string, viewport: HTMLElement, orientation: Orientation): number {
  const page = orientation === "vertical" ? viewport.clientHeight : viewport.clientWidth;
  if (key === "ArrowDown" || key === "ArrowRight") return SCROLL_LINE;
  if (key === "ArrowUp" || key === "ArrowLeft") return -SCROLL_LINE;
  if (key === "PageDown") return page;
  if (key === "PageUp") return -page;
  if (key === "Home") return -getScrollPosition(viewport, orientation);
  if (key === "End") return getMaxScroll(viewport, orientation);
  return 0;
}

export function getPointerPosition(event: PointerEvent, orientation: Orientation): number {
  return orientation === "vertical" ? event.clientY : event.clientX;
}

export function getScrollPosition(viewport: HTMLElement, orientation: Orientation): number {
  return getGridScrollPosition(viewport, orientation);
}

export function getMaxScroll(viewport: HTMLElement, orientation: Orientation): number {
  return getGridMaxScroll(viewport, orientation);
}

export function getViewportSize(viewport: HTMLElement, orientation: Orientation): number {
  return getGridViewportSize(viewport, orientation);
}

export function getScrollSize(viewport: HTMLElement, orientation: Orientation): number {
  return getGridScrollSize(viewport, orientation);
}

export function setScrollPosition(
  viewport: HTMLElement,
  orientation: Orientation,
  value: number,
  options: ScrollPositionOptions = {}
): void {
  setGridScrollPosition(viewport, orientation, value, options);
}

export function getTrackSize(track: HTMLElement, orientation: Orientation): number {
  return getTrackRectSize(track.getBoundingClientRect(), orientation);
}

export function getTrackRectSize(rect: DOMRectReadOnly, orientation: Orientation): number {
  return orientation === "vertical" ? rect.height : rect.width;
}

export function getThumbSize(thumb: HTMLElement, orientation: Orientation): number {
  return orientation === "vertical" ? thumb.offsetHeight : thumb.offsetWidth;
}

export function getThumbOffset(thumb: HTMLElement, orientation: Orientation): number {
  const style = getComputedStyle(thumb).transform;
  const transform = style === "none"
    ? new DOMMatrixReadOnly()
    : new DOMMatrixReadOnly(style);
  return orientation === "vertical" ? transform.m42 : transform.m41;
}
