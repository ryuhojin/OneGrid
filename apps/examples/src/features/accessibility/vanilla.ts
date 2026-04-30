import { OneGrid } from "@onegrid/dom";
import { accessibilityOptions } from "./data.js";
import type { AccessibilityRow } from "./data.js";

export function mountAccessibilityExample(el: HTMLElement): OneGrid<AccessibilityRow> {
  return new OneGrid<AccessibilityRow>({
    el,
    ...accessibilityOptions
  });
}
