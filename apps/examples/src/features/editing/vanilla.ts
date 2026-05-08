import { OneGrid } from "@onegrid/dom";
import { editingColumns, editingOptions, editingRows } from "./data.js";
import type { GridBatchEditSession, GridOptions, GridPendingEdit } from "@onegrid/core";
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
  const batchSession = appendValue(inspector, "Batch session", "none");
  const batchEvents = appendValue(inspector, "Batch events", "0");
  const undoStack = appendValue(inspector, "Undo stack", "0");
  const redoStack = appendValue(inspector, "Redo stack", "0");
  const lastHistory = appendValue(inspector, "Last history", "none");
  const pendingDetail = appendValue(inspector, "Pending detail", "none");
  const validation = appendValue(inspector, "Validation", "none");
  let commitCount = 0;
  let cancelCount = 0;
  let batchEventCount = 0;

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
        syncEditInspector(grid);
        lastStaged.textContent = `${event.trigger}:${event.position.field}:${String(event.nextValue)}`;
        validation.textContent = "none";
      },
      cellEditCommitted: (event) => {
        commitCount += 1;
        commits.textContent = String(commitCount);
        syncEditInspector(grid);
        lastCommit.textContent = `${event.trigger}:${event.position.field}:${String(event.nextValue)}`;
        validation.textContent = "none";
      },
      cellEditCancelled: (event) => {
        cancelCount += 1;
        cancels.textContent = String(cancelCount);
        syncEditInspector(grid);
        lastCancel.textContent = event.reason;
      },
      batchEditSessionStarted: (event) => {
        batchEventCount += 1;
        batchEvents.textContent = String(batchEventCount);
        batchSession.textContent = formatBatchSession(event.session);
      },
      batchEditSessionCommitted: (event) => {
        batchEventCount += 1;
        batchEvents.textContent = String(batchEventCount);
        batchSession.textContent = formatBatchSession(event.session);
      },
      batchEditSessionCancelled: (event) => {
        batchEventCount += 1;
        batchEvents.textContent = String(batchEventCount);
        batchSession.textContent = formatBatchSession(event.session);
      },
      editHistoryChanged: (event) => {
        const state = event.state;
        undoStack.textContent = String(state.undoCount);
        redoStack.textContent = String(state.redoCount);
        lastHistory.textContent = event.entry
          ? `${event.action}:${event.entry.position.field}:${String(event.entry.previousValue)} -> ${String(event.entry.nextValue)}`
          : event.action;
        pending.textContent = String(grid.getPendingEdits().length);
        pendingDetail.textContent = formatPendingEdits(grid.getPendingEdits());
        batchSession.textContent = formatBatchSession(grid.getBatchEditSession());
      },
      validationFailed: (event) => {
        validation.textContent = event.issues.map((issue) => issue.message).join("; ");
      }
    }
  });

  actions.append(
    createButton("Start batch session", () => {
      const session = grid.startBatchEditSession({ id: "editing-example-batch", label: "Editing example" });
      batchSession.textContent = formatBatchSession(session);
    }),
    createButton("Edit title", () => {
      grid.startEdit({ rowIndex: 0, rowKey: "ED-0001", field: "title" });
    }),
    createButton("Cancel edit", () => {
      grid.stopEdit({ commit: false });
    }, { preserveEditorFocus: true }),
    createButton("Undo edit", () => {
      const entry = grid.undoEdit();
      syncEditInspector(grid);
      lastHistory.textContent = entry
        ? `undo:${entry.position.field}:${String(entry.nextValue)} -> ${String(entry.previousValue)}`
        : "undo:none";
    }, { preserveEditorFocus: true }),
    createButton("Redo edit", () => {
      const entry = grid.redoEdit();
      syncEditInspector(grid);
      lastHistory.textContent = entry
        ? `redo:${entry.position.field}:${String(entry.previousValue)} -> ${String(entry.nextValue)}`
        : "redo:none";
    }, { preserveEditorFocus: true }),
    createButton("Commit changes", () => {
      void grid.commitBatchEditSession().then((session) => {
        syncEditInspector(grid);
        batchSession.textContent = formatBatchSession(session ?? grid.getBatchEditSession());
      });
    }, { preserveEditorFocus: true }),
    createButton("Cancel changes", () => {
      const session = grid.cancelBatchEditSession();
      syncEditInspector(grid);
      batchSession.textContent = formatBatchSession(session ?? grid.getBatchEditSession());
    }, { preserveEditorFocus: true })
  );

  function syncEditInspector(currentGrid: OneGrid<EditingRow>): void {
    const state = currentGrid.getEditHistoryState();
    pending.textContent = String(currentGrid.getPendingEdits().length);
    pendingDetail.textContent = formatPendingEdits(currentGrid.getPendingEdits());
    batchSession.textContent = formatBatchSession(currentGrid.getBatchEditSession());
    undoStack.textContent = String(state.undoCount);
    redoStack.textContent = String(state.redoCount);
  }
  const externalSection = createExternalStateSection();
  el.replaceChildren(actions, gridHost, inspector, externalSection.element);
  return grid;
}

function createExternalStateSection(): { readonly element: HTMLElement } {
  const section = document.createElement("section");
  section.dataset.testid = "external-editing-example";
  section.className = "example-section";

  const heading = document.createElement("h3");
  heading.textContent = "Read-only edit with external state";

  const gridHost = document.createElement("div");
  gridHost.dataset.testid = "external-edit-grid";

  const inspector = document.createElement("dl");
  inspector.className = "example-inspector";
  inspector.setAttribute("aria-label", "External state request summary");
  const requests = appendValue(inspector, "External requests", "0");
  const lastRequest = appendValue(inspector, "External last", "none");
  const rowTitle = appendValue(inspector, "External row title", editingRows[0]?.title ?? "none");

  let requestCount = 0;
  let externalRows = [...editingRows];
  const externalGridRef: { current?: OneGrid<EditingRow> } = {};
  const options: GridOptions<EditingRow> = {
    columns: editingColumns,
    columnUi: { menu: true },
    data: externalRows,
    rowKey: "id",
    rowModel: "client",
    editing: { ...editingOptions, commitMode: "cell", readOnly: true },
    layout: { width: "100%", height: 260, bodyHeight: 260 },
    events: {
      cellEditRequested: (event) => {
        requestCount += 1;
        externalRows = externalRows.map((row) =>
          String(row.id) === String(event.rowKey) ? event.nextRow : row
        );
        requests.textContent = String(requestCount);
        lastRequest.textContent = `${event.trigger}:${event.position.field}:${String(event.nextValue)}`;
        rowTitle.textContent = externalRows[0]?.title ?? "none";
        externalGridRef.current?.setData(externalRows);
      }
    }
  };
  externalGridRef.current = new OneGrid<EditingRow>({ el: gridHost, ...options });

  section.append(heading, gridHost, inspector);
  return { element: section };
}

function formatBatchSession(session: GridBatchEditSession<EditingRow> | undefined): string {
  return session ? `${session.id}:${session.status}:${session.editCount}` : "none";
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
