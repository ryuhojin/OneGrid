import { createExportAdapterPlugin } from "@onegrid/adapters";
import type { GridPlugin } from "@onegrid/core";
import {
  createPdfKitExportAdapter,
  type PdfKitExportAdapterOptions
} from "./pdfKitExportAdapter.js";

export type {
  PdfKitDocumentLike,
  PdfKitFontOptions,
  PdfKitFontSource,
  PdfKitTextOptions
} from "./pdfKitTypes.js";
export {
  createPdfKitExportAdapter,
  type PdfKitExportAdapterOptions
};

export interface PdfKitAdapterPluginOptions<TData = unknown> extends PdfKitExportAdapterOptions<TData> {
  readonly id?: string;
}

export function createPdfKitExportAdapterPlugin<TData = unknown>(
  options: PdfKitAdapterPluginOptions<TData>
): GridPlugin<TData> {
  return createExportAdapterPlugin(
    options.id ?? "onegrid-pdfkit-adapter",
    createPdfKitExportAdapter(options)
  );
}
