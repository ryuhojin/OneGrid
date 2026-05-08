import type {
  CellContext,
  ColumnDef,
  ColumnGroupDef,
  DataColumnDef,
  HeaderContext,
  RenderElement,
  RenderElementBuilder
} from "@onegrid/core";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";

export type ReactCellRenderer<TData = unknown> = (context: CellContext<TData>) => ReactNode;
export type ReactHeaderRenderer<TData = unknown> = (context: HeaderContext<TData>) => ReactNode;

export interface ReactRendererSlots<TData = unknown> {
  readonly cells?: Readonly<Record<string, ReactCellRenderer<TData>>>;
  readonly headers?: Readonly<Record<string, ReactHeaderRenderer<TData>>>;
}

interface MountedRenderer {
  readonly root: Root;
  readonly token: string;
}

const rendererAttribute = "data-og-react-renderer";

export class ReactRendererBridge<TData = unknown> {
  private readonly tokens = new Map<string, ReactNode>();
  private readonly mounted = new WeakMap<Element, MountedRenderer>();
  private readonly observer: MutationObserver | undefined;
  private tokenSequence = 0;

  constructor(private readonly host: HTMLElement) {
    this.observer = typeof MutationObserver === "undefined"
      ? undefined
      : new MutationObserver((records) => {
          for (const record of records) {
            record.removedNodes.forEach((node) => this.unmountTree(node));
            record.addedNodes.forEach((node) => this.mountTree(node));
          }
        });
    this.observer?.observe(host, { childList: true, subtree: true });
  }

  enhanceColumns(
    columns: readonly ColumnDef<TData>[],
    slots: ReactRendererSlots<TData> | undefined
  ): readonly ColumnDef<TData>[] {
    if (!slots?.cells && !slots?.headers) {
      return columns;
    }

    return columns.map((column) => this.enhanceColumn(column, slots));
  }

  flush(): void {
    this.host
      .querySelectorAll<HTMLElement>(`[${rendererAttribute}]`)
      .forEach((element) => this.mountElement(element));
  }

  destroy(): void {
    this.observer?.disconnect();
    this.host
      .querySelectorAll<HTMLElement>(`[${rendererAttribute}]`)
      .forEach((element) => this.unmountElement(element));
    this.tokens.clear();
  }

  private enhanceColumn(
    column: ColumnDef<TData>,
    slots: ReactRendererSlots<TData>
  ): ColumnDef<TData> {
    if ("children" in column) {
      return this.enhanceGroupColumn(column, slots);
    }

    return this.enhanceDataColumn(column, slots);
  }

  private enhanceGroupColumn(
    column: ColumnGroupDef<TData>,
    slots: ReactRendererSlots<TData>
  ): ColumnGroupDef<TData> {
    const { children, headerRenderer: _headerRenderer, ...rest } = column;
    const key = column.columnId ?? column.groupId ?? column.headerName;
    const nextHeaderRenderer = slots.headers?.[key];
    const headerRenderer = nextHeaderRenderer === undefined
      ? _headerRenderer
      : this.createHeaderRenderer(nextHeaderRenderer);
    return {
      ...rest,
      children: children.map((child) => this.enhanceColumn(child, slots)),
      ...(headerRenderer === undefined ? {} : { headerRenderer })
    };
  }

  private enhanceDataColumn(
    column: DataColumnDef<TData>,
    slots: ReactRendererSlots<TData>
  ): DataColumnDef<TData> {
    const {
      headerRenderer: _headerRenderer,
      renderer: _renderer,
      ...rest
    } = column;
    const key = column.columnId ?? column.id ?? column.field ?? column.headerName ?? "column";
    const cellRenderer = slots.cells?.[key];
    const nextHeaderRenderer = slots.headers?.[key];
    const renderer = cellRenderer === undefined ? _renderer : this.createCellRenderer(cellRenderer);
    const headerRenderer = nextHeaderRenderer === undefined
      ? _headerRenderer
      : this.createHeaderRenderer(nextHeaderRenderer);
    return {
      ...rest,
      ...(renderer === undefined ? {} : { renderer }),
      ...(headerRenderer === undefined ? {} : { headerRenderer })
    };
  }

  private createCellRenderer(renderer: ReactCellRenderer<TData>): DataColumnDef<TData>["renderer"] {
    return {
      kind: "element",
      render: (context, builder) => this.createRendererElement(renderer(context), builder)
    };
  }

  private createHeaderRenderer(renderer: ReactHeaderRenderer<TData>): ColumnGroupDef<TData>["headerRenderer"] {
    return {
      kind: "element",
      render: (context, builder) => this.createRendererElement(renderer(context), builder)
    };
  }

  private createRendererElement(node: ReactNode, builder?: RenderElementBuilder): RenderElement {
    const token = `react-${++this.tokenSequence}`;
    this.tokens.set(token, node);
    const attributes = {
      [rendererAttribute]: token,
      class: "og-react-renderer-host"
    };
    return builder?.element("span", attributes) ?? { tagName: "span", attributes };
  }

  private mountTree(node: Node): void {
    if (!(node instanceof Element)) {
      return;
    }

    if (node.hasAttribute(rendererAttribute)) {
      this.mountElement(node);
    }
    node.querySelectorAll<HTMLElement>(`[${rendererAttribute}]`).forEach((element) => {
      this.mountElement(element);
    });
  }

  private mountElement(element: Element): void {
    const token = element.getAttribute(rendererAttribute);
    const node = token === null ? undefined : this.tokens.get(token);
    if (!token || node === undefined) {
      return;
    }

    const mounted = this.mounted.get(element);
    if (mounted?.token === token) {
      return;
    }
    if (mounted) {
      mounted.root.unmount();
    }

    const root = createRoot(element);
    root.render(<>{node}</>);
    this.mounted.set(element, { root, token });
    this.tokens.delete(token);
  }

  private unmountTree(node: Node): void {
    if (!(node instanceof Element)) {
      return;
    }

    if (node.hasAttribute(rendererAttribute)) {
      this.unmountElement(node);
    }
    node.querySelectorAll<HTMLElement>(`[${rendererAttribute}]`).forEach((element) => {
      this.unmountElement(element);
    });
  }

  private unmountElement(element: Element): void {
    const mounted = this.mounted.get(element);
    if (!mounted) {
      return;
    }

    mounted.root.unmount();
    this.mounted.delete(element);
  }
}
