import { expect, test } from "@playwright/test";
import type { Download, Page } from "@playwright/test";
import { resolve } from "node:path";

test("EX-004 sorting, filtering, and editing routes execute core interactions", async ({ page }) => {
  await page.goto("/#EX-004-001");
  await expect(page.getByRole("heading", { name: "Sorting setup" })).toBeVisible();
  const amountHeader = page.locator('[role="columnheader"][data-source-id="amount"]');
  await amountHeader.click();
  await expect(amountHeader).toHaveAttribute("aria-sort", "ascending");
  await expect(page.getByLabel("Sorting summary")).toContainText("amount:asc");

  await page.goto("/#EX-004-002");
  await expect(page.getByRole("heading", { name: "Filtering setup" })).toBeVisible();
  await page.getByLabel("Quick filter").fill("clinic");
  await expect(page.getByRole("grid")).toContainText("FL-0006");
  await expect(page.getByLabel("Filtering summary")).toContainText("quick:clinic");

  await page.goto("/#EX-004-003");
  await expect(page.getByRole("heading", { name: "Editing setup" })).toBeVisible();
  await editFirstTitle(page, "Enterprise title");
  await expect(editingCell(page, "title")).toHaveText("Enterprise title");
  await expect(summaryValue(page, "Editing summary", "Pending edits")).toHaveText("1");
});

test("EX-004 selection, clipboard, summary, and grouping routes expose enterprise state", async ({ page }) => {
  await page.goto("/#EX-004-004");
  await expect(page.getByRole("heading", { name: "Selection setup" })).toBeVisible();
  await page.getByLabel("Select row SEL-0001").check();
  await expect(page.getByLabel("Selection summary")).toContainText("SEL-0001");

  await page.goto("/#EX-004-005");
  await expect(page.getByRole("heading", { name: "Clipboard setup" })).toBeVisible();
  await page.getByRole("button", { name: "Paste sample" }).click();
  await expect(clipboardCell(page, "CLIP-0004", "program")).toHaveText("Grant review");
  await expect(summaryValue(page, "Clipboard summary", "Pasted")).toHaveText("2");

  await page.goto("/#EX-004-006");
  await expect(page.getByRole("heading", { name: "Summary setup" })).toBeVisible();
  const summaryGrid = page.getByRole("grid", { name: "Client summary grid" });
  await expect(summaryGrid.locator('[data-summary-position="top"]')).toBeVisible();
  await expect(summaryGrid).toContainText("Amount Total 2430");

  await page.goto("/#EX-004-007");
  await expect(page.getByRole("heading", { name: "Row grouping setup" })).toBeVisible();
  const groupingGrid = page.getByRole("grid", { name: "Client grouping grid" });
  await expect(groupingGrid).toContainText("region: Capital (2 rows)");
  await page.getByRole("button", { name: "Collapse Capital", exact: true }).click();
  await expect(groupingGrid).not.toContainText("GRP-0001");
});

test("EX-004 tree, pivot, and pagination routes keep model-specific controls scoped", async ({ page }) => {
  await page.goto("/#EX-004-008");
  await expect(page.getByRole("heading", { name: "Tree setup" })).toBeVisible();
  const treeGrid = page.getByRole("treegrid", { name: "Client tree grid" });
  await page.getByRole("button", { name: "Filter open tree" }).click();
  await expect(treeGrid).toHaveAttribute("aria-rowcount", "6");

  await page.goto("/#EX-004-009");
  await expect(page.getByRole("heading", { name: "Pivot setup" })).toBeVisible();
  const pivotGrid = page.getByRole("grid", { name: "Client pivot grid" });
  await expect(pivotGrid.getByRole("columnheader", { name: "Q1" })).toBeVisible();
  await expect(summaryValue(page, "Pivot summary", "Server pivot requests")).toHaveText("1");

  await page.goto("/#EX-004-010");
  await expect(page.getByRole("heading", { name: "Pagination setup" })).toBeVisible();
  const clientGrid = page.getByRole("grid", { name: "Client pagination grid" });
  await page
    .getByRole("navigation", { name: "Client pagination grid bottom pagination" })
    .getByRole("button", { name: "Next page" })
    .click();
  await expect(clientGrid).toContainText("PAGE-0005");
  await expect(summaryValue(page, "Client pagination summary", "Page")).toHaveText("2");
});

test("EX-004 context and header menu routes open the correct overlay surfaces", async ({ page }) => {
  await page.goto("/#EX-004-011");
  await expect(page.getByRole("heading", { name: "Context menu setup" })).toBeVisible();
  await menuCell(page, "MENU-0002", "service").click({ button: "right" });
  const contextMenu = page.getByRole("menu", { name: "Context menu" });
  await expect(contextMenu).toBeVisible();
  await contextMenu.getByRole("menuitem", { name: "Flag row for review" }).click();
  await expect(summaryValue(page, "Menu summary", "Context row")).toHaveText("MENU-0002");

  await page.goto("/#EX-004-012");
  await expect(page.getByRole("heading", { name: "Header menu setup" })).toBeVisible();
  await page.getByLabel("Column menu Department").click();
  const headerMenu = page.getByRole("menu", { name: "Department column menu" });
  await expect(headerMenu).toBeVisible();
  await expect(headerMenu.getByRole("menuitem", { name: "Filter Department" })).toBeVisible();
});

test("EX-004 export/import route downloads and replaces rows from an external file", async ({ page }) => {
  await page.goto("/#EX-004-013");
  await expect(page.getByRole("heading", { name: "Export import setup" })).toBeVisible();

  await clickAndDownload(page, "Export CSV", "onegrid-export.csv");
  await expect(summaryValue(page, "Export import summary", "Format")).toHaveText("csv");

  await page.getByLabel("Import CSV file").setInputFiles(resolve("apps/examples/public/export-testFile.csv"));
  const grid = page.getByRole("grid", { name: "Export import grid" });
  await expect(summaryValue(page, "Export import summary", "Imported rows")).toHaveText("2");
  await expect(grid).not.toContainText("EXP-0001");
  await expect(grid).toContainText("FILE-CSV-0002");
});

async function editFirstTitle(page: Page, value: string): Promise<void> {
  await editingCell(page, "title").dblclick();
  await expect(page.getByRole("dialog", { name: "Edit Title" })).toBeVisible();
  await page.locator('input[aria-label="Edit Title"]').fill(value);
  await page.keyboard.press("Enter");
}

function editingCell(page: Page, field: string) {
  return page.locator(`[data-layout-section="body"] [data-field="${field}"][data-edit-row-key="ED-0001"]`).first();
}

function clipboardCell(page: Page, rowKey: string, field: string) {
  return page.locator(`[data-edit-row-key="${rowKey}"][data-field="${field}"]`).first();
}

function menuCell(page: Page, rowKey: string, field: string) {
  return page.locator(`[data-edit-row-key="${rowKey}"][data-field="${field}"]`).first();
}

function summaryValue(page: Page, summaryLabel: string, label: string) {
  return page
    .getByLabel(summaryLabel)
    .locator("dt")
    .filter({ hasText: new RegExp(`^${label}$`) })
    .locator("+ dd");
}

async function clickAndDownload(page: Page, label: string, filename: string): Promise<Download> {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: label }).click()
  ]);
  expect(download.suggestedFilename()).toBe(filename);
  return download;
}
