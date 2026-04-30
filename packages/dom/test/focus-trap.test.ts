import { describe, expect, it, vi } from "vitest";
import { attachEditorFocusTrap } from "../src/grid/editorFocusTrap.js";
import { attachOverlayFocusTrap } from "../src/grid/focusTrap.js";

describe("@onegrid/dom overlay focus trap", () => {
  it("wraps Tab focus and restores focus on destroy", () => {
    const restore = document.createElement("button");
    restore.textContent = "Open";
    const overlay = document.createElement("div");
    const first = document.createElement("button");
    const last = document.createElement("button");
    first.textContent = "First";
    last.textContent = "Last";
    overlay.append(first, last);
    document.body.append(restore, overlay);

    restore.focus();
    const trap = attachOverlayFocusTrap(overlay, { restoreFocusTo: restore });

    last.focus();
    last.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    expect(document.activeElement).toBe(first);

    first.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true }));
    expect(document.activeElement).toBe(last);

    trap.destroy();
    expect(document.activeElement).toBe(restore);
    overlay.remove();
    restore.remove();
  });

  it("calls Escape handler for overlay close paths", () => {
    const overlay = document.createElement("div");
    const close = vi.fn();
    document.body.append(overlay);
    const trap = attachOverlayFocusTrap(overlay, { onEscape: close });

    overlay.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(close).toHaveBeenCalledOnce();

    trap.destroy();
    overlay.remove();
  });

  it("exposes an editor-specific focus trap entrypoint", () => {
    const editor = document.createElement("div");
    const input = document.createElement("input");
    editor.append(input);
    document.body.append(editor);

    const trap = attachEditorFocusTrap(editor);
    input.focus();
    expect(document.activeElement).toBe(input);

    trap.destroy();
    editor.remove();
  });
});
