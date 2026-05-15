import { describe, expect, it } from "vitest";
import {
  createExportAdapterPlugin,
  createGridIoAdapterPlugin,
  createImportAdapterPlugin
} from "../src/index.js";
import type {
  GridExportAdapterPayload,
  GridImportAdapterPayload,
  GridPluginContext
} from "@onegrid/core";

describe("@onegrid/adapters IO adapter plugins", () => {
  it("creates lifecycle-bound export and import adapter extensions", () => {
    const exportAdapter: GridExportAdapterPayload = {
      format: "enterprise-pdf",
      capabilities: { cjkFonts: true, customFonts: true, mergedLayout: true },
      export: () => ({ content: "pdf", mediaType: "application/pdf" })
    };
    const importAdapter: GridImportAdapterPayload<{ id: string }> = {
      format: "enterprise-xlsx",
      capabilities: { compressedXlsx: true, externalWorkbook: true },
      import: () => ({ rows: [{ id: "A" }], rowCount: 1, rejected: [] })
    };
    const context = createContext();
    const plugin = createGridIoAdapterPlugin({
      id: "enterprise-document-io",
      exports: [exportAdapter],
      imports: [importAdapter]
    });

    plugin.setup(context as unknown as GridPluginContext);

    expect(context.extensions).toEqual([
      expect.objectContaining({ id: "export:enterprise-pdf", point: "export.adapter" }),
      expect.objectContaining({ id: "import:enterprise-xlsx", point: "import.adapter" })
    ]);
  });

  it("provides single-purpose adapter plugin helpers", () => {
    expect(createExportAdapterPlugin("pdf-plugin", {
      format: "pdf",
      export: () => ({ content: "pdf", mediaType: "application/pdf" })
    }).id).toBe("pdf-plugin");

    expect(createImportAdapterPlugin("xlsx-plugin", {
      format: "xlsx",
      import: () => ({ rows: [], rowCount: 0, rejected: [] })
    }).id).toBe("xlsx-plugin");
  });

  it("rejects duplicate adapter formats inside the same plugin", () => {
    expect(() => createGridIoAdapterPlugin({
      id: "bad",
      exports: [
        { format: "pdf", export: () => ({ content: "a", mediaType: "application/pdf" }) },
        { format: "pdf", export: () => ({ content: "b", mediaType: "application/pdf" }) }
      ]
    })).toThrow("Duplicate OneGrid export adapter format: pdf");
  });
});

function createContext() {
  return {
    extensions: [] as { readonly id: string; readonly point: string; readonly payload?: unknown }[],
    registerExtension(extension: { readonly id: string; readonly point: string; readonly payload?: unknown }) {
      this.extensions.push(extension);
      return () => undefined;
    }
  };
}
