export interface ClipboardGridCell {
  readonly value: unknown;
  readonly covered?: boolean;
}

export interface ClipboardCopyMatrixInput {
  readonly rows: readonly (readonly ClipboardGridCell[])[];
  readonly headers?: readonly string[];
  readonly includeHeaders?: boolean;
}

export interface ClipboardPastePlanInput {
  readonly text: string;
  readonly anchorRowIndex: number;
  readonly anchorColumnIndex: number;
  readonly rowCount: number;
  readonly columnCount: number;
  isEditable?(rowIndex: number, columnIndex: number): boolean;
}

export interface ClipboardPastePatch {
  readonly rowIndex: number;
  readonly columnIndex: number;
  readonly rawValue: string;
}

export interface ClipboardPasteRejectedCell {
  readonly rowIndex: number;
  readonly columnIndex: number;
  readonly rawValue: string;
  readonly reason: "out-of-range" | "readonly";
}

export interface ClipboardPastePlan {
  readonly patches: readonly ClipboardPastePatch[];
  readonly rejected: readonly ClipboardPasteRejectedCell[];
}

export function createClipboardText(input: ClipboardCopyMatrixInput): string {
  const rows: unknown[][] = [];
  if (input.includeHeaders === true && input.headers) {
    rows.push([...input.headers]);
  }

  for (const row of input.rows) {
    rows.push(row.map((cell) => cell.covered === true ? "" : cell.value));
  }

  return serializeClipboardMatrix(rows);
}

export function serializeClipboardMatrix(rows: readonly (readonly unknown[])[]): string {
  return rows
    .map((row) => row.map(formatClipboardValue).join("\t"))
    .join("\r\n");
}

export function parseClipboardText(text: string): readonly (readonly string[])[] {
  if (text.length === 0) {
    return Object.freeze([]);
  }

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === "\"" && text[index + 1] === "\"") {
        cell += "\"";
        index += 1;
      } else if (char === "\"") {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === "\"" && cell.length === 0) {
      quoted = true;
    } else if (char === "\t") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      if (char === "\r" && text[index + 1] === "\n") {
        index += 1;
      }
    } else {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0 || !endsWithRowBreak(text)) {
    row.push(cell);
    rows.push(row);
  }

  return Object.freeze(rows.map((item) => Object.freeze(item)));
}

export function createClipboardPastePlan(input: ClipboardPastePlanInput): ClipboardPastePlan {
  const matrix = parseClipboardText(input.text);
  const patches: ClipboardPastePatch[] = [];
  const rejected: ClipboardPasteRejectedCell[] = [];

  matrix.forEach((row, rowOffset) => {
    row.forEach((rawValue, columnOffset) => {
      const rowIndex = input.anchorRowIndex + rowOffset;
      const columnIndex = input.anchorColumnIndex + columnOffset;
      if (rowIndex >= input.rowCount || columnIndex >= input.columnCount) {
        rejected.push({ rowIndex, columnIndex, rawValue, reason: "out-of-range" });
        return;
      }
      if (input.isEditable && !input.isEditable(rowIndex, columnIndex)) {
        rejected.push({ rowIndex, columnIndex, rawValue, reason: "readonly" });
        return;
      }
      patches.push({ rowIndex, columnIndex, rawValue });
    });
  });

  return Object.freeze({
    patches: Object.freeze(patches),
    rejected: Object.freeze(rejected)
  });
}

function formatClipboardValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);
  return /[\t\r\n"]/u.test(text)
    ? `"${text.replaceAll("\"", "\"\"")}"`
    : text;
}

function endsWithRowBreak(text: string): boolean {
  return text.endsWith("\n") || text.endsWith("\r");
}
