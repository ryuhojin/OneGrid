import { describe, expect, it } from "vitest";
import {
  createPdfKitExportAdapter,
  createPdfKitExportAdapterPlugin,
  type PdfKitDocumentLike,
  type PdfKitFontSource,
  type PdfKitTextOptions
} from "../src/index.js";

describe("PDFKit adapter", () => {
  it("exports a grid matrix through a PDFKit-compatible document", async () => {
    const document = new MockPdfDocument();
    const adapter = createPdfKitExportAdapter({
      documentFactory: () => document,
      fonts: {
        bold: new Uint8Array([2]),
        boldName: "OneGridBold",
        regular: new Uint8Array([1]),
        regularName: "OneGridRegular"
      }
    });

    const result = await adapter.export({
      matrix: {
        bodyRows: [[{ value: "서울" }, { value: "Approved" }]],
        columns: [
          { field: "region", headerName: "Region", id: "region" },
          { field: "status", headerName: "Status", id: "status" }
        ],
        headerRows: [[{ value: "Region" }, { value: "Status" }]]
      },
      options: { format: "pdf", title: "감사 리포트" }
    });

    expect(result.mediaType).toBe("application/pdf");
    expect(new TextDecoder().decode(result.content as Uint8Array)).toContain("%PDF");
    expect(document.fonts).toEqual(["OneGridRegular", "OneGridBold"]);
    expect(document.texts).toContain("감사 리포트");
    expect(document.texts).toContain("서울");
  });

  it("creates an export adapter plugin", () => {
    const plugin = createPdfKitExportAdapterPlugin({
      documentFactory: () => new MockPdfDocument()
    });

    expect(plugin.id).toBe("onegrid-pdfkit-adapter");
  });

  it("creates PDF bytes with a real PDFKit document", async () => {
    const PDFDocument = await loadPdfKitDocument();
    const adapter = createPdfKitExportAdapter({
      documentFactory: () => new PDFDocument({ autoFirstPage: true, layout: "landscape" })
    });
    const result = await adapter.export({
      matrix: {
        bodyRows: [[{ value: "서울" }, { value: "Ready" }]],
        columns: [
          { field: "region", headerName: "Region", id: "region" },
          { field: "status", headerName: "Status", id: "status" }
        ],
        headerRows: [[{ value: "Region" }, { value: "Status" }]]
      },
      options: { format: "pdf", title: "OneGrid PDFKit" }
    });

    expect(new TextDecoder().decode((result.content as Uint8Array).slice(0, 8))).toContain("%PDF");
  });
});

async function loadPdfKitDocument(): Promise<new (options: Readonly<Record<string, unknown>>) => PdfKitDocumentLike> {
  const module = await import("pdfkit") as unknown;
  const candidate = module as {
    readonly default?: new (options: Readonly<Record<string, unknown>>) => PdfKitDocumentLike;
  };
  if (!candidate.default) {
    throw new Error("PDFKit default export was not found.");
  }
  return candidate.default;
}

class MockPdfDocument implements PdfKitDocumentLike {
  readonly fonts: string[] = [];
  readonly texts: string[] = [];
  private dataListener: ((chunk: Uint8Array) => void) | undefined;
  private endListener: (() => void) | undefined;

  registerFont(name: string, source: PdfKitFontSource): this {
    void source;
    this.fonts.push(name);
    return this;
  }

  font(name: string): this {
    void name;
    return this;
  }

  fontSize(size: number): this {
    void size;
    return this;
  }

  fillColor(color: string): this {
    void color;
    return this;
  }

  lineWidth(width: number): this {
    void width;
    return this;
  }

  rect(x: number, y: number, width: number, height: number): this {
    void x;
    void y;
    void width;
    void height;
    return this;
  }

  fill(color?: string): this {
    void color;
    return this;
  }

  stroke(color?: string): this {
    void color;
    return this;
  }

  text(text: string, x: number, y: number, options?: PdfKitTextOptions): this {
    void x;
    void y;
    void options;
    this.texts.push(text);
    return this;
  }

  end(): void {
    this.dataListener?.(new TextEncoder().encode("%PDF mock"));
    this.endListener?.();
  }

  on(event: "data" | "end" | "error", listener: ((chunk: Uint8Array) => void) | (() => void)): this {
    if (event === "data") {
      this.dataListener = listener as (chunk: Uint8Array) => void;
    }
    if (event === "end") {
      this.endListener = listener as () => void;
    }
    return this;
  }
}
