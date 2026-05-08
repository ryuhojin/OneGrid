import { expect, test } from "@playwright/test";

test("EX-002 group header route renders nested grouped headers", async ({ page }) => {
  await page.goto("/#EX-002-001");

  await expect(page.getByRole("heading", { name: "Group header setup" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Portfolio, spans 3 columns" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Financial, spans 2 columns, Financial Metrics" }))
    .toBeVisible();
});

test("EX-002 header merge route renders label presentation inside header table", async ({ page }) => {
  await page.goto("/#EX-002-002");

  await expect(page.getByRole("heading", { name: "Header merge setup" })).toBeVisible();
  await expect(page.locator('[data-header-label-id="financial-merge-label"]')).toHaveText("Financial Metrics");
});

test("EX-002 vertical and horizontal cell merge routes expose span metadata", async ({ page }) => {
  await page.goto("/#EX-002-003");

  const verticalRegion = page.locator('[data-cell-span-kind="value"][data-column-id="region"]').first();
  await expect(verticalRegion).toHaveText("Capital");
  await expect(verticalRegion).toHaveAttribute("aria-rowspan", "3");

  await page.goto("/#EX-002-004");
  const horizontalMemo = page.locator('[data-cell-span-kind="custom"][data-column-id="memo"]').first();
  await expect(horizontalMemo).toHaveText("Joint approval window");
  await expect(horizontalMemo).toHaveAttribute("aria-colspan", "2");
});

test("EX-002 block cell merge route spans rows and columns together", async ({ page }) => {
  await page.goto("/#EX-002-005");

  await expect(page.getByRole("heading", { name: "Cell merge block" })).toBeVisible();
  const block = page.locator('[data-cell-span-kind="custom"][data-column-id="review"]').first();
  await expect(block).toHaveText("Joint review window");
  await expect(block).toHaveAttribute("aria-rowspan", "2");
  await expect(block).toHaveAttribute("aria-colspan", "2");
  await expect(page.locator('[data-merged-by="custom:0:review"]').first()).toHaveAttribute("aria-hidden", "true");
});

test("EX-002 frozen column and frozen row routes keep context panes visible", async ({ page }) => {
  await page.goto("/#EX-002-006");

  await expect(page.getByRole("heading", { name: "Frozen columns" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "ID", exact: true })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Status", exact: true })).toBeVisible();

  await page.goto("/#EX-002-007");
  await expect(page.getByRole("heading", { name: "Frozen rows" })).toBeVisible();
  await expect(page.locator('[data-layout-section="frozen"][data-frozen-position="top"]')).toBeVisible();
  await expect(page.locator('[data-layout-section="frozen"][data-frozen-position="bottom"]')).toBeVisible();
});

test("EX-002 variable row height route applies per-row heights", async ({ page }) => {
  await page.goto("/#EX-002-008");

  await expect(page.getByRole("heading", { name: "Variable row height" })).toBeVisible();
  const heights = await page.evaluate(() => {
    const shortRow = document.querySelector('[data-row-key="VRH-0001"]')?.getBoundingClientRect().height ?? 0;
    const longRow = document.querySelector('[data-row-key="VRH-0004"]')?.getBoundingClientRect().height ?? 0;
    return { shortRow, longRow };
  });

  expect(heights.shortRow).toBeGreaterThanOrEqual(33);
  expect(heights.longRow).toBeGreaterThanOrEqual(80);
  expect(heights.longRow).toBeGreaterThan(heights.shortRow);
});
