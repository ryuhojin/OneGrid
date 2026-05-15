import type { EditingOptions } from "../types/grid-options.js";

export interface ResolvedEditingKeyboardPolicy {
  readonly startOnEnter: boolean;
  readonly commitOnEnter: boolean;
  readonly moveOnTab: boolean;
  readonly commitOnTab: boolean;
  readonly cancelOnEscape: boolean;
  readonly clearOnBackspace: boolean;
}

export function resolveEditKeyboardPolicy(
  editing: EditingOptions | undefined
): ResolvedEditingKeyboardPolicy {
  const keyboard = editing?.keyboard;
  return Object.freeze({
    startOnEnter: getKeyboardFlag(keyboard?.startOnEnter, true),
    commitOnEnter: getKeyboardFlag(keyboard?.commitOnEnter, true),
    moveOnTab: getKeyboardFlag(keyboard?.moveOnTab, true),
    commitOnTab: getKeyboardFlag(keyboard?.commitOnTab, true),
    cancelOnEscape: getKeyboardFlag(keyboard?.cancelOnEscape, true),
    clearOnBackspace: getKeyboardFlag(keyboard?.clearOnBackspace, true)
  });
}

function getKeyboardFlag(value: boolean | undefined, fallback: boolean): boolean {
  return value ?? fallback;
}
