import type {
  ExportOptions,
  GridExportAdapterPayload,
  GridExportMatrix,
  GridExportResult,
  GridPlugin
} from "@onegrid/core";
import { createExportAdapterPlugin } from "./ioAdapterPlugin.js";

export interface ServerDocumentExportRequest<TData = unknown> {
  readonly format: string;
  readonly matrix: GridExportMatrix;
  readonly options: ExportOptions;
  readonly rows?: readonly TData[];
}

export interface ServerDocumentFetchResponse {
  readonly ok?: boolean;
  readonly status?: number;
  readonly statusText?: string;
  readonly headers?: {
    get(name: string): string | null;
  };
  arrayBuffer(): Promise<ArrayBuffer>;
}

export type ServerDocumentFetch = (
  url: string,
  init: {
    readonly method: "POST";
    readonly headers: Readonly<Record<string, string>>;
    readonly body: string;
  }
) => Promise<ServerDocumentFetchResponse>;

export interface ServerDocumentExportAdapterOptions<TData = unknown> {
  readonly format: string;
  readonly endpoint?: string;
  readonly filename?: string;
  readonly mediaType?: string;
  readonly fetch?: ServerDocumentFetch;
  readonly request?: (request: ServerDocumentExportRequest<TData>) => GridExportResult | Promise<GridExportResult>;
}

export function createServerDocumentExportAdapter<TData = unknown>(
  options: ServerDocumentExportAdapterOptions<TData>
): GridExportAdapterPayload<TData> {
  assertServerAdapterOptions(options);
  return {
    format: options.format,
    capabilities: {
      cjkFonts: true,
      compressedXlsx: true,
      customFonts: true,
      externalWorkbook: true,
      mergedLayout: true
    },
    async export(context): Promise<GridExportResult> {
      const request: ServerDocumentExportRequest<TData> = {
        format: options.format,
        matrix: context.matrix,
        options: context.options,
        ...(context.rows === undefined ? {} : { rows: context.rows })
      };
      if (options.request) {
        return options.request(request);
      }
      return postServerDocumentRequest(options, request);
    }
  };
}

export function createServerDocumentExportAdapterPlugin<TData = unknown>(
  id: string,
  options: ServerDocumentExportAdapterOptions<TData>
): GridPlugin<TData> {
  return createExportAdapterPlugin(id, createServerDocumentExportAdapter(options));
}

async function postServerDocumentRequest<TData>(
  options: ServerDocumentExportAdapterOptions<TData>,
  request: ServerDocumentExportRequest<TData>
): Promise<GridExportResult> {
  const endpoint = options.endpoint;
  if (!endpoint) {
    throw new Error("OneGrid server export adapter requires endpoint or request.");
  }
  const response = await resolveFetch(options.fetch)(endpoint, {
    body: JSON.stringify(request),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  if (response.ok === false) {
    throw new Error(`OneGrid server export failed: ${response.status ?? 0} ${response.statusText ?? ""}`.trim());
  }
  const content = new Uint8Array(await response.arrayBuffer());
  return {
    content,
    filename: options.filename ?? `onegrid-export.${options.format}`,
    mediaType: response.headers?.get("content-type") ?? options.mediaType ?? "application/octet-stream"
  };
}

function assertServerAdapterOptions<TData>(
  options: ServerDocumentExportAdapterOptions<TData>
): void {
  if (options.format.trim().length === 0) {
    throw new Error("OneGrid server export adapter format is required.");
  }
  if (!options.endpoint && !options.request) {
    throw new Error("OneGrid server export adapter requires endpoint or request.");
  }
}

function resolveFetch(fetchOverride: ServerDocumentFetch | undefined): ServerDocumentFetch {
  if (fetchOverride) {
    return fetchOverride;
  }
  const maybeGlobal = globalThis as unknown as { readonly fetch?: ServerDocumentFetch };
  if (!maybeGlobal.fetch) {
    throw new Error("OneGrid server export adapter requires a fetch implementation.");
  }
  return maybeGlobal.fetch;
}
