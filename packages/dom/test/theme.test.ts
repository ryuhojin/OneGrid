import { afterEach, describe, expect, it } from "vitest";
import { OneGrid } from "../src/index.js";

describe("theme runtime", () => {
  afterEach(() => {
    document.head.querySelectorAll("style[data-onegrid-instance-style]").forEach((style) => {
      style.remove();
    });
    document.body.replaceChildren();
  });

  it("applies theme name, density, class, and scoped variables", () => {
    const el = document.createElement("div");
    document.body.append(el);
    const grid = new OneGrid({
      el,
      columns: [{ field: "id", headerName: "ID" }],
      data: [{ id: "THEME-1" }],
      theme: {
        name: "dark",
        density: "compact",
        className: "finance-grid",
        variables: {
          "--og-color-focus-ring": "#d7191f"
        }
      }
    });

    expect(el.dataset.ogTheme).toBe("dark");
    expect(el.dataset.ogDensity).toBe("compact");
    expect(el.classList.contains("finance-grid")).toBe(true);
    expect(document.head.querySelector("style[data-onegrid-instance-style]")?.textContent)
      .toContain("--og-color-focus-ring:#d7191f;");

    grid.applyTheme({
      name: "high-contrast",
      density: "comfortable",
      className: "audit-grid"
    });

    expect(el.dataset.ogTheme).toBe("high-contrast");
    expect(el.dataset.ogDensity).toBe("comfortable");
    expect(el.classList.contains("finance-grid")).toBe(false);
    expect(el.classList.contains("audit-grid")).toBe(true);
    expect(el.dataset.ogStyleInjection).toBe("none");
    expect(document.head.querySelector("style[data-onegrid-instance-style]")).toBeNull();

    grid.destroy();
    expect(el.dataset.ogTheme).toBeUndefined();
    expect(el.dataset.ogDensity).toBeUndefined();
    expect(el.classList.contains("audit-grid")).toBe(false);
  });

  it("keeps runtime variables scoped per grid instance", () => {
    const first = document.createElement("div");
    const second = document.createElement("div");
    document.body.append(first, second);

    const firstGrid = new OneGrid({
      el: first,
      columns: [{ field: "id", headerName: "ID" }],
      data: [{ id: "A" }],
      theme: { name: "clean", variables: { "--og-color-header-bg": "#fff3d6" } }
    });
    const secondGrid = new OneGrid({
      el: second,
      columns: [{ field: "id", headerName: "ID" }],
      data: [{ id: "B" }],
      theme: { name: "clean", variables: { "--og-color-header-bg": "#e5f4ff" } }
    });

    const styles = [...document.head.querySelectorAll<HTMLStyleElement>("style[data-onegrid-instance-style]")];
    expect(styles).toHaveLength(2);
    expect(styles[0]?.textContent).toContain(first.dataset.ogInstance);
    expect(styles[1]?.textContent).toContain(second.dataset.ogInstance);
    expect(styles.map((style) => style.textContent).join("\n")).toContain("#fff3d6");
    expect(styles.map((style) => style.textContent).join("\n")).toContain("#e5f4ff");

    firstGrid.destroy();
    secondGrid.destroy();
  });
});
