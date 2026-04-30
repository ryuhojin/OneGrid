import { OneGrid } from "@onegrid/dom";
import { editingColumns, editingOptions, editingRows } from "./data.js";
import type { GridPendingEdit } from "@onegrid/core";
import type { EditingRow } from "./data.js";

export function mountEditingExample(el: HTMLElement): OneGrid<EditingRow> {
  const gridHost = document.createElement("div");
  const actions = document.createElement("div");
  actions.className = "example-actions";
  const inspector = document.createElement("dl");
  inspector.className = "example-inspector";
  inspector.setAttribute("aria-label", "Editing summary");

  const pending = appendValue(inspector, "Pending edits", "0");
  const commits = appendValue(inspector, "Commits", "0");
  const cancels = appendValue(inspector, "Cancels", "0");
  const lastStaged = appendValue(inspector, "Last staged", "none");
  const lastCommit = appendValue(inspector, "Last commit", "none");
  const lastCancel = appendValue(inspector, "Last cancel", "none");
  const pendingDetail = appendValue(inspector, "Pending detail", "none");
  const validation = appendValue(inspector, "Validation", "none");
  let commitCount = 0;
  let cancelCount = 0;

  const grid = new OneGrid<EditingRow>({
    el: gridHost,
    columns: editingColumns,
    columnUi: { menu: true },
    data: editingRows,
    rowKey: "id",
    rowModel: "client",
    editing: editingOptions,
    layout: { width: "100%", height: 420, bodyHeight: 420 },
    events: {
      cellEditStaged: (event) => {
        pending.textContent = String(grid.getPendingEdits().length);
        pendingDetail.textContent = formatPendingEdits(grid.getPendingEdits());
        lastStaged.textContent = `${event.trigger}:${event.position.field}:${String(event.nextValue)}`;
        validation.textContent = "none";
      },
      cellEditCommitted: (event) => {
        commitCount += 1;
        commits.textContent = String(commitCount);
        pending.textContent = String(grid.getPendingEdits().length);
        pendingDetail.textContent = formatPendingEdits(grid.getPendingEdits());
        lastCommit.textContent = `${event.trigger}:${event.position.field}:${String(event.nextValue)}`;
        validation.textContent = "none";
      },
      cellEditCancelled: (event) => {
        cancelCount += 1;
        cancels.textContent = String(cancelCount);
        pending.textContent = String(grid.getPendingEdits().length);
        pendingDetail.textContent = formatPendingEdits(grid.getPendingEdits());
        lastCancel.textContent = event.reason;
      },
      validationFailed: (event) => {
        validation.textContent = event.issues.map((issue) => issue.message).join("; ");
      }
    }
  });

  actions.append(
    createButton("Edit title", () => {
      grid.startEdit({ rowIndex: 0, rowKey: "ED-0001", field: "title" });
    }),
    createButton("Cancel edit", () => {
      grid.stopEdit({ commit: false });
    }, { preserveEditorFocus: true }),
    createButton("Commit changes", () => {
      void grid.commitPendingEdits();
      pending.textContent = String(grid.getPendingEdits().length);
      pendingDetail.textContent = formatPendingEdits(grid.getPendingEdits());
    }, { preserveEditorFocus: true }),
    createButton("Cancel changes", () => {
      grid.cancelPendingEdits();
      pending.textContent = String(grid.getPendingEdits().length);
      pendingDetail.textContent = formatPendingEdits(grid.getPendingEdits());
    }, { preserveEditorFocus: true })
  );
  el.replaceChildren(actions, gridHost, inspector);
  return grid;
}

function createButton(
  label: string,
  onClick: () => void,
  options: { readonly preserveEditorFocus?: boolean } = {}
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "example-action-button";
  button.textContent = label;
  if (options.preserveEditorFocus) {
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
    });
  }
  button.addEventListener("click", onClick);
  return button;
}

function appendValue(list: HTMLDListElement, label: string, value: string): HTMLElement {
  const term = document.createElement("dt");
  term.textContent = label;

  const description = document.createElement("dd");
  description.textContent = value;

  list.append(term, description);
  return description;
}

function formatPendingEdits(edits: readonly GridPendingEdit<EditingRow>[]): string {
  if (edits.length === 0) {
    return "none";
  }

  return edits
    .map((edit) => {
      const rowIndex = edit.sourceIndex ?? edit.position.rowIndex;
      return `row ${rowIndex + 1} ${edit.position.field}: ${String(edit.previousValue)} -> ${String(edit.nextValue)}`;
    })
    .join("; ");
}
