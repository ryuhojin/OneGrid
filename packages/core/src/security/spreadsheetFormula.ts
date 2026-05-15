const FORMULA_PREFIXES = new Set(["=", "+", "-", "@"]);

export function formatSpreadsheetTextCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value !== "string") {
    return String(value);
  }
  return neutralizeSpreadsheetFormula(value);
}

export function neutralizeSpreadsheetFormula(value: string): string {
  return isSpreadsheetFormulaLike(value) ? `'${value}` : value;
}

export function isSpreadsheetFormulaLike(value: string): boolean {
  const trimmed = value.trimStart();
  return trimmed.length > 0 && FORMULA_PREFIXES.has(trimmed[0] ?? "");
}
