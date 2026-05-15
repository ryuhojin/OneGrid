export function isRecoverableDataSourceError(error: unknown): boolean | undefined {
  return typeof error === "object"
    && error !== null
    && "recoverable" in error
    && typeof (error as { readonly recoverable?: unknown }).recoverable === "boolean"
    ? (error as { readonly recoverable: boolean }).recoverable
    : undefined;
}
