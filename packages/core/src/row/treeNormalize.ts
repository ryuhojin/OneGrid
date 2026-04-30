import { readField, resolveRowKey } from "./rowIdentity.js";
import type { TreeNode, TreeRowModelOptions, TreeRowStore } from "./treeTypes.js";
import type { RowKey } from "../types/shared.js";

export function normalizeTreeRows<TData>(
  rows: readonly TData[],
  options: TreeRowModelOptions<TData> = {}
): TreeRowStore<TData> {
  const nodes = new Map<RowKey, TreeNode<TData>>();
  const roots = normalizeRows(rows, options, nodes, undefined, 0, []);
  return Object.freeze({ roots, nodes });
}

export function normalizeTreeChildren<TData>(
  rows: readonly TData[],
  parent: TreeNode<TData>,
  options: TreeRowModelOptions<TData>
): TreeRowStore<TData> {
  const nodes = new Map<RowKey, TreeNode<TData>>();
  const roots = normalizeRows(rows, options, nodes, parent.key, parent.depth + 1, parent.path);
  return Object.freeze({ roots, nodes });
}

function normalizeRows<TData>(
  rows: readonly TData[],
  options: TreeRowModelOptions<TData>,
  nodes: Map<RowKey, TreeNode<TData>>,
  parentKey: RowKey | undefined,
  depth: number,
  parentPath: readonly RowKey[]
): readonly RowKey[] {
  const keys: RowKey[] = [];
  rows.forEach((row, index) => {
    const key = resolveRowKey(row, index, options.rowKey);
    const children = readChildren(row, options.childrenField);
    const hasLazyChildren = readHasChildren(row, options.hasChildrenField);
    const hasChildren = children.length > 0 || hasLazyChildren;
    const childPath = Object.freeze([...parentPath, key]);
    const childKeys = normalizeRows(children, options, nodes, key, depth + 1, childPath);
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

function readChildren<TData>(row: TData, childrenField = "children"): readonly TData[] {
  const value = readField(row, childrenField);
  return Array.isArray(value) ? value as readonly TData[] : [];
}

function readHasChildren<TData>(row: TData, hasChildrenField = "hasChildren"): boolean {
  return readField(row, hasChildrenField) === true;
}
