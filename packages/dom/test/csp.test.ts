import { afterEach, describe, expect, it } from "vitest";
import { OneGrid } from "../src/index.js";

describe("CSP runtime guardrails", () => {
  afterEach(() => {
    document.head.querySelectorAll("style[data-onegrid-instance-style]").forEach((style) => {
      style.remove();
    });
    document.body.replaceChildren();
  });

  it("applies runtime theme styles with a CSP nonce and removes them on destroy", () => {
    const el = document.createElement("div");
    document.body.append(el);
    const grid = new OneGrid({
      el,
      columns: [{ field: "id", headerName: "ID" }],
      data: [{ id: "CSP-1" }],
      theme: {
        variables: {
          "--og-color-header-bg": "#eaf6f1"
        }
      },
      security: { csp: { nonce: "nonce-test" } }
    });

    const style = document.head.querySelector<HTMLStyleElement>("style[data-onegrid-instance-style]");
    expect(style).not.toBeNull();
    expect(style?.nonce).toBe("nonce-test");
    expect(style?.textContent).toContain("--og-color-header-bg:#eaf6f1;");
    expect(el.dataset.ogStyleInjection).toBe("active");

    grid.destroy();

    expect(document.head.querySelector("style[data-onegrid-instance-style]")).toBeNull();
    expect(el.dataset.ogStyleInjection).toBeUndefined();
  });

  it("respects disableStyleInjection while keeping the grid renderable", () => {
    const el = document.createElement("div");
    document.body.append(el);
    const grid = new OneGrid({
      el,
      columns: [{ field: "id", headerName: "ID" }],
      data: [{ id: "CSP-1" }],
      theme: {
        variables: {
          "--og-color-header-bg": "#eaf6f1"
        }
      },
      security: { csp: { disableStyleInjection: true, nonce: "nonce-test" } }
    });

    expect(document.head.querySelector("style[data-onegrid-instance-style]")).toBeNull();
    expect(el.dataset.ogStyleInjection).toBe("disabled");
    expect(el.querySelector('[role="grid"]')).not.toBeNull();

    grid.destroy();
  });
});
