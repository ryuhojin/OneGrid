import type { ColumnModel, NormalizedColumnGroup } from "./columnModel.js";
import { freezeColumnUiState } from "./columnUi.js";
import type { ColumnUiGroupState, ColumnUiState } from "./columnUi.js";
import type { ColumnGroupDef, ColumnGroupShow } from "../types/column.js";

export function resolveColumnGroupOpen<TData>(
  column: ColumnGroupDef<TData>,
  groupId: string,
  state: ColumnUiState | undefined
): boolean {
  return state?.groups?.[groupId]?.open ?? column.openByDefault ?? true;
}

export function shouldShowInColumnGroup(
  show: ColumnGroupShow | undefined,
  parentOpen: boolean | undefined
): boolean {
  if (parentOpen === undefined || show === undefined || show === "always") {
    return true;
  }

  return show === "open" ? parentOpen : !parentOpen;
}

export function setColumnGroupOpen<TData>(
  model: ColumnModel<TData>,
  state: ColumnUiState,
  groupId: string,
  open: boolean
): ColumnUiState {
  if (!isGroupColumn(model, groupId)) {
    return state;
  }

  return patchGroupState(state, groupId, { open });
}

export function toggleColumnGroupOpen<TData>(
  model: ColumnModel<TData>,
  state: ColumnUiState,
  groupId: string
): ColumnUiState {
  const group = getGroupColumn(model, groupId);
  return group === undefined ? state : patchGroupState(state, groupId, { open: !group.open });
}

export function createColumnGroupStateSnapshot<TData>(
  model: ColumnModel<TData>
): Readonly<Record<string, ColumnUiGroupState>> | undefined {
  const groups = Object.fromEntries(
    [...model.byId.values()].flatMap((column) =>
      column.kind === "group" ? [[column.id, Object.freeze({ open: column.open })]] : []
    )
  );

  return Object.keys(groups).length === 0 ? undefined : Object.freeze(groups);
}

export function isGroupColumn<TData>(model: ColumnModel<TData>, groupId: string): boolean {
  return getGroupColumn(model, groupId) !== undefined;
}

function getGroupColumn<TData>(
  model: ColumnModel<TData>,
  groupId: string
): NormalizedColumnGroup<TData> | undefined {
  const column = model.byId.get(groupId);
  return column?.kind === "group" ? column : undefined;
}

function patchGroupState(
  state: ColumnUiState,
  groupId: string,
  patch: ColumnUiGroupState
): ColumnUiState {
  const groups = state.groups ?? {};
  return freezeColumnUiState({
    ...state,
    groups: {
      ...groups,
      [groupId]: {
        ...(groups[groupId] ?? {}),
        ...patch
      }
    }
  });
}
