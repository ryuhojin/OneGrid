import { attachOverlayFocusTrap } from "./focusTrap.js";
import type { FocusTrapHandle, FocusTrapOptions } from "./focusTrap.js";

export type EditorFocusTrapHandle = FocusTrapHandle;
export type EditorFocusTrapOptions = FocusTrapOptions;

export function attachEditorFocusTrap(
  editor: HTMLElement,
  options: EditorFocusTrapOptions = {}
): EditorFocusTrapHandle {
  return attachOverlayFocusTrap(editor, options);
}
