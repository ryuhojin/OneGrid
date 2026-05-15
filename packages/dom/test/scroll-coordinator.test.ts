import { describe, expect, it, vi } from "vitest";
import type { GridEditRuntime } from "../src/grid/editRuntime.js";
import { attachEditorScrollSyncForHost, disposeEditorScrollSync } from "../src/grid/editorScrollSync.js";
import {
  createGridScrollCoordinator,
  disposeGridScrollCoordinator,
  getGridScrollCoordinator,
  registerGridScrollCoordinator
} from "../src/grid/scrollCoordinator.js";

describe("grid scroll coordinator", () => {
  it("publishes one scroll layout state to subscribers and registered owners", () => {
    const root = document.createElement("div");
    const viewport = createViewport();
    const coordinator = createGridScrollCoordinator({ root, viewport });
    const states: number[] = [];

    registerGridScrollCoordinator(root, coordinator);
    const unsubscribe = coordinator.subscribe((state) => {
      states.push(state.scrollLeft);
    });

    coordinator.setScroll("horizontal", 72);

    expect(root.dataset.layoutScrollLeft).toBe("72");
    expect(states).toEqual([72]);
    expect(getGridScrollCoordinator(root)).toBe(coordinator);

    unsubscribe();
    coordinator.setScroll("horizontal", 96);

    expect(states).toEqual([72]);

    disposeGridScrollCoordinator(root);
    expect(getGridScrollCoordinator(root)).toBeUndefined();
  });

  it("repositions active editors from coordinator notifications", () => {
    const host = document.createElement("div");
    const root = document.createElement("div");
    const viewport = createViewport();
    const coordinator = createGridScrollCoordinator({ root, viewport });
    const editRuntime = createEditRuntime();

    attachEditorScrollSyncForHost(host, viewport, editRuntime, coordinator);

    const state = coordinator.setScroll("horizontal", 48);

    expect(editRuntime.syncActiveEditOnScroll).toHaveBeenCalledWith(viewport, state);

    disposeEditorScrollSync(host);
  });
});

function createViewport(): HTMLElement {
  const viewport = document.createElement("div");
  Object.defineProperties(viewport, {
    clientHeight: { configurable: true, value: 100 },
    clientWidth: { configurable: true, value: 100 },
    scrollHeight: { configurable: true, value: 400 },
    scrollWidth: { configurable: true, value: 300 }
  });
  return viewport;
}

function createEditRuntime(): GridEditRuntime {
  return {
    startEditFromCell: () => false,
    toggleCheckboxCell: () => false,
    syncActiveEditOnScroll: vi.fn(),
    stopEdit: () => undefined,
    isEditingCell: () => false
  };
}
