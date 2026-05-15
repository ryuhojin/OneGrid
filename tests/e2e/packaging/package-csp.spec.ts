import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

const NONCE = "onegrid-cdn-package";
const TRUSTED_TYPES_POLICY = "onegrid-cdn-package";
const REPO_ROOT = process.cwd();

const PACKAGE_ROOTS = new Map([
  ["@onegrid/core", path.join(REPO_ROOT, "packages/core/dist")],
  ["@onegrid/dom", path.join(REPO_ROOT, "packages/dom/dist")],
  ["@onegrid/pagination", path.join(REPO_ROOT, "packages/pagination/dist")],
  ["@onegrid/themes", path.join(REPO_ROOT, "packages/themes/dist")]
]);

const REQUIRED_ARTIFACTS = [
  "packages/core/dist/index.js",
  "packages/dom/dist/index.js",
  "packages/dom/dist/onegrid.umd.js",
  "packages/pagination/dist/index.js",
  "packages/themes/dist/default.css",
  "packages/themes/dist/tokens.css"
];

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'nonce-onegrid-cdn-package'",
  "style-src 'self' 'nonce-onegrid-cdn-package'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self' ws://127.0.0.1:4174",
  "object-src 'none'",
  "base-uri 'self'",
  "require-trusted-types-for 'script'",
  `trusted-types ${TRUSTED_TYPES_POLICY}`
].join("; ");

test.beforeAll(() => {
  const missing = REQUIRED_ARTIFACTS.filter((artifact) => !existsSync(path.join(REPO_ROOT, artifact)));
  expect(missing, `Run pnpm build before package CSP validation. Missing: ${missing.join(", ")}`)
    .toEqual([]);
});

test("published ESM and CSS artifacts run under strict CSP and Trusted Types", async ({
  browserName,
  page
}) => {
  test.skip(browserName !== "chromium", "Trusted Types enforcement is Chromium-based.");

  const cspErrors: string[] = [];
  const networkErrors: string[] = [];
  const pageErrors: string[] = [];
  collectBrowserErrors(page, { cspErrors, networkErrors, pageErrors });

  await routeSharedPackageFiles(page);
  await page.route("**/cdn-package-entry.js", async (route) => {
    await route.fulfill({
      body: packageEntryScript(),
      contentType: "application/javascript; charset=utf-8",
      headers: { "cache-control": "no-store" }
    });
  });
  await page.route("**/cdn-package-csp.html", async (route) => {
    await route.fulfill({
      body: packagePageHtml(),
      contentType: "text/html; charset=utf-8",
      headers: {
        "cache-control": "no-store",
        "content-security-policy": CSP
      }
    });
  });

  await page.addInitScript(() => {
    window.addEventListener("securitypolicyviolation", (event) => {
      document.documentElement.dataset.cspViolation =
        `${event.effectiveDirective}:${event.blockedURI}`;
    });
  });

  await page.goto("/cdn-package-csp.html");

  await expect(page.getByRole("heading", { name: "OneGrid package CSP smoke" })).toBeVisible();
  await expect(page.getByRole("grid", { name: "CDN package CSP grid" })).toContainText("CDN-0001");
  await expect(page.locator('[data-column-id="htmlRenderer"] strong')).toHaveText("Approved");
  await expect(page.locator(".og-grid script")).toHaveCount(0);
  await expect(page.locator("[data-trusted-types-blocked='true']")).toHaveCount(0);
  await expect(page.locator(`[data-trusted-types-policy="${TRUSTED_TYPES_POLICY}"]`)).toBeVisible();
  await expect(page.locator("#package-status")).toHaveText("mounted");

  const runtimeStyleNonce = await page
    .locator("style[data-onegrid-instance-style]")
    .first()
    .evaluate((style) => (style as HTMLStyleElement).nonce);
  expect(runtimeStyleNonce).toBe(NONCE);

  const cssLoaded = await page.locator(".og-grid").evaluate((grid) => {
    const computed = window.getComputedStyle(grid);
    return computed.display === "flex" && computed.overflow === "hidden";
  });
  expect(cssLoaded).toBe(true);

  const runtimeState = await page.evaluate(() => ({
    cspViolation: document.documentElement.dataset.cspViolation,
    xss: (window as unknown as { __onegridCdnPackageXss?: boolean }).__onegridCdnPackageXss
  }));
  expect(runtimeState).toEqual({ cspViolation: undefined, xss: false });
  expect(cspErrors).toEqual([]);
  expect(networkErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("CDN UMD bundle mounts through global namespace with SRI", async ({ page }) => {
  const cspErrors: string[] = [];
  const networkErrors: string[] = [];
  const pageErrors: string[] = [];
  collectBrowserErrors(page, { cspErrors, networkErrors, pageErrors });

  await routeSharedPackageFiles(page);
  await page.route("**/cdn-umd-entry.js", async (route) => {
    await route.fulfill({
      body: umdEntryScript(),
      contentType: "application/javascript; charset=utf-8",
      headers: { "cache-control": "no-store" }
    });
  });
  await page.route("**/cdn-umd-smoke.html", async (route) => {
    await route.fulfill({
      body: umdPageHtml(),
      contentType: "text/html; charset=utf-8",
      headers: {
        "cache-control": "no-store",
        "content-security-policy": baseCsp()
      }
    });
  });

  await page.goto("/cdn-umd-smoke.html");

  await expect(page.getByRole("heading", { name: "OneGrid CDN UMD smoke" })).toBeVisible();
  await expect(page.getByRole("grid", { name: "CDN UMD grid" })).toContainText("UMD-0001");
  await expect(page.locator("#umd-status")).toHaveText("mounted");

  const globalExportIsAvailable = await page.evaluate(() => {
    const exported = (window as unknown as { OneGrid?: { OneGrid?: unknown } }).OneGrid;
    return typeof exported?.OneGrid === "function";
  });
  expect(globalExportIsAvailable).toBe(true);
  expect(cspErrors).toEqual([]);
  expect(networkErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("CDN CSS artifact loads token imports without a bundler", async ({ page }) => {
  const cspErrors: string[] = [];
  const networkErrors: string[] = [];
  const pageErrors: string[] = [];
  collectBrowserErrors(page, { cspErrors, networkErrors, pageErrors });

  await routeSharedPackageFiles(page);
  await page.route("**/cdn-css-smoke.html", async (route) => {
    await route.fulfill({
      body: cssPageHtml(),
      contentType: "text/html; charset=utf-8",
      headers: {
        "cache-control": "no-store",
        "content-security-policy": baseCsp()
      }
    });
  });

  await page.goto("/cdn-css-smoke.html");

  await expect(page.getByRole("heading", { name: "OneGrid CDN CSS smoke" })).toBeVisible();
  const cssState = await page.locator("#css-probe").evaluate((grid) => {
    const computed = window.getComputedStyle(grid);
    return {
      background: computed.backgroundColor,
      display: computed.display,
      overflow: computed.overflow,
      token: computed.getPropertyValue("--og-color-bg").trim()
    };
  });
  expect(cssState).toEqual({
    background: "rgb(255, 255, 255)",
    display: "flex",
    overflow: "hidden",
    token: "#ffffff"
  });
  expect(cspErrors).toEqual([]);
  expect(networkErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

interface BrowserErrors {
  readonly cspErrors: string[];
  readonly networkErrors: string[];
  readonly pageErrors: string[];
}

function collectBrowserErrors(page: Page, errors: BrowserErrors): void {
  page.on("console", (message) => {
    const text = message.text();
    if (/content security policy|violates.*directive|trustedhtml/iu.test(text)) {
      errors.cspErrors.push(text);
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 400 && !response.url().endsWith("/favicon.ico")) {
      errors.networkErrors.push(`${response.status()} ${response.url()}`);
    }
  });
  page.on("pageerror", (error) => errors.pageErrors.push(error.message));
}

async function routeSharedPackageFiles(page: Page): Promise<void> {
  await routePackageCdn(page);
  await page.route("**/favicon.ico", async (route) => {
    await route.fulfill({ status: 204, body: "" });
  });
}

async function routePackageCdn(page: Page): Promise<void> {
  await page.route("**/cdn/@onegrid/**", async (route) => {
    const url = new URL(route.request().url());
    const match = /^\/cdn\/@onegrid\/([^/]+)\/(.+)$/u.exec(url.pathname);
    if (!match) {
      await route.fulfill({ status: 404, body: "Package path not found" });
      return;
    }

    const packageName = `@onegrid/${match[1]}`;
    const packageRoot = PACKAGE_ROOTS.get(packageName);
    const relativePath = match[2];
    if (!packageRoot || relativePath.includes("..")) {
      await route.fulfill({ status: 404, body: "Package file not found" });
      return;
    }

    const filePath = path.resolve(packageRoot, relativePath);
    if (!filePath.startsWith(packageRoot) || !existsSync(filePath)) {
      await route.fulfill({ status: 404, body: "Package file not found" });
      return;
    }

    const body = rewritePackageImports(await readFile(filePath, "utf8"));
    await route.fulfill({
      body,
      contentType: contentTypeFor(filePath),
      headers: { "cache-control": "no-store" }
    });
  });
}

function packagePageHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>OneGrid package CSP smoke</title>
    <link rel="stylesheet" href="/cdn/@onegrid/themes/default.css">
  </head>
  <body>
    <main>
      <h1>OneGrid package CSP smoke</h1>
      <p id="package-status">loading</p>
      <div id="package-grid"></div>
    </main>
    <script type="module" nonce="${NONCE}" src="/cdn-package-entry.js"></script>
  </body>
</html>`;
}

function umdPageHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>OneGrid CDN UMD smoke</title>
    <link rel="stylesheet" href="/cdn/@onegrid/themes/default.css"
      integrity="${sriFor("packages/themes/dist/default.css")}" crossorigin="anonymous">
  </head>
  <body>
    <main>
      <h1>OneGrid CDN UMD smoke</h1>
      <p id="umd-status">loading</p>
      <div id="umd-grid"></div>
    </main>
    <script src="/cdn/@onegrid/dom/onegrid.umd.js"
      integrity="${sriFor("packages/dom/dist/onegrid.umd.js")}" crossorigin="anonymous"></script>
    <script src="/cdn-umd-entry.js"></script>
  </body>
</html>`;
}

function cssPageHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>OneGrid CDN CSS smoke</title>
    <link rel="stylesheet" href="/cdn/@onegrid/themes/default.css"
      integrity="${sriFor("packages/themes/dist/default.css")}" crossorigin="anonymous">
  </head>
  <body>
    <main>
      <h1>OneGrid CDN CSS smoke</h1>
      <div id="css-probe" class="og-grid">
        <div class="og-grid-shell">CSS loaded</div>
      </div>
    </main>
  </body>
</html>`;
}

function packageEntryScript(): string {
  return `import { OneGrid, createAllowlistHtmlSanitizer } from "/cdn/@onegrid/dom/index.js";

window.__onegridCdnPackageXss = false;

const rows = [
  {
    id: "CDN-0001",
    desk: "Treasury",
    htmlRenderer: "Approved",
    status: "Ready"
  }
];

const columns = [
  { field: "id", headerName: "ID", pinned: "left", width: 130 },
  { field: "desk", headerName: "Desk", width: 180 },
  {
    field: "htmlRenderer",
    headerName: "Sanitized HTML",
    width: 220,
    renderer: {
      kind: "html",
      sanitize: true,
      render: ({ value }) =>
        \`<strong onclick="window.__onegridCdnPackageXss = true">\${String(value)}</strong>\`
        + "<img src=x onerror=\\"window.__onegridCdnPackageXss = true\\">"
        + "<script>window.__onegridCdnPackageXss = true<\\/script>"
    }
  },
  { field: "status", headerName: "Status", pinned: "right", width: 150 }
];

new OneGrid({
  el: document.querySelector("#package-grid"),
  columns,
  data: rows,
  rowModel: "client",
  theme: {
    name: "cdn-csp",
    variables: {
      "--og-color-focus-ring": "#d71920"
    }
  },
  accessibility: { label: "CDN package CSP grid" },
  security: {
    csp: { nonce: "${NONCE}" },
    html: {
      allowHtmlRenderer: true,
      trustedTypesPolicyName: "${TRUSTED_TYPES_POLICY}",
      sanitizer: createAllowlistHtmlSanitizer()
    },
    url: { allowedProtocols: ["https:", "mailto:", "tel:"] }
  }
});

document.querySelector("#package-status").textContent = "mounted";`;
}

function umdEntryScript(): string {
  return `const oneGrid = window.OneGrid;
const rows = [{ id: "UMD-0001", desk: "Treasury", status: "Ready" }];
const columns = [
  { field: "id", headerName: "ID", pinned: "left", width: 130 },
  { field: "desk", headerName: "Desk", width: 180 },
  { field: "status", headerName: "Status", pinned: "right", width: 150 }
];

new oneGrid.OneGrid({
  el: document.querySelector("#umd-grid"),
  columns,
  data: rows,
  rowModel: "client",
  accessibility: { label: "CDN UMD grid" }
});

document.querySelector("#umd-status").textContent =
  typeof oneGrid.OneGrid === "function" ? "mounted" : "missing";`;
}

function rewritePackageImports(source: string): string {
  return source
    .replace(/(["'])@onegrid\/core\1/gu, (_match, quote: string) =>
      `${quote}/cdn/@onegrid/core/index.js${quote}`)
    .replace(/(["'])@onegrid\/pagination\1/gu, (_match, quote: string) =>
      `${quote}/cdn/@onegrid/pagination/index.js${quote}`)
    .replace(/(["'])@onegrid\/themes\/([^"']+)\1/gu, (_match, quote: string, asset: string) =>
      `${quote}/cdn/@onegrid/themes/${asset}${quote}`);
}

function contentTypeFor(filePath: string): string {
  if (filePath.endsWith(".css")) {
    return "text/css; charset=utf-8";
  }
  if (filePath.endsWith(".map")) {
    return "application/json; charset=utf-8";
  }
  return "application/javascript; charset=utf-8";
}

function sriFor(relativePath: string): string {
  const body = readFileSync(path.join(REPO_ROOT, relativePath));
  return `sha384-${createHash("sha384").update(body).digest("base64")}`;
}

function baseCsp(): string {
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self' ws://127.0.0.1:4174",
    "object-src 'none'",
    "base-uri 'self'"
  ].join("; ");
}
