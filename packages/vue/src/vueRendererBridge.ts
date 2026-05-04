import type {
  CellContext,
  ColumnDef,
  ColumnGroupDef,
  DataColumnDef,
  HeaderContext,
  RenderElement,
  RenderElementBuilder
} from "@onegrid/core";
import {
  createApp,
  h
} from "vue";
import type {
  App,
  Slots,
  VNodeArrayChildren,
  VNodeChild
} from "vue";

type VueRenderer = () => VNodeChild;

interface MountedRenderer {
  readonly app: App;
  readonly token: string;
}

const rendererAttribute = "data-og-vue-renderer";

export class VueRendererBridge<TData = unknown> {
  private readonly tokens = new Map<string, VueRenderer>();
  private readonly mounted = new WeakMap<Element, MountedRenderer>();
  private readonly observer: MutationObserver | undefined;
  private tokenSequence = 0;

  constructor(
    private readonly host: HTMLElement,
    private readonly slots: Slots
  ) {
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

  enhanceColumns(columns: readonly ColumnDef<TData>[]): readonly ColumnDef<TData>[] {
    if (!hasRendererSlots(this.slots)) {
      return columns;
    }

    return columns.map((column) => this.enhanceColumn(column));
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

  private enhanceColumn(column: ColumnDef<TData>): ColumnDef<TData> {
    return "children" in column
      ? this.enhanceGroupColumn(column)
      : this.enhanceDataColumn(column);
  }

  private enhanceGroupColumn(column: ColumnGroupDef<TData>): ColumnGroupDef<TData> {
    const { children, headerRenderer: originalHeaderRenderer, ...rest } = column;
    const slot = findRendererSlot(this.slots, "header", column.groupId ?? column.headerName);
    const headerRenderer = slot === undefined
      ? originalHeaderRenderer
      : this.createHeaderRenderer((context) => slot(context));
    return {
      ...rest,
      children: children.map((child) => this.enhanceColumn(child)),
      ...(headerRenderer === undefined ? {} : { headerRenderer })
    };
  }

  private enhanceDataColumn(column: DataColumnDef<TData>): DataColumnDef<TData> {
    const {
      headerRenderer: originalHeaderRenderer,
      renderer: originalRenderer,
      ...rest
    } = column;
    const key = column.id ?? column.field;
    const cellSlot = findRendererSlot(this.slots, "cell", key);
    const headerSlot = findRendererSlot(this.slots, "header", key);
    const renderer = cellSlot === undefined
      ? originalRenderer
      : this.createCellRenderer((context) => cellSlot(context));
    const headerRenderer = headerSlot === undefined
      ? originalHeaderRenderer
      : this.createHeaderRenderer((context) => headerSlot(context));
    return {
      ...rest,
      ...(renderer === undefined ? {} : { renderer }),
      ...(headerRenderer === undefined ? {} : { headerRenderer })
    };
  }

  private createCellRenderer(renderer: (context: CellContext<TData>) => VNodeChild): DataColumnDef<TData>["renderer"] {
    return {
      kind: "element",
      render: (context, builder) => this.createRendererElement(() => renderer(context), builder)
    };
  }

  private createHeaderRenderer(renderer: (context: HeaderContext<TData>) => VNodeChild): ColumnGroupDef<TData>["headerRenderer"] {
    return {
      kind: "element",
      render: (context, builder) => this.createRendererElement(() => renderer(context), builder)
    };
  }

  private createRendererElement(renderer: VueRenderer, builder?: RenderElementBuilder): RenderElement {
    const token = `vue-${++this.tokenSequence}`;
    this.tokens.set(token, renderer);
    const attributes = {
      [rendererAttribute]: token,
      class: "og-vue-renderer-host"
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
    const renderer = token === null ? undefined : this.tokens.get(token);
    if (!token || renderer === undefined || this.mounted.get(element)?.token === token) {
      return;
    }

    this.unmountElement(element);
    const app = createApp({ render: () => h("span", {}, toVueChildren(renderer())) });
    app.mount(element);
    this.mounted.set(element, { app, token });
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

    mounted.app.unmount();
    this.mounted.delete(element);
  }
}

function findRendererSlot(slots: Slots, kind: "cell" | "header", key: string) {
  return slots[`${kind}-${key}`] ?? slots[`${kind}:${key}`] ?? slots[`${kind}-${toKebab(key)}`];
}

function hasRendererSlots(slots: Slots): boolean {
  return Object.keys(slots).some((name) => name.startsWith("cell-") || name.startsWith("header-"));
}

function toKebab(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/gu, "$1-$2").replace(/[\s_]+/gu, "-").toLowerCase();
}

function toVueChildren(child: VNodeChild): VNodeArrayChildren {
  if (child === null || child === undefined || typeof child === "boolean") {
    return [];
  }
  return Array.isArray(child) ? child : [child];
}
