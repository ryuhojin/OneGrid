import type { GridExportResult } from "@onegrid/core";
import { OneGrid } from "@onegrid/dom";
import {
  exportColumns,
  exportGridOptions,
  exportImportOptions,
  exportRows
} from "./data.js";
import type { ExportRow } from "./data.js";

export function mountExportExample(el: HTMLElement): OneGrid<ExportRow> {
  const actions = document.createElement("div");
  actions.className = "example-actions";
  const gridHost = document.createElement("div");
  const inspector = document.createElement("dl");
  inspector.className = "example-inspector";
  inspector.setAttribute("aria-label", "Export import summary");

  const format = appendValue(inspector, "Format", "none");
  const media = appendValue(inspector, "Media type", "none");
  const size = appendValue(inspector, "Payload size", "0");
  const imported = appendValue(inspector, "Imported rows", "0");
  const preview = appendValue(inspector, "Preview", "none");

  const grid = new OneGrid<ExportRow>({
    el: gridHost,
    columns: exportColumns,
    data: exportRows,
    accessibility: { label: "Export import grid" },
    ...exportGridOptions
  });

  actions.append(
    createButton("Export CSV", () => {
      void runExport(grid, { format: "csv" }, format, media, size, preview);
    }),
    createButton("Export selected CSV", () => {
      grid.selectCellRange(
        { rowIndex: 0, rowKey: "EXP-0001", field: "program", columnIndex: 3 },
        { rowIndex: 1, rowKey: "EXP-0002", field: "memo", columnIndex: 4 }
      );
      void runExport(grid, { format: "csv", selectedOnly: true }, format, media, size, preview);
    }),
    createButton("Export XLSX", () => {
      void runExport(grid, { format: "xlsx" }, format, media, size, preview);
    }),
    createButton("Export PDF", () => {
      void runExport(grid, { format: "pdf" }, format, media, size, preview);
    }),
    createButton("Print layout", () => {
      void runExport(grid, { format: "print" }, format, media, size, preview);
    }),
    createFileImport("Import CSV file", ".csv,text/csv", async (file) => {
      const result = await grid.importData(await file.text(), {
        ...exportImportOptions,
        format: "csv",
        mode: "replace"
      });
      imported.textContent = String(result.rowCount);
      preview.textContent = `Imported CSV file: ${file.name}`;
    }),
    createFileImport("Import XLSX file", ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", async (file) => {
      const result = await grid.importData(new Uint8Array(await file.arrayBuffer()), {
        ...exportImportOptions,
        format: "xlsx",
        mode: "replace"
      });
      imported.textContent = String(result.rowCount);
      preview.textContent = `Imported XLSX file: ${file.name}`;
    }),
    createAssetLink("CSV test file", "/export-testFile.csv"),
    createAssetLink("XLSX test file", "/export-testFile.xlsx")
  );

  el.replaceChildren(actions, gridHost, inspector);
  return grid;
}

async function runExport(
  grid: OneGrid<ExportRow>,
  options: Parameters<OneGrid<ExportRow>["exportData"]>[0],
  format: HTMLElement,
  media: HTMLElement,
  size: HTMLElement,
  preview: HTMLElement
): Promise<void> {
  const result = await grid.exportData(options);
  format.textContent = options?.format ?? "csv";
  media.textContent = result.mediaType;
  size.textContent = String(getPayloadSize(result));
  preview.textContent = createPreview(result);
  downloadExportResult(result);
}

function getPayloadSize(result: GridExportResult): number {
  return typeof result.content === "string" ? result.content.length : result.content.byteLength;
}

function createPreview(result: GridExportResult): string {
  if (typeof result.content !== "string") {
    return `${result.filename ?? "export"} ${result.content.byteLength} bytes`;
  }
  if (result.mediaType === "text/html") {
    return result.content.includes("data-onegrid-print-layout")
      ? "Print layout: data-onegrid-print-layout"
      : "Print layout generated";
  }
  return result.content.replace(/\s+/gu, " ").slice(0, 120);
}

function downloadExportResult(result: GridExportResult): void {
  const blob = new Blob([toBlobPart(result.content)], { type: result.mediaType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = result.filename ?? "onegrid-export";
  link.rel = "noopener";
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}

function toBlobPart(content: GridExportResult["content"]): BlobPart {
  if (typeof content === "string") {
    return content;
  }
  const buffer = new ArrayBuffer(content.byteLength);
  new Uint8Array(buffer).set(content);
  return buffer;
}

function createButton(label: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "example-action-button";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function createFileImport(
  label: string,
  accept: string,
  onImport: (file: File) => Promise<void>
): HTMLLabelElement {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = accept;
  input.className = "example-file-input";
  input.setAttribute("aria-label", label);
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (file) {
      void onImport(file);
    }
    input.value = "";
  });

  const wrapper = document.createElement("label");
  wrapper.className = "example-action-button";
  wrapper.textContent = label;
  wrapper.append(input);
  return wrapper;
}

function createAssetLink(label: string, href: string): HTMLAnchorElement {
  const link = document.createElement("a");
  link.className = "example-action-button example-action-link";
  link.href = href;
  link.download = href.split("/").pop() ?? "export-testFile";
  link.textContent = label;
  return link;
}

function appendValue(list: HTMLDListElement, label: string, value: string): HTMLElement {
  const term = document.createElement("dt");
  term.textContent = label;
  const description = document.createElement("dd");
  description.textContent = value;
  list.append(term, description);
  return description;
}
