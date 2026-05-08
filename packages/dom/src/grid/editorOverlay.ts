import type {
  CellEditCommitResult,
  CellEditSession,
  EditBlurAction,
  EditCancelReason,
  EditorOption,
  EditCommitTrigger,
  ResolvedEditingKeyboardPolicy,
  ResolvedEditorDef,
  ValidationIssue
} from "@onegrid/core";
import { getOverlayHost, getOverlayPositioning, positionOverlay } from "./editorOverlayPosition.js";

export interface CellEditorOverlayInput<TData = unknown> {
  readonly cell: HTMLElement;
  readonly session: CellEditSession<TData>;
  readonly initialValue?: string;
  readonly blurAction: EditBlurAction;
  readonly keyboardPolicy: ResolvedEditingKeyboardPolicy;
  commit(rawValue: unknown, validate: boolean, trigger: EditCommitTrigger): Promise<CellEditCommitResult<TData>>;
  cancel(reason: EditCancelReason): void;
  moveAfterCommit?(direction: -1 | 1): void;
}

export interface CellEditorOverlay {
  destroy(): void;
  commit(validate?: boolean, trigger?: EditCommitTrigger): Promise<boolean>;
  reposition(cell: HTMLElement): void;
}

export type ControlElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
export interface EditorControl {
  readonly element: HTMLElement;
  readonly focusTarget: ControlElement;
  read(): unknown;
}

const BLUR_COMMIT_DELAY_MS = 120;

export function openCellEditor<TData>(
  input: CellEditorOverlayInput<TData>
): CellEditorOverlay {
  const abortController = new AbortController();
  let composing = false;
  let destroyed = false;
  let blurTimer = 0;
  let ignoreBlurUntil = 0;
  const root = document.createElement("div");
  root.className = "og-grid__editor-overlay";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-label", `Edit ${input.session.column.headerName ?? input.session.field}`);
  root.dataset.editorKind = input.session.editor.kind;
  root.dataset.positioning = getOverlayPositioning(input.cell);
  const error = document.createElement("div");
  error.className = "og-grid__editor-error";
  error.setAttribute("role", "alert");
  error.hidden = true;
  const control = createEditorControl(input.session.editor, getInitialValue(input));
  control.element.classList.add("og-grid__editor-control");
  control.focusTarget.setAttribute("aria-label", `Edit ${input.session.column.headerName ?? input.session.field}`);
  root.append(control.element, error);
  getOverlayHost(input.cell).append(root);
  positionOverlay(root, input.cell);
  focusControl(control.focusTarget);

  root.addEventListener("compositionstart", () => {
    composing = true;
  }, { signal: abortController.signal });
  root.addEventListener("compositionend", () => {
    composing = false;
  }, { signal: abortController.signal });
  root.addEventListener("pointerdown", () => {
    if (input.session.editor.kind === "checkbox" || input.session.editor.kind === "radio") {
      ignoreBlurUntil = performance.now() + 500;
      focusControl(control.focusTarget);
    }
  }, { capture: true, signal: abortController.signal });
  document.addEventListener("pointerdown", (event) => {
    if (
      event.defaultPrevented
      || !(event.target instanceof Node)
      || root.contains(event.target)
    ) {
      return;
    }
    queueBlurAction(0);
  }, { signal: abortController.signal });
  root.addEventListener("keydown", (event) => {
    if (composing) {
      return;
    }
    if (event.key === "Escape") {
      if (!input.keyboardPolicy.cancelOnEscape) {
        return;
      }
      event.preventDefault();
      input.cancel("escape");
      destroy();
      return;
    }
    if (event.key === "Tab" && input.keyboardPolicy.commitOnTab) {
      const direction = event.shiftKey ? -1 : 1;
      event.preventDefault();
      void commit(true, "tab").then((committed) => {
        if (committed && input.keyboardPolicy.moveOnTab) {
          input.moveAfterCommit?.(direction);
        }
      });
      return;
    }
    if (shouldCommitFromEnter(event, input.session.editor.kind)) {
      if (!input.keyboardPolicy.commitOnEnter) {
        return;
      }
      event.preventDefault();
      void commit(true, "enter");
    }
  }, { capture: true, signal: abortController.signal });
  root.addEventListener("focusout", () => {
    queueBlurAction(BLUR_COMMIT_DELAY_MS);
  }, { signal: abortController.signal });

  return { destroy, commit, reposition };

  function queueBlurAction(delay: number): void {
    if (blurTimer !== 0) {
      window.clearTimeout(blurTimer);
    }
    blurTimer = window.setTimeout(() => {
      blurTimer = 0;
      if (performance.now() < ignoreBlurUntil) {
        return;
      }
      if (destroyed || root.contains(document.activeElement)) {
        return;
      }
      if (input.blurAction === "commit") {
        void commit(true, "blur");
      } else {
        input.cancel("blur");
        destroy();
      }
    }, delay);
  }

  async function commit(validate = true, trigger: EditCommitTrigger = "api"): Promise<boolean> {
    if (destroyed) {
      return false;
    }

    const result = await input.commit(control.read(), validate, trigger);
    if (!result.valid) {
      showErrors(error, result.issues);
      return false;
    }

    destroy();
    return true;
  }

  function destroy(): void {
    if (destroyed) {
      return;
    }
    destroyed = true;
    if (blurTimer !== 0) {
      window.clearTimeout(blurTimer);
      blurTimer = 0;
    }
    abortController.abort();
    root.remove();
  }

  function reposition(cell: HTMLElement): void {
    if (!destroyed) {
      positionOverlay(root, cell);
    }
  }
}

export function createEditorControl<TData>(
  editor: ResolvedEditorDef<TData>,
  value: unknown
): EditorControl {
  if (editor.kind === "textarea") {
    const textarea = document.createElement("textarea");
    textarea.value = formatValue(value);
    textarea.rows = getPositiveNumber(editor.params?.rows) ?? 3;
    return { element: textarea, focusTarget: textarea, read: () => textarea.value };
  }

  if (editor.kind === "select" || editor.kind === "multi-select") {
    const select = document.createElement("select");
    select.multiple = editor.kind === "multi-select";
    appendOptions(select, editor.options, value);
    return {
      element: select,
      focusTarget: select,
      read: () => editor.kind === "multi-select"
        ? Array.from(select.selectedOptions, (option) => option.value)
        : select.value
    };
  }

  if (editor.kind === "radio") {
    return createRadioControl(editor.options, value);
  }

  if (editor.kind === "checkbox") {
    return createCheckboxControl(value);
  }

  const input = document.createElement("input");
  input.type = getInputType(editor.kind);
  input.value = formatValue(value);
  if (editor.kind === "autocomplete") {
    const listId = `og-editor-list-${Math.random().toString(36).slice(2)}`;
    input.setAttribute("list", listId);
    const wrapper = document.createElement("span");
    wrapper.className = "og-grid__editor-autocomplete";
    wrapper.append(input, createDataList(listId, editor.options));
    return { element: wrapper, focusTarget: input, read: () => input.value };
  }
  return {
    element: input,
    focusTarget: input,
    read: () => editor.kind === "checkbox" ? input.checked : input.value
  };
}

function createCheckboxControl(value: unknown): EditorControl {
  const label = document.createElement("label");
  label.className = "og-grid__editor-checkbox-control";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.className = "og-grid__editor-native-checkbox";
  input.checked = Boolean(value);
  let pointerToggle = false;
  label.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    pointerToggle = true;
    input.focus({ preventScroll: true });
    input.checked = !input.checked;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    window.setTimeout(() => {
      pointerToggle = false;
    }, 200);
  });
  label.addEventListener("click", (event) => {
    if (pointerToggle) {
      event.preventDefault();
      pointerToggle = false;
    }
  });
  label.append(input);
  return {
    element: label,
    focusTarget: input,
    read: () => input.checked
  };
}

function createRadioControl(options: readonly EditorOption[], value: unknown): EditorControl {
  const group = document.createElement("fieldset");
  group.className = "og-grid__editor-radio-group";
  const selected = String(value);
  const name = `og-editor-${Math.random().toString(36).slice(2)}`;
  let firstInput: HTMLInputElement | undefined;
  for (const option of options) {
    const label = document.createElement("label");
    label.className = "og-grid__editor-radio";
    const input = document.createElement("input");
    input.type = "radio";
    input.className = "og-grid__editor-native-radio";
    input.name = name;
    input.value = String(option.value);
    input.checked = selected === String(option.value);
    input.disabled = option.disabled === true;
    let pointerToggle = false;
    label.addEventListener("pointerdown", (event) => {
      if (input.disabled) {
        return;
      }
      event.preventDefault();
      pointerToggle = true;
      input.focus({ preventScroll: true });
      input.checked = true;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      window.setTimeout(() => {
        pointerToggle = false;
      }, 200);
    });
    label.addEventListener("click", (event) => {
      if (pointerToggle) {
        event.preventDefault();
        pointerToggle = false;
      }
    });
    label.append(input, document.createTextNode(option.label));
    group.append(label);
    firstInput ??= input;
  }

  const fallback = firstInput ?? document.createElement("input");
  return {
    element: group,
    focusTarget: fallback,
    read: () => group.querySelector<HTMLInputElement>("input:checked")?.value ?? ""
  };
}

function appendOptions(
  select: HTMLSelectElement,
  options: readonly EditorOption[],
  value: unknown
): void {
  const values = new Set((Array.isArray(value) ? value : [value]).map(String));
  for (const option of options) {
    const item = document.createElement("option");
    item.value = String(option.value);
    item.textContent = option.label;
    item.disabled = option.disabled === true;
    item.selected = values.has(String(option.value));
    select.append(item);
  }
}

function createDataList(id: string, options: readonly EditorOption[]): HTMLDataListElement {
  const list = document.createElement("datalist");
  list.id = id;
  for (const option of options) {
    const item = document.createElement("option");
    item.value = String(option.value);
    item.label = option.label;
    list.append(item);
  }
  return list;
}

function getInitialValue<TData>(input: CellEditorOverlayInput<TData>): unknown {
  return input.initialValue !== undefined
    ? input.initialValue
    : input.session.previousValue;
}

function getInputType<TData>(kind: ResolvedEditorDef<TData>["kind"]): string {
  if (kind === "number") {
    return "number";
  }
  if (kind === "date") {
    return "date";
  }
  if (kind === "datetime") {
    return "datetime-local";
  }
  if (kind === "checkbox") {
    return "checkbox";
  }
  return "text";
}

function shouldCommitFromEnter<TData>(event: KeyboardEvent, kind: ResolvedEditorDef<TData>["kind"]): boolean {
  return event.key === "Enter" && (kind !== "textarea" || event.ctrlKey || event.metaKey);
}

export function focusControl(control: ControlElement): void {
  control.focus({ preventScroll: true });
  if (control instanceof HTMLTextAreaElement || isSelectableInput(control)) {
    control.select();
  }
}

function isSelectableInput(control: ControlElement): control is HTMLInputElement {
  return control instanceof HTMLInputElement && control.type !== "checkbox" && control.type !== "radio";
}

export function showErrors(error: HTMLElement, issues: readonly ValidationIssue[]): void {
  error.hidden = issues.length === 0;
  error.textContent = issues.map((issue) => issue.message).join(". ");
}

function getPositiveNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function formatValue(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}
