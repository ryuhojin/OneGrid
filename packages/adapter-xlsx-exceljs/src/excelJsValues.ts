import type { BufferLike, ExcelJsCellPrimitive } from "./excelJsTypes.js";

export function toUint8Array(content: string | Uint8Array | ArrayBuffer | BufferLike): Uint8Array {
  if (typeof content === "string") {
    return encodeUtf8(content);
  }
  if (content instanceof Uint8Array) {
    return content;
  }
  if (content instanceof ArrayBuffer) {
    return new Uint8Array(content);
  }
  return new Uint8Array(content.buffer, content.byteOffset ?? 0, content.byteLength);
}

export function toArrayBuffer(content: string | Uint8Array): ArrayBuffer {
  const bytes = toUint8Array(content);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export function normalizeExportValue(value: unknown): ExcelJsCellPrimitive {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value instanceof Date) {
    return value;
  }
  return String(value);
}

export function normalizeImportValue(value: unknown, formulaMode: "result" | "formula"): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "object") {
    return normalizeObjectValue(value as Readonly<Record<string, unknown>>, formulaMode);
  }
  return String(value);
}

function normalizeObjectValue(
  value: Readonly<Record<string, unknown>>,
  formulaMode: "result" | "formula"
): string {
  if (typeof value.text === "string") {
    return value.text;
  }
  if (Array.isArray(value.richText)) {
    return value.richText.map((part) =>
      typeof part === "object" && part !== null && "text" in part ? String(part.text ?? "") : ""
    ).join("");
  }
  if (formulaMode === "formula" && typeof value.formula === "string") {
    return value.formula;
  }
  if ("result" in value) {
    return normalizeImportValue(value.result, formulaMode);
  }
  if ("hyperlink" in value && typeof value.hyperlink === "string") {
    return value.hyperlink;
  }
  return JSON.stringify(value);
}

function encodeUtf8(value: string): Uint8Array {
  const bytes: number[] = [];
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code <= 0x7f) {
      bytes.push(code);
    } else if (code <= 0x7ff) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code <= 0xffff) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      );
    }
  }
  return new Uint8Array(bytes);
}
