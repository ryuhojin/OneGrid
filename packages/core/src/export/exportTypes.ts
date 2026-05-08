import type { ExportOptions, ImportOptions } from "../types/grid-options.js";
import type { GridExportResult } from "../types/shared.js";

export type GridExportFormat = NonNullable<ExportOptions["format"]>;

export interface GridExportColumn {
  readonly id: string;
  readonly field: string;
  readonly headerName: string;
}

export interface GridExportCell {
  readonly value: unknown;
  readonly covered?: boolean;
  readonly rowSpan?: number;
  readonly colSpan?: number;
}

export interface GridExportMatrix {
  readonly columns: readonly GridExportColumn[];
  readonly headerRows: readonly (readonly GridExportCell[])[];
  readonly bodyRows: readonly (readonly GridExportCell[])[];
}

export interface GridExportAdapterContext<TData = unknown> {
  readonly matrix: GridExportMatrix;
  readonly options: ExportOptions;
  readonly rows?: readonly TData[];
}

export interface GridExportAdapterPayload<TData = unknown> {
  readonly format: GridExportFormat;
  export(context: GridExportAdapterContext<TData>): GridExportResult | Promise<GridExportResult>;
}

export interface GridImportMatrix {
  readonly rows: readonly (readonly string[])[];
}

export interface GridExportFile {
  readonly content: string | Uint8Array;
  readonly mediaType: string;
  readonly extension: string;
}

export interface GridImportBuildInput<TData = unknown> {
  readonly matrix: GridImportMatrix;
  readonly options?: ImportOptions<TData>;
  readonly fallbackColumns?: readonly GridExportColumn[];
}

export interface GridImportBuildResult<TData = unknown> {
  readonly rows: readonly TData[];
  readonly rejected: readonly {
    readonly rowIndex: number;
    readonly reason: string;
    readonly values: readonly unknown[];
  }[];
}
