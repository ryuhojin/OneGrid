export function allocateColumnId(baseId: string, ids: Set<string>): string {
  const normalizedBaseId = baseId.trim().length > 0 ? baseId.trim() : "column";
  let candidate = normalizedBaseId;
  let suffix = 2;

  while (ids.has(candidate)) {
    candidate = `${normalizedBaseId}__${suffix}`;
    suffix += 1;
  }

  ids.add(candidate);
  return candidate;
}
