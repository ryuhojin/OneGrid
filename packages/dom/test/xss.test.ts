import { describe, expect, it } from "vitest";
import type { ColumnDef } from "@onegrid/core";
import { OneGrid } from "../src/index.js";
import { renderSanitizedHtml } from "../src/grid/htmlSecurity.js";

interface XssRow {
  readonly id: string;
  readonly payload: string;
  readonly link: string;
  readonly status: string;
}

describe("XSS renderer defenses", () => {
  it("renders default and text renderer output as escaped text", () => {
    const el = document.createElement("div");
    const grid = new OneGrid<XssRow>({
      el,
      columns: [
        { field: "payload", headerName: "Payload" },
        {
          field: "status",
          headerName: "Status",
          renderer: {
            kind: "text",
            render: ({ value }) => `<strong>${String(value)}</strong>`
          }
        },
        {
          field: "link",
          headerName: "Blocked html",
          renderer: {
            kind: "html",
            sanitize: true,
            render: ({ value }) => `<img src=x onerror="${String(value)}">`
          }
        }
      ],
      data: [createXssRow()],
      rowKey: "id"
    });

    expect(el.querySelector("img")).toBeNull();
    expect(el.querySelector("strong")).toBeNull();
    expect(el.textContent).toContain("<img src=x onerror=");
    expect(el.textContent).toContain("<strong>Ready</strong>");
    expect(el.querySelector('[data-column-id="link"]')?.getAttribute("data-html-renderer-blocked")).toBe("true");

    grid.destroy();
  });

  it("sanitizes opt-in html renderers and blocks unsafe element attributes", () => {
    const el = document.createElement("div");
    const columns: readonly ColumnDef<XssRow>[] = [
      {
        field: "link",
        headerName: "Link",
        renderer: {
          kind: "element",
          render: ({ value }, builder) =>
            builder.element("a", {
              class: "xss-link",
              href: String(value),
              onclick: "alert(1)",
              srcdoc: "<script>alert(1)</script>"
            }, ["Open"])
        }
      },
      {
        field: "status",
        headerName: "Status",
        renderer: {
          kind: "html",
          sanitize: true,
          render: ({ value }) => `<strong onclick="alert(1)">${String(value)}</strong><script>alert(1)</script>`
        }
      }
    ];
    const grid = new OneGrid<XssRow>({
      el,
      columns,
      data: [createXssRow()],
      rowKey: "id",
      security: {
        html: {
          allowHtmlRenderer: true,
          sanitizer: {
            sanitize: (html) =>
              html
                .replace(/<script[\s\S]*?<\/script>/giu, "")
                .replace(/\s+on[a-z]+="[^"]*"/giu, "")
          }
        }
      }
    });

    const link = el.querySelector(".xss-link");
    expect(link?.getAttribute("href")).toBeNull();
    expect(link?.getAttribute("onclick")).toBeNull();
    expect(link?.getAttribute("srcdoc")).toBeNull();
    expect(el.querySelector('[data-column-id="status"] strong')?.textContent).toBe("Ready");
    expect(el.querySelector('[data-column-id="status"] strong')?.getAttribute("onclick")).toBeNull();
    expect(el.querySelector("script")).toBeNull();

    grid.destroy();
  });

  it("uses Trusted Types policy names for sanitized html sinks", () => {
    const createdPolicies: string[] = [];
    const trustedInputs: string[] = [];
    const original = Object.getOwnPropertyDescriptor(window, "trustedTypes");
    Object.defineProperty(window, "trustedTypes", {
      configurable: true,
      value: {
        createPolicy(name: string, rules: { readonly createHTML: (input: string) => string }) {
          createdPolicies.push(name);
          return {
            createHTML(input: string) {
              const trusted = rules.createHTML(input);
              trustedInputs.push(trusted);
              return trusted;
            }
          };
        }
      }
    });

    try {
      const cell = document.createElement("div");
      renderSanitizedHtml(cell, "<strong onclick=\"alert(1)\">Ready</strong>", {
        html: {
          allowHtmlRenderer: true,
          trustedTypesPolicyName: "onegrid-test-policy",
          sanitizer: {
            sanitize: (html) => html.replace(" onclick=\"alert(1)\"", "")
          }
        }
      });

      expect(createdPolicies).toEqual(["onegrid-test-policy"]);
      expect(trustedInputs).toEqual(["<strong>Ready</strong>"]);
      expect(cell.dataset.trustedTypesPolicy).toBe("onegrid-test-policy");
      expect(cell.querySelector("strong")?.textContent).toBe("Ready");
    } finally {
      if (original) {
        Object.defineProperty(window, "trustedTypes", original);
      } else {
        delete (window as { trustedTypes?: unknown }).trustedTypes;
      }
    }
  });
});

function createXssRow(): XssRow {
  return {
    id: "XSS-001",
    payload: "<img src=x onerror=\"window.__onegridXss = true\">",
    link: "javascript:window.__onegridXss = true",
    status: "Ready"
  };
}
