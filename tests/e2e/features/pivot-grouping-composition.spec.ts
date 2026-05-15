import { expect, test, type Locator, type Page } from "@playwright/test";

test("pivot and grouping interactions stay scoped with browser performance smoke metrics", async ({ page }, testInfo) => {
  await page.goto("/#F-GROUP");
  const groupingGrid = page.getByRole("grid", { name: "Client grouping grid" });
  await expect(groupingGrid).toHaveAttribute("aria-rowcount", "10");
  await page.getByRole("button", { name: "Collapse Capital", exact: true }).click();
  await expect(groupingGrid).toHaveAttribute("aria-rowcount", "7");
  await page.getByRole("button", { name: "Expand all client groups" }).click();
  await expect(groupingGrid).toHaveAttribute("aria-rowcount", "12");
  const groupingMetrics = await collectGridMetrics(page, "Client grouping grid");

  await page.goto("/#F-PIVOT");
  const pivotGrid = page.getByRole("grid", { name: "Client pivot grid" });
  await expect(pivotGrid).toHaveAttribute("aria-colcount", "8");
  await page.getByRole("button", { name: "Pivot fields" }).first().click();
  const panel = page.getByRole("region", { name: "Client pivot panel" }).first();
  await panel.getByLabel("Search pivot fields").fill("status");
  await expect(panel.getByLabel("Available pivot fields")).toContainText("Status");
  await dropStatusBeforeRegion(panel);
  await expect(panel.getByLabel("Rows pivot fields").locator('[data-pivot-field]').first())
    .toHaveAttribute("data-pivot-field", "status");
  await panel.getByRole("button", { name: "Apply pivot model" }).click();
  await expect(pivotGrid).toHaveAttribute("aria-colcount", "9");
  const pivotMetrics = await collectGridMetrics(page, "Client pivot grid");

  await page.goto("/#F-GROUP");
  await expect(page.getByRole("grid", { name: "Client grouping grid" }))
    .toContainText("region: Capital (2 rows)");

  testInfo.annotations.push({
    type: "pivot-grouping-browser-metrics",
    description: JSON.stringify({ grouping: groupingMetrics, pivot: pivotMetrics })
  });
  assertGridMetrics(groupingMetrics, { maxRows: 80, maxCells: 360, maxElements: 1_800 });
  assertGridMetrics(pivotMetrics, { maxRows: 80, maxCells: 420, maxElements: 2_100 });
});

test("server grouping and server pivot keep request contracts independent", async ({ page }) => {
  await page.goto("/#F-GROUP");
  const serverGroupingGrid = page.getByRole("grid", { name: "Server grouping grid" });
  await expect(serverGroupingGrid).toHaveAttribute("aria-rowcount", "3");
  await page.getByRole("button", { name: "Open server Capital" }).click();
  await expect(serverGroupingGrid).toHaveAttribute("aria-rowcount", "6");
  await expect(summaryValue(page, "Grouping summary", "Server group keys")).toHaveText("Capital (region)");

  await page.goto("/#F-PIVOT");
  const serverPivotGrid = page.getByRole("grid", { name: "Server pivot grid" });
  await expect(serverPivotGrid).toHaveAttribute("aria-rowcount", "4");
  await expect(summaryValue(page, "Pivot summary", "Server pivot rows")).toHaveText("region, agency");
  await page.getByRole("button", { name: "Pivot fields" }).nth(1).click();
  const serverPanel = page.getByRole("region", { name: "Server pivot panel" });
  await serverPanel.getByRole("button", { name: "Remove agency from rows" }).click();
  await serverPanel.getByRole("button", { name: "Apply pivot model" }).click();
  await expect(summaryValue(page, "Pivot summary", "Server pivot rows")).toHaveText("region");
  await expect(serverPivotGrid.locator('[role="columnheader"]', { hasText: "Agency" })).toHaveCount(0);

  await page.goto("/#F-GROUP");
  await expect(page.getByRole("grid", { name: "Server grouping grid" }))
    .toContainText("region: Capital (2 rows)");
  await expect(summaryValue(page, "Grouping summary", "Server group keys")).toHaveText("root (region)");
});

interface GridMetrics {
  readonly renderedRows: number;
  readonly renderedCells: number;
  readonly elementCount: number;
  readonly averageFrameMs: number;
}

async function dropStatusBeforeRegion(panel: Locator): Promise<void> {
  const rowsBucket = panel.getByLabel("Rows pivot fields");
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
}

async function collectGridMetrics(page: Page, label: string): Promise<GridMetrics> {
  return page.getByRole("grid", { name: label }).evaluate(async (grid) => {
    const root = grid as HTMLElement;
    const start = performance.now();
    let frames = 0;
    await new Promise<void>((resolve) => {
      const tick = (): void => {
        frames += 1;
        if (frames >= 8) {
          resolve();
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    return {
      renderedRows: root.querySelectorAll('[data-layout-section="body"] [data-row-key]').length,
      renderedCells: root.querySelectorAll('[data-layout-section="body"] [role="gridcell"]').length,
      elementCount: root.querySelectorAll("*").length,
      averageFrameMs: (performance.now() - start) / Math.max(1, frames)
    };
  });
}

function assertGridMetrics(
  metrics: GridMetrics,
  limits: { readonly maxRows: number; readonly maxCells: number; readonly maxElements: number }
): void {
  expect(metrics.renderedRows).toBeLessThanOrEqual(limits.maxRows);
  expect(metrics.renderedCells).toBeLessThanOrEqual(limits.maxCells);
  expect(metrics.elementCount).toBeLessThanOrEqual(limits.maxElements);
  expect(metrics.averageFrameMs).toBeLessThanOrEqual(80);
}

function summaryValue(page: Page, summaryLabel: string, label: string) {
  return page
    .getByLabel(summaryLabel)
    .locator("dt")
    .filter({ hasText: new RegExp(`^${label}$`) })
    .locator("+ dd");
}
