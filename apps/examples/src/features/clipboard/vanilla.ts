import { OneGrid } from "@onegrid/dom";
import {
  clipboardColumns,
  clipboardEditing,
  clipboardOptions,
  clipboardRows,
  clipboardSelection
} from "./data.js";
import type { ClipboardRow } from "./data.js";

export function mountClipboardExample(el: HTMLElement): OneGrid<ClipboardRow> {
  const actions = document.createElement("div");
  actions.className = "example-actions";
  const gridHost = document.createElement("div");
  const inspector = document.createElement("dl");
  inspector.className = "example-inspector";
  inspector.setAttribute("aria-label", "Clipboard summary");

  const copied = appendValue(inspector, "Copied", "none");
  const pasted = appendValue(inspector, "Pasted", "0");
  const validation = appendValue(inspector, "Validation", "none");
  const selection = appendValue(inspector, "Selection", "none");
  let pasteCount = 0;

  const grid = new OneGrid<ClipboardRow>({
    el: gridHost,
    columns: clipboardColumns,
    data: clipboardRows,
    rowKey: "id",
    rowModel: "client",
    selection: clipboardSelection,
    editing: clipboardEditing,
    clipboard: clipboardOptions,
    merge: { enabled: true },
    layout: { width: "100%", height: 430, bodyHeight: 430 },
    events: {
      selectionChanged: (event) => {
        selection.textContent = event.ranges.length > 0
          ? `${event.ranges.length} range`
          : event.cells.length > 0
            ? `${event.cells.length} cell`
            : event.rowKeys.length > 0 ? event.rowKeys.join(", ") : "none";
      },
      cellEditCommitted: (event) => {
        pasteCount += 1;
        pasted.textContent = String(pasteCount);
        validation.textContent = "none";
        copied.textContent = `${event.position.field}: ${String(event.nextValue)}`;
      },
      validationFailed: (event) => {
        validation.textContent = event.issues.map((issue) => issue.message).join("; ");
      }
    }
  });

  actions.append(
    createButton("Copy selected", () => {
      void grid.copyToClipboard({ selectedOnly: true });
      copied.textContent = "Selected text/plain copied";
    }),
    createButton("Copy with headers", () => {
      void grid.copyToClipboard({ selectedOnly: true, includeHeaders: true });
      copied.textContent = "Selected text/plain copied with headers";
    }),
    createButton("Paste sample", () => {
      grid.selectCell({ rowIndex: 3, rowKey: "CLIP-0004", field: "program", columnIndex: 3 });
      void grid.pasteFromClipboard("Grant review\t410000");
    }),
    createButton("Paste invalid amount", () => {
      grid.selectCell({ rowIndex: 4, rowKey: "CLIP-0005", field: "amount", columnIndex: 4 });
      void grid.pasteFromClipboard("-1");
    })
  );

  el.replaceChildren(actions, gridHost, inspector);
  return grid;
}

function createButton(label: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "example-action-button";
  button.textContent = label;
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
