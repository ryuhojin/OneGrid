import type { ExportOptions, GridExportResult } from "@onegrid/core";
import { OneGrid } from "@onegrid/dom";
import {
  exportColumns,
  exportGridOptions,
  exportImportOptions,
  exportPagedGridOptions,
  exportPagedRows,
  exportRows,
  sampleEnterpriseImport,
  exportWideColumns,
  exportWideGridOptions,
  exportWideRows
} from "./data.js";
import type { ExportRow, ExportWideRow } from "./data.js";

interface ExportInspector {
  readonly format: HTMLElement;
  readonly media: HTMLElement;
  readonly size: HTMLElement;
  readonly imported: HTMLElement;
  readonly preview: HTMLElement;
}

export function mountExportExample(el: HTMLElement): { destroy(): void } {
  const standard = createScenario("Standard export", "Export import summary");
  const paged = createScenario("Paged row export", "Paged export summary");
  const wide = createScenario("Wide column export", "Wide export summary");

  const standardInspector = createExportInspector(standard.inspector);
  const pagedInspector = createExportInspector(paged.inspector);
  const wideInspector = createExportInspector(wide.inspector);

  const standardGrid = new OneGrid<ExportRow>({
    el: standard.gridHost,
    columns: exportColumns,
    data: exportRows,
    accessibility: { label: "Export import grid" },
    ...exportGridOptions
  });
  const pagedGrid = new OneGrid<ExportRow>({
    el: paged.gridHost,
    columns: exportColumns,
    data: exportPagedRows,
    accessibility: { label: "Paged export grid" },
    ...exportPagedGridOptions
  });
  const wideGrid = new OneGrid<ExportWideRow>({
    el: wide.gridHost,
    columns: exportWideColumns,
    data: exportWideRows,
    accessibility: { label: "Wide export grid" },
    ...exportWideGridOptions
  });

  standard.actions.append(
    createButton("Export CSV", () => {
      void runExport(standardGrid, { format: "csv" }, standardInspector);
    }),
    createButton("Export selected CSV", () => {
      standardGrid.selectCellRange(
        { rowIndex: 0, rowKey: "EXP-0001", field: "program", columnIndex: 3 },
        { rowIndex: 1, rowKey: "EXP-0002", field: "memo", columnIndex: 4 }
      );
      void runExport(standardGrid, { format: "csv", selectedOnly: true }, standardInspector);
    }),
    createButton("Export XLSX", () => {
      void runExport(standardGrid, { format: "xlsx" }, standardInspector);
    }),
    createButton("Export PDF", () => {
      void runExport(standardGrid, { format: "pdf" }, standardInspector);
    }),
    createButton("Print layout", () => {
      void runExport(standardGrid, { format: "print" }, standardInspector);
    }),
    createButton("Export adapter JSON", () => {
      void runExport(standardGrid, { format: "enterprise-json" }, standardInspector);
    }),
    createButton("Import adapter JSON", async () => {
      const result = await standardGrid.importData(sampleEnterpriseImport, {
        ...exportImportOptions,
        format: "enterprise-json",
        mode: "replace"
      });
      standardInspector.imported.textContent = String(result.rowCount);
      standardInspector.preview.textContent = "Imported enterprise adapter JSON";
    }),
    createFileImport("Import CSV file", ".csv,text/csv", async (file) => {
      const result = await standardGrid.importData(await file.text(), {
        ...exportImportOptions,
        format: "csv",
        mode: "replace"
      });
      standardInspector.imported.textContent = String(result.rowCount);
      standardInspector.preview.textContent = `Imported CSV file: ${file.name}`;
    }),
    createFileImport("Import XLSX file", ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", async (file) => {
      const result = await standardGrid.importData(new Uint8Array(await file.arrayBuffer()), {
        ...exportImportOptions,
        format: "xlsx",
        mode: "replace"
      });
      standardInspector.imported.textContent = String(result.rowCount);
      standardInspector.preview.textContent = `Imported XLSX file: ${file.name}`;
    }),
    createAssetLink("CSV test file", "/export-testFile.csv"),
    createAssetLink("XLSX test file", "/export-testFile.xlsx")
  );

  paged.actions.append(
    createButton("Export paged PDF", () => {
      void runExport(pagedGrid, { format: "pdf", filename: "onegrid-paged-export.pdf" }, pagedInspector);
    }),
    createButton("Export paged XLSX", () => {
      void runExport(pagedGrid, { format: "xlsx", filename: "onegrid-paged-export.xlsx" }, pagedInspector);
    }),
    createButton("Print paged layout", () => {
      void runExport(pagedGrid, { format: "print", filename: "onegrid-paged-export.html" }, pagedInspector);
    })
  );

  wide.actions.append(
    createButton("Export wide XLSX", () => {
      void runExport(wideGrid, { format: "xlsx", filename: "onegrid-wide-export.xlsx" }, wideInspector);
    }),
    createButton("Export wide PDF", () => {
      void runExport(wideGrid, { format: "pdf", filename: "onegrid-wide-export.pdf" }, wideInspector);
    }),
    createButton("Print wide layout", () => {
      void runExport(wideGrid, { format: "print", filename: "onegrid-wide-export.html" }, wideInspector);
    })
  );

  const stack = document.createElement("div");
  stack.className = "export-example-stack";
  stack.append(standard.section, paged.section, wide.section);
  el.replaceChildren(stack);

  return {
    destroy() {
      standardGrid.destroy();
      pagedGrid.destroy();
      wideGrid.destroy();
    }
  };
}

async function runExport<TData>(
  grid: OneGrid<TData>,
  options: ExportOptions,
  inspector: ExportInspector
): Promise<void> {
  const result = await grid.exportData(options);
  inspector.format.textContent = options?.format ?? "csv";
  inspector.media.textContent = result.mediaType;
  inspector.size.textContent = String(getPayloadSize(result));
  inspector.preview.textContent = createPreview(result);
  downloadExportResult(result);
}

function createScenario(title: string, inspectorLabel: string) {
  const section = document.createElement("section");
  section.className = "export-example-section";
  const heading = document.createElement("h3");
  heading.className = "export-example-heading";
  heading.textContent = title;
  const actions = document.createElement("div");
  actions.className = "example-actions";
  const gridHost = document.createElement("div");
  const inspector = document.createElement("dl");
  inspector.className = "example-inspector";
  inspector.setAttribute("aria-label", inspectorLabel);
  section.append(heading, actions, gridHost, inspector);
  return { section, actions, gridHost, inspector };
}

function createExportInspector(inspector: HTMLDListElement): ExportInspector {
  return {
    format: appendValue(inspector, "Format", "none"),
    media: appendValue(inspector, "Media type", "none"),
    size: appendValue(inspector, "Payload size", "0"),
    imported: appendValue(inspector, "Imported rows", "0"),
    preview: appendValue(inspector, "Preview", "none")
  };
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
