import { OneGrid } from "@onegrid/dom";
import { keyboardFocusOptions } from "./data.js";
import type { KeyboardFocusRow } from "./data.js";

export function mountKeyboardFocusExample(el: HTMLElement): OneGrid<KeyboardFocusRow> {
  return new OneGrid<KeyboardFocusRow>({
    el,
    ...keyboardFocusOptions
  });
}
