export interface OverlayPoint {
  readonly x: number;
  readonly y: number;
}

export interface OverlayPositionInput {
  readonly overlay: HTMLElement;
  readonly anchor?: HTMLElement;
  readonly point?: OverlayPoint;
  readonly gap?: number;
  readonly viewportPadding?: number;
}

export function positionOverlay(input: OverlayPositionInput): void {
  const gap = input.gap ?? 6;
  const viewportPadding = input.viewportPadding ?? 8;
  const menuWidth = input.overlay.offsetWidth;
  const menuHeight = input.overlay.offsetHeight;
  const origin = resolveOrigin(input, gap);
  const left = clamp(origin.x, viewportPadding, window.innerWidth - menuWidth - viewportPadding);
  const top = chooseTop({
    originY: origin.y,
    fallbackY: origin.fallbackY,
    overlayHeight: menuHeight,
    viewportPadding
  });

  input.overlay.style.left = `${left}px`;
  input.overlay.style.top = `${top}px`;
}

function resolveOrigin(input: OverlayPositionInput, gap: number) {
  if (input.point) {
    return {
      x: input.point.x,
      y: input.point.y + gap,
      fallbackY: input.point.y - gap
    };
  }

  const anchorRect = input.anchor?.getBoundingClientRect();
  if (!anchorRect) {
    return { x: 8, y: 8, fallbackY: 8 };
  }

  return {
    x: anchorRect.right - input.overlay.offsetWidth,
    y: anchorRect.bottom + gap,
    fallbackY: anchorRect.top - input.overlay.offsetHeight - gap
  };
}

function chooseTop(input: {
  readonly originY: number;
  readonly fallbackY: number;
  readonly overlayHeight: number;
  readonly viewportPadding: number;
}): number {
  return input.originY + input.overlayHeight <= window.innerHeight - input.viewportPadding
    ? input.originY
    : Math.max(input.viewportPadding, input.fallbackY);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(min, value), Math.max(min, max));
}
