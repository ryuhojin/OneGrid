import type {
  GridExportAdapterPayload,
  GridImportAdapterPayload,
  GridPlugin
} from "@onegrid/core";

export interface GridIoAdapterPluginOptions<TData = unknown> {
  readonly id: string;
  readonly version?: string;
  readonly dependencies?: readonly string[];
  readonly exports?: readonly GridExportAdapterPayload<TData>[];
  readonly imports?: readonly GridImportAdapterPayload<TData>[];
}

export function createGridIoAdapterPlugin<TData = unknown>(
  options: GridIoAdapterPluginOptions<TData>
): GridPlugin<TData> {
  assertPluginId(options.id);
  assertNoDuplicateFormats("export", options.exports ?? []);
  assertNoDuplicateFormats("import", options.imports ?? []);

  return {
    id: options.id,
    ...(options.version === undefined ? {} : { version: options.version }),
    ...(options.dependencies === undefined ? {} : { dependencies: options.dependencies }),
    setup(context) {
      for (const adapter of options.exports ?? []) {
        context.registerExtension<GridExportAdapterPayload<TData>>({
          id: `export:${adapter.format}`,
          point: "export.adapter",
          payload: adapter
        });
      }
      for (const adapter of options.imports ?? []) {
        context.registerExtension<GridImportAdapterPayload<TData>>({
          id: `import:${adapter.format}`,
          point: "import.adapter",
          payload: adapter
        });
      }
      return undefined;
    }
  };
}

export function createExportAdapterPlugin<TData = unknown>(
  id: string,
  adapter: GridExportAdapterPayload<TData>
): GridPlugin<TData> {
  return createGridIoAdapterPlugin({ id, exports: [adapter] });
}

export function createImportAdapterPlugin<TData = unknown>(
  id: string,
  adapter: GridImportAdapterPayload<TData>
): GridPlugin<TData> {
  return createGridIoAdapterPlugin({ id, imports: [adapter] });
}

function assertPluginId(id: string): void {
  if (id.trim().length === 0) {
    throw new Error("OneGrid adapter plugin id is required");
  }
}

function assertNoDuplicateFormats(
  kind: "export" | "import",
  adapters: readonly { readonly format: string }[]
): void {
  const formats = new Set<string>();
  for (const adapter of adapters) {
    if (adapter.format.trim().length === 0) {
      throw new Error(`OneGrid ${kind} adapter format is required`);
    }
    if (formats.has(adapter.format)) {
      throw new Error(`Duplicate OneGrid ${kind} adapter format: ${adapter.format}`);
    }
    formats.add(adapter.format);
  }
}
