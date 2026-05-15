import { describe, expect, it } from "vitest";
import { OneGrid } from "../src/index.js";
import type {
  ColumnMenuExtensionContext,
  ContextMenuContext,
  GridExportAdapterContext,
  GridImportAdapterPayload
} from "@onegrid/core";

describe("@onegrid/dom plugin shell", () => {
  it("sets up plugins through the DOM grid lifecycle and exposes extensions", () => {
    const el = document.createElement("div");
    const lifecycle: string[] = [];
    const grid = new OneGrid({
      el,
      columns: [{ field: "id", headerName: "ID" }],
      data: [{ id: "P-001" }],
      plugins: [
        {
          id: "audit-plugin",
          setup(context) {
            lifecycle.push("setup");
            context.registerExtension({
              id: "audit-action",
              point: "menu.context",
              payload: { label: "Audit" }
            });
            context.addCleanup(() => lifecycle.push("cleanup"));
            return undefined;
          }
        }
      ]
    });

    expect(grid.hasPlugin("audit-plugin")).toBe(true);
    expect(grid.getPluginExtensions("menu.context")).toMatchObject([
      {
        id: "audit-action",
        pluginId: "audit-plugin",
        payload: { label: "Audit" }
      }
    ]);

    grid.destroy();

    expect(lifecycle).toEqual(["setup", "cleanup"]);
  });

  it("renders plugin header and context menu extensions", () => {
    const el = document.createElement("div");
    const actions: string[] = [];
    const grid = new OneGrid({
      el,
      columns: [
        { field: "id", headerName: "ID" },
        { field: "name", headerName: "Name" }
      ],
      data: [{ id: "P-001", name: "Audit target" }],
      rowKey: "id",
      columnUi: { menu: true },
      contextMenu: { enabled: true, defaultItems: false },
      plugins: [
        {
          id: "menu-plugin",
          setup(context) {
            context.registerExtension({
              id: "header-audit",
              point: "menu.header",
              payload: {
                label: "Audit column",
                visible: (menuContext: ColumnMenuExtensionContext) =>
                  menuContext.columnId === "name",
                onSelect(menuContext: ColumnMenuExtensionContext) {
                  actions.push(`header:${menuContext.columnId}`);
                }
              }
            });
            context.registerExtension({
              id: "context-audit",
              point: "menu.context",
              payload: {
                item: {
                  id: "audit-cell",
                  label: "Audit cell",
                  onSelect(menuContext: ContextMenuContext) {
                    actions.push(`context:${menuContext.rowKey}:${menuContext.field}`);
                  }
                }
              }
            });
            return undefined;
          }
        }
      ]
    });

    el.querySelector<HTMLButtonElement>('[aria-label="Column menu Name"]')?.click();
    document.body
      .querySelector<HTMLButtonElement>(
        '.og-grid__column-menu [role="menuitem"][data-plugin-extension-id="header-audit"]'
      )
      ?.click();

    const nameCell = Array.from(el.querySelectorAll<HTMLElement>('[role="gridcell"]'))
      .find((cell) => cell.textContent === "Audit target");
    nameCell?.dispatchEvent(new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: 20,
      clientY: 20
    }));
    document.body
      .querySelector<HTMLButtonElement>(".og-grid__context-menu [role='menuitem']")
      ?.click();

    expect(actions).toEqual(["header:name", "context:P-001:name"]);

    grid.destroy();
  });

  it("applies plugin theme and export/import adapter extensions", async () => {
    const el = document.createElement("div");
    const grid = new OneGrid({
      el,
      columns: [{ field: "id", headerName: "ID" }],
      data: [{ id: "P-001" }],
      plugins: [
        {
          id: "surface-plugin",
          setup(context) {
            context.registerExtension({
              id: "si-theme",
              point: "theme",
              payload: {
                theme: {
                  name: "plugin-theme",
                  variables: { "--og-color-focus-ring": "#123456" }
                }
              }
            });
            context.registerExtension({
              id: "audit-export",
              point: "export.adapter",
              payload: {
                format: "audit-json",
                export({ matrix }: GridExportAdapterContext) {
                  return {
                    content: JSON.stringify({
                      columns: matrix.columns.map((column) => column.id),
                      rows: matrix.bodyRows.length
                    }),
                    mediaType: "application/json",
                    filename: "audit.json"
                  };
                }
              }
            });
            context.registerExtension<GridImportAdapterPayload<{ id: string }>>({
              id: "audit-import",
              point: "import.adapter",
              payload: {
                format: "audit-json",
                import({ content }) {
                  const parsed = JSON.parse(String(content)) as { readonly rows: readonly { readonly id: string }[] };
                  return {
                    rows: parsed.rows,
                    rowCount: parsed.rows.length,
                    rejected: []
                  };
                }
              }
            });
            return undefined;
          }
        }
      ]
    });

    expect(el.dataset.ogTheme).toBe("plugin-theme");
    const exported = await grid.exportData({ format: "audit-json" });

    expect(exported).toMatchObject({
      mediaType: "application/json",
      filename: "audit.json"
    });
    expect(exported.content).toBe('{"columns":["id"],"rows":1}');
    const imported = await grid.importData(
      JSON.stringify({ rows: [{ id: "P-IMPORT" }] }),
      { format: "audit-json" }
    );

    expect(imported.rowCount).toBe(1);
    expect(el.textContent).toContain("P-IMPORT");

    grid.destroy();
  });
});
