import type { DataColumnDef } from "../types/column.js";
import type { ColumnId, RowKey } from "../types/shared.js";

export type ContextMenuScope = "row" | "cell";

export type ContextMenuAction =
  | "copyCell"
  | "copyRow"
  | "copyWithHeaders"
  | "startEdit"
  | "clearSelection";

export interface ContextMenuContext<TData = unknown> {
  readonly scope: ContextMenuScope;
  readonly row: TData;
  readonly rowIndex: number;
  readonly rowKey: RowKey;
  readonly sourceIndex?: number;
  readonly field?: string;
  readonly columnId?: ColumnId;
  readonly columnIndex?: number;
  readonly column?: DataColumnDef<TData>;
  readonly value?: unknown;
}

export type ContextMenuPredicate<TData = unknown> =
  (context: ContextMenuContext<TData>) => boolean;

export type ContextMenuItemProvider<TData = unknown> =
  (context: ContextMenuContext<TData>) => readonly ContextMenuItemDef<TData>[];

export interface ContextMenuItemDef<TData = unknown> {
  readonly id: string;
  readonly label: string;
  readonly scope?: ContextMenuScope | readonly ContextMenuScope[];
  readonly action?: ContextMenuAction;
  readonly visible?: boolean | ContextMenuPredicate<TData>;
  readonly disabled?: boolean | ContextMenuPredicate<TData>;
  onSelect?(context: ContextMenuContext<TData>): void;
}

export interface ContextMenuExtensionPayload<TData = unknown> {
  readonly item: ContextMenuItemDef<TData>;
}

export interface ContextMenuOptions<TData = unknown> {
  readonly enabled?: boolean;
  readonly defaultItems?: readonly ContextMenuAction[] | false;
  readonly items?: readonly ContextMenuItemDef<TData>[] | ContextMenuItemProvider<TData>;
}

export interface ContextMenuCapabilities {
  readonly canCopy?: boolean;
  readonly canEdit?: boolean;
  readonly hasSelection?: boolean;
}

export interface ContextMenuModelItem<TData = unknown> {
  readonly id: string;
  readonly label: string;
  readonly action?: ContextMenuAction;
  readonly enabled: boolean;
  readonly source?: ContextMenuItemDef<TData>;
}

export interface ContextMenuModel<TData = unknown> {
  readonly context: ContextMenuContext<TData>;
  readonly items: readonly ContextMenuModelItem<TData>[];
}

export interface CreateContextMenuModelInput<TData = unknown> {
  readonly context: ContextMenuContext<TData>;
  readonly options?: ContextMenuOptions<TData>;
  readonly capabilities?: ContextMenuCapabilities;
  readonly extensionItems?: readonly ContextMenuItemDef<TData>[];
}

const DEFAULT_ACTIONS: readonly ContextMenuAction[] = [
  "copyCell",
  "copyRow",
  "copyWithHeaders",
  "startEdit",
  "clearSelection"
];

export function createContextMenuModel<TData>(
  input: CreateContextMenuModelInput<TData>
): ContextMenuModel<TData> | undefined {
  if (input.options?.enabled !== true) {
    return undefined;
  }

  const items = [
    ...createDefaultItems(input),
    ...createCustomItems(input),
    ...createExtensionItems(input)
  ];
  if (items.length === 0) {
    return undefined;
  }

  return Object.freeze({
    context: input.context,
    items: Object.freeze(items)
  });
}

function createExtensionItems<TData>(
  input: CreateContextMenuModelInput<TData>
): readonly ContextMenuModelItem<TData>[] {
  return (input.extensionItems ?? [])
    .filter((item) => isItemVisible(item, input.context))
    .map((item) => Object.freeze({
      id: `extension:${item.id}`,
      label: item.label,
      ...(item.action === undefined ? {} : { action: item.action }),
      enabled: !resolvePredicate(item.disabled, input.context),
      source: item
    }));
}

function createDefaultItems<TData>(
  input: CreateContextMenuModelInput<TData>
): readonly ContextMenuModelItem<TData>[] {
  if (input.options?.defaultItems === false) {
    return [];
  }

  const actions = input.options?.defaultItems ?? DEFAULT_ACTIONS;
  return actions
    .filter((action) => isDefaultActionVisible(action, input.context))
    .map((action) => Object.freeze({
      id: `default:${action}`,
      label: getDefaultActionLabel(action),
      action,
      enabled: isDefaultActionEnabled(action, input.capabilities)
    }));
}

function createCustomItems<TData>(
  input: CreateContextMenuModelInput<TData>
): readonly ContextMenuModelItem<TData>[] {
  const items = typeof input.options?.items === "function"
    ? input.options.items(input.context)
    : input.options?.items ?? [];

  return items
    .filter((item) => isItemVisible(item, input.context))
    .map((item) => Object.freeze({
      id: item.id,
      label: item.label,
      ...(item.action === undefined ? {} : { action: item.action }),
      enabled: !resolvePredicate(item.disabled, input.context),
      source: item
    }));
}

function isDefaultActionVisible<TData>(
  action: ContextMenuAction,
  context: ContextMenuContext<TData>
): boolean {
  return action !== "copyCell" && action !== "startEdit" ? true : context.field !== undefined;
}

function isDefaultActionEnabled(
  action: ContextMenuAction,
  capabilities: ContextMenuCapabilities | undefined
): boolean {
  if (action === "startEdit") {
    return capabilities?.canEdit === true;
  }
  if (action === "clearSelection") {
    return capabilities?.hasSelection === true;
  }
  return capabilities?.canCopy === true;
}

function getDefaultActionLabel(action: ContextMenuAction): string {
  if (action === "copyCell") return "Copy cell";
  if (action === "copyRow") return "Copy row";
  if (action === "copyWithHeaders") return "Copy row with headers";
  if (action === "startEdit") return "Start edit";
  return "Clear selection";
}

function isItemVisible<TData>(
  item: ContextMenuItemDef<TData>,
  context: ContextMenuContext<TData>
): boolean {
  return matchesScope(item.scope, context.scope) && resolvePredicate(item.visible, context, true);
}

function matchesScope(
  itemScope: ContextMenuScope | readonly ContextMenuScope[] | undefined,
  contextScope: ContextMenuScope
): boolean {
  if (itemScope === undefined) {
    return true;
  }
  const scopes = Array.isArray(itemScope) ? itemScope : [itemScope];
  return scopes.includes(contextScope) || (contextScope === "cell" && scopes.includes("row"));
}

function resolvePredicate<TData>(
  value: boolean | ContextMenuPredicate<TData> | undefined,
  context: ContextMenuContext<TData>,
  defaultValue = false
): boolean {
  return typeof value === "function" ? value(context) : value ?? defaultValue;
}
