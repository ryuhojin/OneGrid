import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

interface PivotPanelLayerResult {
  readonly ready: boolean;
  readonly overlaps?: boolean;
  readonly panelOwnsPoint?: boolean;
  readonly panelZIndex?: number;
  readonly scrollbarLayerZIndex?: number;
}

test("pivot example renders client row, column, value, subtotal, and total fields", async ({ page }) => {
  await page.goto("/#F-PIVOT");

  const grid = page.getByRole("grid", { name: "Client pivot grid" });
  await expect(grid).toHaveAttribute("aria-colcount", "8");
  await expect(grid).toHaveAttribute("aria-rowcount", "8");
  await expect(grid.getByRole("columnheader", { name: "Q1" })).toBeVisible();
  await expect(grid.getByRole("columnheader", { name: "Total" })).toBeVisible();

  await expect(pivotCell(grid, "Capital|Treasury%20Office", "pivot:Q1:amountTotal"))
    .toHaveText("1200");
  await expect(pivotCell(grid, "Capital|Treasury%20Office", "pivot:Q2:amountTotal"))
    .toHaveText("800");
  await expect(pivotCell(grid, "subtotal:Capital", "pivot:Q1:amountTotal"))
    .toHaveText("1200");
  await expect(pivotCell(grid, "grand-total", "pivot:total:amountTotal"))
    .toHaveText("4730");

  await expect(summaryValue(page, "Pivot value fields"))
    .toHaveText("Amount=sum(amount), Avg budget=avg(budget)");

  await page.getByRole("button", { name: "Pivot fields" }).first().click();
  const panel = page.getByRole("region", { name: "Client pivot panel" }).first();
  await expect(panel).toContainText("quarter");
  await expect(panel).toContainText("Amount");
  await expect(panel).toContainText("sum(amount)");
  await expect(panel).toContainText("Client computed");
  const fieldCatalog = panel.getByLabel("Available pivot fields");
  await fieldCatalog.getByLabel("Search pivot fields").fill("status");
  await expect(fieldCatalog).toContainText("Status");
  await expect(fieldCatalog).not.toContainText("Amount");
  const rowsBucket = panel.getByLabel("Rows pivot fields");
  await rowsBucket.evaluate((section) => {
    const dataTransfer = new DataTransfer();
    dataTransfer.setData("application/x-onegrid-pivot", JSON.stringify({ field: "region", label: "Region" }));
    section.dispatchEvent(new DragEvent("dragover", {
      bubbles: true,
      cancelable: true,
      dataTransfer
    }));
  });
  await expect(rowsBucket).toHaveAttribute("data-drop-state", "invalid");
  await rowsBucket.locator('[data-pivot-field="region"]').evaluate((item) => {
    const dataTransfer = new DataTransfer();
    dataTransfer.setData("application/x-onegrid-pivot", JSON.stringify({ field: "status", label: "Status" }));
    const rect = item.getBoundingClientRect();
    item.dispatchEvent(new DragEvent("dragover", {
      bubbles: true,
      cancelable: true,
      clientY: rect.top + 1,
      dataTransfer
    }));
  });
  await expect(rowsBucket.locator('[data-pivot-field="region"]')).toHaveAttribute("data-drop-position", "before");
  await rowsBucket.locator('[data-pivot-field="region"]').evaluate((item) => {
    const dataTransfer = new DataTransfer();
    dataTransfer.setData("application/x-onegrid-pivot", JSON.stringify({ field: "status", label: "Status" }));
    const rect = item.getBoundingClientRect();
    item.dispatchEvent(new DragEvent("drop", {
      bubbles: true,
      cancelable: true,
      clientY: rect.top + 1,
      dataTransfer
    }));
  });
  await expect(panel.getByLabel("Rows pivot fields").locator('[data-pivot-field]').first())
    .toHaveAttribute("data-pivot-field", "status");

  await page.getByRole("button", { name: "Clear client filter" }).click();
  await expect(grid).toHaveAttribute("aria-rowcount", "9");
  await expect(summaryValue(page, "Client filtered source rows")).toHaveText("8");

  await page.getByRole("button", { name: "Pivot fields" }).first().click();
  const builder = page.getByRole("region", { name: "Client pivot panel" }).first();
  await builder.getByRole("button", { name: "Add status to rows" }).click();
  await expect(builder).toContainText("Draft changes");
  await builder.getByRole("button", { name: "Apply pivot model" }).click();
  await expect(grid).toHaveAttribute("aria-colcount", "9");
  await page.getByRole("button", { name: "Pivot fields" }).first().click();
  await expect(page.getByRole("region", { name: "Client pivot panel" }).first()
    .getByLabel("Rows pivot fields")).toContainText("status");
});

test("pivot example sends the same pivot model to server row requests", async ({ page }) => {
  await page.goto("/#F-PIVOT");

  const grid = page.getByRole("grid", { name: "Server pivot grid" });
  await expect(grid).toHaveAttribute("aria-rowcount", "4");
  await expect(pivotCell(grid, "srv-capital", "pivot:total:amountTotal")).toHaveText("2000");
  await expect(summaryValue(page, "Server pivot requests")).toHaveText("1");
  await expect(summaryValue(page, "Server pivot rows")).toHaveText("region, agency");
  await expect(summaryValue(page, "Server pivot columns")).toHaveText("quarter");
  await expect(summaryValue(page, "Server pivot values"))
    .toHaveText("amountTotal:sum, avgBudget:avg");

  await page.getByRole("button", { name: "Pivot fields" }).nth(1).click();
  const panel = page.getByRole("region", { name: "Server pivot panel" });
  await expect(panel).toContainText("Server-owned");
  await expect(panel).toContainText("pivotModel forwarded");
  await panel.getByRole("button", { name: "Remove agency from rows" }).click();
  await panel.getByRole("button", { name: "Apply pivot model" }).click();
  await expect(summaryValue(page, "Server pivot requests")).toHaveText("2");
  await expect(summaryValue(page, "Server pivot rows")).toHaveText("region");
  await expect(grid).toHaveAttribute("aria-colcount", "7");
  await expect(grid.locator('[role="columnheader"]', { hasText: "Agency" })).toHaveCount(0);
});

test("pivot builder panel covers grid custom scrollbars", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/#F-PIVOT");

  await page.getByRole("button", { name: "Pivot fields" }).first().click();
  const panel = page.getByRole("region", { name: "Client pivot panel" }).first();
  await expect(panel).toBeVisible();

  const result = await panel.evaluate((panelElement): PivotPanelLayerResult => {
    const scrollbar = Array.from(document.querySelectorAll<HTMLElement>(".og-grid__scrollbar--horizontal"))
      .find((candidate) => !candidate.hidden && candidate.getBoundingClientRect().width > 0);
    const scrollbarLayer = scrollbar?.closest<HTMLElement>(".og-grid__scrollbar-layer");
    if (!scrollbar || !scrollbarLayer) {
      return { ready: false };
    }

    const panelRect = panelElement.getBoundingClientRect();
    const scrollbarRect = scrollbar.getBoundingClientRect();
    const overlaps = panelRect.left < scrollbarRect.right
      && panelRect.right > scrollbarRect.left
      && panelRect.top < scrollbarRect.bottom
      && panelRect.bottom > scrollbarRect.top;
    if (!overlaps) {
      return { ready: true, overlaps: false };
    }

    const x = Math.max(panelRect.left, scrollbarRect.left) + 8;
    const y = scrollbarRect.top + scrollbarRect.height / 2;
    const topElement = document.elementFromPoint(x, y);
    return {
      ready: true,
      overlaps,
      panelOwnsPoint: topElement === panelElement || panelElement.contains(topElement),
      panelZIndex: Number(getComputedStyle(panelElement).zIndex),
      scrollbarLayerZIndex: Number(getComputedStyle(scrollbarLayer).zIndex)
    };
  });

  expect(result.ready).toBe(true);
  expect(result.overlaps).toBe(true);
  expect(result.panelOwnsPoint).toBe(true);
  expect(result.panelZIndex ?? 0).toBeGreaterThan(result.scrollbarLayerZIndex ?? 0);
});

function pivotCell(grid: Locator, rowKey: string, field: string): Locator {
  return grid.locator(`[data-row-key="${rowKey}"] [data-field="${field}"]`);
}

function summaryValue(page: Page, label: string): Locator {
  return page
    .getByLabel("Pivot summary")
    .locator("dt", { hasText: label })
    .locator("xpath=following-sibling::dd[1]");
}
