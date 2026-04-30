const LINE_HEIGHT = 40;

export function normalizeWheelDelta(
  value: number,
  deltaMode: number,
  viewportSize: number
): number {
  if (deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return value * viewportSize;
  }
  if (deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return value * LINE_HEIGHT;
  }
  return value;
}

export function clampScrollPosition(value: number, max: number): number {
  return Math.min(Math.max(0, value), Math.max(0, max));
}

export function isWheelBoundaryHit(
  current: number,
  delta: number,
  max: number
): boolean {
  return (delta < 0 && current <= 0) || (delta > 0 && current >= max);
}

export function getMaxScrollTop(element: HTMLElement): number {
  return Math.max(0, element.scrollHeight - element.clientHeight);
}

export function getMaxScrollLeft(element: HTMLElement): number {
  return Math.max(0, element.scrollWidth - element.clientWidth);
}

export function attachWheelBoundaryGuard(element: HTMLElement): void {
  element.addEventListener("wheel", (event) => {
    const deltaY = normalizeWheelDelta(event.deltaY, event.deltaMode, element.clientHeight);
    const wheelDeltaX = Math.abs(event.deltaX) >= 1 || !event.shiftKey
      ? event.deltaX
      : event.deltaY;
    const deltaX = normalizeWheelDelta(wheelDeltaX, event.deltaMode, element.clientWidth);
    const hitY = Math.abs(deltaY) >= 1
      && isWheelBoundaryHit(element.scrollTop, deltaY, getMaxScrollTop(element));
    const hitX = Math.abs(deltaX) >= 1
      && isWheelBoundaryHit(element.scrollLeft, deltaX, getMaxScrollLeft(element));

    if (hitX || hitY) {
      event.preventDefault();
    }
  }, { passive: false });
}
