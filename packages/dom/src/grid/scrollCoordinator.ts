const LOGICAL_SCROLL_EVENT = "onegrid:logical-scroll";
const CONTROLLED_SCROLL_RESTORE = "true";

export type ScrollAxis = "vertical" | "horizontal";

export interface GridScrollPositionOptions {
  readonly deferRemoteLoad?: boolean;
}

export interface GridScrollLayoutState {
  readonly scrollTop: number;
  readonly scrollLeft: number;
  readonly maxScrollTop: number;
  readonly maxScrollLeft: number;
  readonly scrollHeight: number;
  readonly scrollWidth: number;
  readonly viewportHeight: number;
  readonly viewportWidth: number;
  readonly hasVerticalScroll: boolean;
  readonly hasHorizontalScroll: boolean;
}

export type GridScrollLayoutListener = (state: GridScrollLayoutState) => void;

export interface GridScrollCoordinator {
  readonly root: HTMLElement;
  readonly viewport: HTMLElement;
  read(): GridScrollLayoutState;
  sync(): GridScrollLayoutState;
  setScroll(axis: ScrollAxis, value: number, options?: GridScrollPositionOptions): GridScrollLayoutState;
  subscribe(listener: GridScrollLayoutListener): () => void;
  destroy(): void;
}

export { CONTROLLED_SCROLL_RESTORE, LOGICAL_SCROLL_EVENT };

const gridScrollCoordinators = new WeakMap<HTMLElement, GridScrollCoordinator>();

export function registerGridScrollCoordinator(
  owner: HTMLElement,
  coordinator: GridScrollCoordinator
): void {
  gridScrollCoordinators.set(owner, coordinator);
}

export function getGridScrollCoordinator(element: HTMLElement): GridScrollCoordinator | undefined {
  let current: HTMLElement | null = element;
  while (current) {
    const coordinator = gridScrollCoordinators.get(current);
    if (coordinator) {
      return coordinator;
    }
    current = current.parentElement;
  }
  return undefined;
}

export function disposeGridScrollCoordinator(owner: HTMLElement): void {
  const coordinator = gridScrollCoordinators.get(owner);
  coordinator?.destroy();
  gridScrollCoordinators.delete(owner);
}

export function createGridScrollCoordinator(input: {
  readonly root: HTMLElement;
  readonly viewport: HTMLElement;
}): GridScrollCoordinator {
  const listeners = new Set<GridScrollLayoutListener>();
  const publish = (): GridScrollLayoutState => {
    const state = publishGridScrollLayoutState(input.root, input.viewport);
    notify(listeners, state);
    return state;
  };

  const coordinator: GridScrollCoordinator = {
    root: input.root,
    viewport: input.viewport,
    read: () => readGridScrollLayoutState(input.viewport),
    sync: publish,
    setScroll(axis, value, options = {}) {
      setGridScrollPosition(input.viewport, axis, value, options);
      return publish();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    destroy() {
      listeners.clear();
    }
  };

  coordinator.sync();
  return coordinator;
}

function notify(
  listeners: ReadonlySet<GridScrollLayoutListener>,
  state: GridScrollLayoutState
): void {
  for (const listener of listeners) {
    listener(state);
  }
}

export function readGridScrollLayoutState(viewport: HTMLElement): GridScrollLayoutState {
  const scrollTop = getGridScrollPosition(viewport, "vertical");
  const scrollLeft = getGridScrollPosition(viewport, "horizontal");
  const maxScrollTop = getGridMaxScroll(viewport, "vertical");
  const maxScrollLeft = getGridMaxScroll(viewport, "horizontal");
  const viewportHeight = viewport.clientHeight;
  const viewportWidth = viewport.clientWidth;
  const scrollHeight = getGridScrollSize(viewport, "vertical");
  const scrollWidth = getGridScrollSize(viewport, "horizontal");

  return Object.freeze({
    scrollTop,
    scrollLeft,
    maxScrollTop,
    maxScrollLeft,
    scrollHeight,
    scrollWidth,
    viewportHeight,
    viewportWidth,
    hasVerticalScroll: maxScrollTop > 0,
    hasHorizontalScroll: maxScrollLeft > 0
  });
}

export function publishGridScrollLayoutState(
  root: HTMLElement,
  viewport: HTMLElement
): GridScrollLayoutState {
  const state = readGridScrollLayoutState(viewport);
  writeStateDataset(root, state);
  return state;
}

export function getGridScrollPosition(viewport: HTMLElement, axis: ScrollAxis): number {
  if (axis === "vertical") {
    return getLogicalScrollMetric(viewport, "logicalScrollTop") ?? viewport.scrollTop;
  }

  return viewport.scrollLeft;
}

export function getGridMaxScroll(viewport: HTMLElement, axis: ScrollAxis): number {
  if (axis === "vertical") {
    return getLogicalScrollMetric(viewport, "logicalScrollMax")
      ?? Math.max(0, viewport.scrollHeight - viewport.clientHeight);
  }

  return Math.max(0, viewport.scrollWidth - viewport.clientWidth);
}

export function getGridScrollSize(viewport: HTMLElement, axis: ScrollAxis): number {
  if (axis === "vertical") {
    return getLogicalScrollMetric(viewport, "logicalScrollHeight") ?? viewport.scrollHeight;
  }

  return viewport.scrollWidth;
}

export function getGridViewportSize(viewport: HTMLElement, axis: ScrollAxis): number {
  return axis === "vertical" ? viewport.clientHeight : viewport.clientWidth;
}

export function setGridScrollPosition(
  viewport: HTMLElement,
  axis: ScrollAxis,
  value: number,
  options: GridScrollPositionOptions = {}
): void {
  const nextValue = clamp(value, 0, getGridMaxScroll(viewport, axis));
  if (axis === "vertical" && hasLogicalVerticalScroll(viewport)) {
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

  if (axis === "vertical") {
    viewport.scrollTop = nextValue;
    return;
  }

  viewport.scrollLeft = nextValue;
}

function writeStateDataset(root: HTMLElement, state: GridScrollLayoutState): void {
  root.dataset.layoutScrollTop = String(Math.round(state.scrollTop));
  root.dataset.layoutScrollLeft = String(Math.round(state.scrollLeft));
  root.dataset.layoutScrollMaxTop = String(Math.round(state.maxScrollTop));
  root.dataset.layoutScrollMaxLeft = String(Math.round(state.maxScrollLeft));
  root.dataset.layoutViewportHeight = String(Math.round(state.viewportHeight));
  root.dataset.layoutViewportWidth = String(Math.round(state.viewportWidth));
  root.dataset.layoutScrollHeight = String(Math.round(state.scrollHeight));
  root.dataset.layoutScrollWidth = String(Math.round(state.scrollWidth));
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
