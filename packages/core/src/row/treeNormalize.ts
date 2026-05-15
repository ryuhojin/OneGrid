import {
  normalizeRowIdentityOptions,
  readField,
  resolveDuplicateRowKeyPolicy,
  resolveRowKey,
  resolveUniqueRowKey
} from "./rowIdentity.js";
import type { DuplicateRowKeyPolicy, RowKeyInput } from "./rowIdentity.js";
import type { TreeNode, TreeRowModelOptions, TreeRowStore } from "./treeTypes.js";
import type { RowKey } from "../types/shared.js";

export function normalizeTreeRows<TData>(
  rows: readonly TData[],
  options: TreeRowModelOptions<TData> = {}
): TreeRowStore<TData> {
  const nodes = new Map<RowKey, TreeNode<TData>>();
  const context = createNormalizeContext(options);
  const roots = normalizeRows(rows, options, nodes, context, undefined, 0, []);
  return Object.freeze({ roots, nodes });
}

export function normalizeTreeChildren<TData>(
  rows: readonly TData[],
  parent: TreeNode<TData>,
  options: TreeRowModelOptions<TData>,
  usedKeys?: ReadonlyMap<RowKey, number>
): TreeRowStore<TData> {
  const nodes = new Map<RowKey, TreeNode<TData>>();
  const context = createNormalizeContext(options, usedKeys);
  const roots = normalizeRows(rows, options, nodes, context, parent.key, parent.depth + 1, parent.path);
  return Object.freeze({ roots, nodes });
}

export function createTreeUsedRowKeyMap<TData>(
  nodes: ReadonlyMap<RowKey, TreeNode<TData>>
): Map<RowKey, number> {
  let index = 0;
  return new Map([...nodes.keys()].map((key) => [key, index++] as const));
}

interface TreeNormalizeContext<TData> {
  readonly rowKey?: RowKeyInput<TData>;
  readonly duplicateRowKeyPolicy: DuplicateRowKeyPolicy;
  readonly usedKeys: Map<RowKey, number>;
  nextIndex: number;
}

function normalizeRows<TData>(
  rows: readonly TData[],
  options: TreeRowModelOptions<TData>,
  nodes: Map<RowKey, TreeNode<TData>>,
  context: TreeNormalizeContext<TData>,
  parentKey: RowKey | undefined,
  depth: number,
  parentPath: readonly RowKey[]
): readonly RowKey[] {
  const keys: RowKey[] = [];
  rows.forEach((row) => {
    const rowIndex = context.nextIndex++;
    const key = resolveUniqueRowKey(
      resolveRowKey(row, rowIndex, context.rowKey),
      context.usedKeys,
      context.duplicateRowKeyPolicy,
      rowIndex
    );
    context.usedKeys.set(key, rowIndex);
    const children = readChildren(row, options.childrenField);
    const hasLazyChildren = readHasChildren(row, options.hasChildrenField);
    const hasChildren = children.length > 0 || hasLazyChildren;
    const childPath = Object.freeze([...parentPath, key]);
    const childKeys = normalizeRows(children, options, nodes, context, key, depth + 1, childPath);
    const node: TreeNode<TData> = Object.freeze({
      key,
      ...(parentKey === undefined ? {} : { parentKey }),
      data: row,
      depth,
      path: childPath,
      childrenKeys: childKeys,
      hasChildren,
      childrenLoaded: children.length > 0 || !hasLazyChildren
    });

    nodes.set(key, node);
    keys.push(key);
  });

  return Object.freeze(keys);
}

function createNormalizeContext<TData>(
  options: TreeRowModelOptions<TData>,
  usedKeys?: ReadonlyMap<RowKey, number>
): TreeNormalizeContext<TData> {
  const identity = normalizeRowIdentityOptions({
    ...(options.rowKey === undefined ? {} : { rowKey: options.rowKey }),
    ...(options.duplicateRowKeyPolicy === undefined
      ? {}
      : { duplicateRowKeyPolicy: options.duplicateRowKeyPolicy })
  });
  return {
    ...(identity.rowKey === undefined ? {} : { rowKey: identity.rowKey }),
    duplicateRowKeyPolicy: resolveDuplicateRowKeyPolicy(identity),
    usedKeys: new Map(usedKeys),
    nextIndex: usedKeys?.size ?? 0
  };
}

function readChildren<TData>(row: TData, childrenField = "children"): readonly TData[] {
  const value = readField(row, childrenField);
  return Array.isArray(value) ? value as readonly TData[] : [];
}

function readHasChildren<TData>(row: TData, hasChildrenField = "hasChildren"): boolean {
  return readField(row, hasChildrenField) === true;
}
