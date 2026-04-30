import type { TreeNode, TreeSelectionPolicy } from "./treeTypes.js";
import type { RowKey } from "../types/shared.js";

export function applyTreeSelection<TData>(
  nodes: ReadonlyMap<RowKey, TreeNode<TData>>,
  selectedKeys: ReadonlySet<RowKey>,
  key: RowKey,
  selected: boolean,
  policy: TreeSelectionPolicy
): ReadonlySet<RowKey> {
  const next = new Set(selectedKeys);
  const keys = policy === "descendants" ? [key, ...collectDescendantKeys(nodes, key)] : [key];
  keys.forEach((item) => {
    if (selected) {
      next.add(item);
    } else {
      next.delete(item);
    }
  });
  return next;
}

export function collectDescendantKeys<TData>(
  nodes: ReadonlyMap<RowKey, TreeNode<TData>>,
  key: RowKey
): readonly RowKey[] {
  const node = nodes.get(key);
  if (!node) {
    return [];
  }

  const result: RowKey[] = [];
  node.childrenKeys.forEach((childKey) => {
    result.push(childKey, ...collectDescendantKeys(nodes, childKey));
  });
  return Object.freeze(result);
}
