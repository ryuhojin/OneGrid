export type RenderInvalidationScope =
  | "all"
  | "columns"
  | "rows"
  | "layout"
  | "overlay";

export interface RenderInvalidation {
  readonly scopes: readonly RenderInvalidationScope[];
  readonly reason: string;
}

export function fullInvalidation(reason = "full"): RenderInvalidation {
  return {
    scopes: ["all"],
    reason
  };
}

export function invalidate(
  scopes: readonly RenderInvalidationScope[],
  reason: string
): RenderInvalidation {
  return {
    scopes: normalizeScopes(scopes),
    reason
  };
}

export function mergeInvalidations(
  current: RenderInvalidation | undefined,
  next: RenderInvalidation
): RenderInvalidation {
  if (!current) {
    return next;
  }

  if (current.scopes.includes("all") || next.scopes.includes("all")) {
    return current.scopes.includes("all") ? current : next;
  }

  return {
    scopes: normalizeScopes([...current.scopes, ...next.scopes]),
    reason: `${current.reason},${next.reason}`
  };
}

function normalizeScopes(scopes: readonly RenderInvalidationScope[]): readonly RenderInvalidationScope[] {
  if (scopes.includes("all")) {
    return ["all"];
  }

  return Array.from(new Set(scopes));
}
