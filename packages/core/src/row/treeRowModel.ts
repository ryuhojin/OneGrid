import { isFilterModelEmpty } from "../filtering/index.js";
import { filterClientRows } from "./clientFilter.js";
import { sortClientRows } from "./clientSort.js";
import { normalizeTreeChildren, normalizeTreeRows } from "./treeNormalize.js";
import { applyTreeSelection, collectDescendantKeys } from "./treeSelection.js";
import type {
  TreeNode,
  TreeRowEntry,
  TreeRowModelOptions,
  TreeRowStore,
  TreeSelectionState
} from "./treeTypes.js";
import type { ClientRowNode } from "./rowIdentity.js";
import type { FilterModel, RowKey, SortModel } from "../types/shared.js";

const DEFAULT_INDENT_SIZE = 18;

export class TreeRowModel<TData = unknown> {
  private readonly options: TreeRowModelOptions<TData>;
  private store: TreeRowStore<TData>;
  private readonly expandedKeys: Set<RowKey>;
  private readonly loadingKeys = new Set<RowKey>();
  private filterModel: FilterModel | undefined;
  private sortModel: readonly SortModel[] | undefined;
  private selectedKeys: ReadonlySet<RowKey>;
  private requestSequence = 0;

  constructor(rows: readonly TData[], options: TreeRowModelOptions<TData> = {}) {
    this.options = options;
    this.store = normalizeTreeRows(rows, options);
    this.expandedKeys = new Set(options.expandedKeys ?? []);
    this.filterModel = options.filterModel;
    this.sortModel = options.sortModel;
    this.selectedKeys = new Set(options.selection?.selectedKeys ?? []);
  }

  get visibleRows(): readonly TreeRowEntry<TData>[] {
    const entries: TreeRowEntry<TData>[] = [];
    const includedKeys = this.getIncludedKeys();
    this.getOrderedKeys(this.store.roots, includedKeys)
      .forEach((key) => this.appendVisibleNode(entries, key, includedKeys));
    return Object.freeze(entries.map((entry, rowIndex) => Object.freeze({ ...entry, rowIndex })));
  }

  get rowCount(): number {
    return this.visibleRows.length;
  }

  get selected(): readonly RowKey[] {
    return Object.freeze([...this.selectedKeys]);
  }

  isExpanded(key: RowKey): boolean {
    return this.expandedKeys.has(key);
  }

  setFilterModel(model: FilterModel | undefined): void {
    this.filterModel = model;
  }

  setSortModel(model: readonly SortModel[] | undefined): void {
    this.sortModel = model;
  }

  async expand(key: RowKey): Promise<void> {
    const node = this.store.nodes.get(key);
    if (!node || !node.hasChildren) {
      return;
    }

    if (!node.childrenLoaded) {
      await this.loadChildren(key);
    }
    this.expandedKeys.add(key);
  }

  collapse(key: RowKey): void {
    this.expandedKeys.delete(key);
  }

  async toggle(key: RowKey): Promise<void> {
    if (this.expandedKeys.has(key)) {
      this.collapse(key);
      return;
    }

    await this.expand(key);
  }

  async loadChildren(key: RowKey): Promise<readonly TreeNode<TData>[]> {
    const parent = this.store.nodes.get(key);
    const loader = this.options.dataSource?.getChildren;
    if (!parent || parent.childrenLoaded || !loader) {
      return [];
    }

    this.loadingKeys.add(key);
    const result = await loader({
        parentKey: key,
        depth: parent.depth + 1,
        ...(this.sortModel === undefined ? {} : { sortModel: this.sortModel }),
        ...(this.filterModel === undefined ? {} : { filterModel: this.filterModel }),
        requestId: `tree:${++this.requestSequence}:${String(key)}`
      });
    const childStore = normalizeTreeChildren(result.rows, parent, this.options);
    this.mergeChildren(parent, childStore);
    this.loadingKeys.delete(key);
    return Object.freeze([...childStore.nodes.values()]);
  }

  select(key: RowKey, selected: boolean): void {
    this.selectedKeys = applyTreeSelection(
      this.store.nodes,
      this.selectedKeys,
      key,
      selected,
      this.options.selection?.policy ?? "self"
    );
  }

  private getIncludedKeys(): ReadonlySet<RowKey> | undefined {
    if (this.options.serverOnly === true || isFilterModelEmpty(this.filterModel)) {
      return undefined;
    }

    const matchedKeys = this.getMatchedKeys();
    const included = new Set(matchedKeys);
    const policy = this.options.filterPolicy ?? "withAncestors";

    if (policy === "withAncestors" || policy === "withAncestorsAndDescendants") {
      matchedKeys.forEach((key) => this.addAncestors(included, key));
    }

    if (policy === "withDescendants" || policy === "withAncestorsAndDescendants") {
      matchedKeys.forEach((key) => {
        collectDescendantKeys(this.store.nodes, key).forEach((childKey) => included.add(childKey));
      });
    }

    return included;
  }

  private getMatchedKeys(): readonly RowKey[] {
    const nodes = [...this.store.nodes.values()].map((node, index) => toClientRowNode(node, index));
    return filterClientRows(nodes, this.filterModel, {
      ...(this.options.columns === undefined ? {} : { columns: this.options.columns })
    }).map((node) => node.key);
  }

  private addAncestors(keys: Set<RowKey>, key: RowKey): void {
    let parentKey = this.store.nodes.get(key)?.parentKey;
    while (parentKey !== undefined) {
      keys.add(parentKey);
      parentKey = this.store.nodes.get(parentKey)?.parentKey;
    }
  }

  private mergeChildren(parent: TreeNode<TData>, children: TreeRowStore<TData>): void {
    const nodes = new Map(this.store.nodes);
    const updatedParent: TreeNode<TData> = Object.freeze({
      ...parent,
      childrenKeys: children.roots,
      hasChildren: children.roots.length > 0,
      childrenLoaded: true
    });
    nodes.set(parent.key, updatedParent);
    children.nodes.forEach((node, key) => nodes.set(key, node));
    this.store = Object.freeze({ roots: this.store.roots, nodes });
  }

  private appendVisibleNode(
    entries: TreeRowEntry<TData>[],
    key: RowKey,
    includedKeys: ReadonlySet<RowKey> | undefined
  ): void {
    const node = this.store.nodes.get(key);
    if (!node || (includedKeys && !includedKeys.has(key))) {
      return;
    }

    const expanded = this.expandedKeys.has(key);
    const selectionState = this.resolveSelectionState(node);
    entries.push({
      kind: "tree",
      key: node.key,
      data: node.data,
      rowIndex: entries.length,
      depth: node.depth,
      indent: node.depth * this.indentSize,
      ariaLevel: node.depth + 1,
      hasChildren: node.hasChildren,
      expanded,
      selected: selectionState === "checked",
      selectionState,
      loading: this.loadingKeys.has(node.key)
    });

    if (expanded) {
      this.getOrderedKeys(node.childrenKeys, includedKeys)
        .forEach((childKey) => this.appendVisibleNode(entries, childKey, includedKeys));
    }
  }

  private getOrderedKeys(
    keys: readonly RowKey[],
    includedKeys: ReadonlySet<RowKey> | undefined
  ): readonly RowKey[] {
    const visibleKeys = includedKeys ? keys.filter((key) => includedKeys.has(key)) : keys;
    if (this.options.serverOnly === true || this.options.sortPolicy === "none" || !this.sortModel?.length) {
      return visibleKeys;
    }

    const sortableNodes = visibleKeys.flatMap((key, index) => {
      const node = this.store.nodes.get(key);
      return node ? [toClientRowNode(node, index)] : [];
    });

    return sortClientRows(sortableNodes, this.sortModel, {
      ...(this.options.columns === undefined ? {} : { columns: this.options.columns })
    }).map((node) => node.key);
  }

  private resolveSelectionState(node: TreeNode<TData>): TreeSelectionState {
    const descendantKeys = collectDescendantKeys(this.store.nodes, node.key);
    const selectedSelf = this.selectedKeys.has(node.key);
    const selectedDescendants = descendantKeys.filter((key) => this.selectedKeys.has(key)).length;
    if (selectedSelf && selectedDescendants === descendantKeys.length) {
      return "checked";
    }

    return selectedSelf || selectedDescendants > 0 ? "mixed" : "unchecked";
  }

  private get indentSize(): number {
    const value = this.options.indentSize;
    return value === undefined || !Number.isFinite(value) || value < 0
      ? DEFAULT_INDENT_SIZE
      : Math.trunc(value);
  }
}

function toClientRowNode<TData>(
  node: TreeNode<TData>,
  index: number
): ClientRowNode<TData> {
  return Object.freeze({
    key: node.key,
    data: node.data,
    sourceIndex: index
  });
}
