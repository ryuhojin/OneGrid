import type { GridExportAdapterPayload, GridExportResult } from "@onegrid/core";
import { drawPdfKitMatrix } from "./pdfKitLayout.js";
import { collectPdfKitDocument } from "./pdfKitStream.js";
import type { PdfKitDocumentLike, PdfKitFontOptions } from "./pdfKitTypes.js";

export interface PdfKitExportAdapterOptions<TData = unknown> {
  readonly documentFactory: () => PdfKitDocumentLike | Promise<PdfKitDocumentLike>;
  readonly format?: string;
  readonly filename?: string;
  readonly fonts?: PdfKitFontOptions;
  readonly rows?: readonly TData[];
}

export function createPdfKitExportAdapter<TData = unknown>(
  options: PdfKitExportAdapterOptions<TData>
): GridExportAdapterPayload<TData> {
  return {
    format: options.format ?? "pdf",
    capabilities: {
      cjkFonts: true,
      customFonts: true,
      mergedLayout: true
    },
    async export(context): Promise<GridExportResult> {
      const document = await options.documentFactory();
      const fonts = registerFonts(document, options.fonts);
      const content = await collectPdfKitDocument(document, () => {
        drawPdfKitMatrix(document, context.matrix, {
          boldFont: fonts.bold,
          regularFont: fonts.regular,
          title: context.options.title ?? "OneGrid Export"
        });
      });
      return {
        content,
        filename: context.options.filename ?? options.filename ?? "onegrid-export.pdf",
        mediaType: "application/pdf"
      };
    }
  };
}

function registerFonts(
  document: PdfKitDocumentLike,
  fonts: PdfKitFontOptions | undefined
): { readonly regular: string; readonly bold: string } {
  const regular = fonts?.regularName ?? "Helvetica";
  const bold = fonts?.boldName ?? "Helvetica-Bold";
  if (fonts?.regular && document.registerFont) {
    document.registerFont(regular, fonts.regular);
  }
  if (fonts?.bold && document.registerFont) {
    document.registerFont(bold, fonts.bold);
  }
  return { regular, bold };
}
