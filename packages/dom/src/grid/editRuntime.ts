export type EditTrigger = "api" | "keyboard" | "pointer";

export interface GridEditRuntime {
  startEditFromCell(cell: HTMLElement, trigger: EditTrigger, initialValue?: string): boolean;
  stopEdit(options?: GridStopEditOptions): void;
  isEditingCell(cell: HTMLElement): boolean;
}

export interface GridStopEditOptions {
  readonly commit?: boolean;
  readonly validate?: boolean;
  readonly reason?: string;
}

export interface CellEditTarget {
  readonly rowKey: string;
  readonly rowIndex: number;
  readonly sourceIndex?: number;
  readonly field: string;
  readonly columnId: string;
}

export function readCellEditTarget(cell: HTMLElement): CellEditTarget | undefined {
  const row = cell.closest<HTMLElement>('[role="row"]');
  const rowKey = cell.dataset.editRowKey ?? row?.dataset.rowKey;
  const rowIndex = readInteger(cell.dataset.rowIndex)
    ?? readAriaRowIndex(row?.getAttribute("aria-rowindex"));
  const field = cell.dataset.field;
  const columnId = cell.dataset.columnId;
  if (rowKey === undefined || rowIndex === undefined || field === undefined || columnId === undefined) {
    return undefined;
  }

  const sourceIndex = readInteger(cell.dataset.sourceIndex);
  return {
    rowKey,
    rowIndex,
    ...(sourceIndex === undefined ? {} : { sourceIndex }),
    field,
    columnId
  };
}

function readAriaRowIndex(value: string | undefined | null): number | undefined {
  const parsed = readInteger(value);
  return parsed === undefined ? undefined : Math.max(0, parsed - 1);
}

function readInteger(value: string | undefined | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}
