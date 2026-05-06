import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

test("selection example supports checkbox, range, multi-range, and server token selection", async ({ page }) => {
  await page.goto("/#F-SELECT");

  await page.getByLabel("Select row SEL-0001").check();
  await expect(page.getByLabel("Selection summary")).toContainText("SEL-0001");
  await expect(page.locator('[data-edit-row-key="SEL-0001"][data-field="id"]').first())
    .toHaveAttribute("aria-selected", "true");

  await cell(page, "SEL-0001", "region").click();
  await expect(cell(page, "SEL-0001", "region")).toHaveAttribute("aria-rowspan", "3");
  await expect(cell(page, "SEL-0001", "region")).toHaveAttribute("aria-selected", "true");

  await cell(page, "SEL-0001", "agency").click();
  await page.keyboard.down("Shift");
  await cell(page, "SEL-0002", "memo").click();
  await page.keyboard.up("Shift");
  await expect(summaryValue(page, "Ranges")).toHaveText("1");

  const modifier = process.platform === "darwin" ? "Meta" : "Control";
  await page.keyboard.down(modifier);
  await cell(page, "SEL-0006", "owner").click();
  await page.keyboard.down("Shift");
  await cell(page, "SEL-0007", "status").click();
  await page.keyboard.up("Shift");
  await page.keyboard.up(modifier);
  await expect(summaryValue(page, "Ranges")).toHaveText("2");

  await page.getByRole("button", { name: "Select all visible" }).click();
  await expect(page.getByLabel("Selection summary")).toContainText("SEL-0008");

  await page.getByLabel("Selection controls").getByRole("button", { name: "Select server dataset" }).click();
  await expect(summaryValue(page, "Server token")).toContainText("selection-budget:");
});

test("selection example extends selection from keyboard focus", async ({ page }) => {
  await page.goto("/#F-SELECT");

  await cell(page, "SEL-0001", "agency").click();
  await page.keyboard.down("Shift");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.up("Shift");

  await expect(summaryValue(page, "Ranges")).toHaveText("1");
  await expect(cell(page, "SEL-0001", "program")).toHaveAttribute("aria-selected", "true");
});

test("selection row checkbox paints whole merged cells for covered rows", async ({ page }) => {
  await page.goto("/#F-SELECT");

  await page.getByLabel("Select row SEL-0002").check();

  const regionAnchor = cell(page, "SEL-0001", "region");
  const agencyAnchor = cell(page, "SEL-0001", "agency");
  await expect(regionAnchor).toHaveClass(/og-grid__cell--merged-row-selected/);
  await expect(agencyAnchor).toHaveClass(/og-grid__cell--merged-row-selected/);
  await expect(regionAnchor).toHaveAttribute("data-merged-row-selection", "true");
  await expect(regionAnchor).toHaveAttribute("aria-selected", "true");
  await expect(regionAnchor).toHaveCSS("background-image", /linear-gradient/);
  await expect(cell(page, "SEL-0002", "program")).toHaveClass(/og-grid__cell--row-selected/);

  await page.getByLabel("Select row SEL-0002").uncheck();
  await expect(regionAnchor).not.toHaveClass(/og-grid__cell--merged-row-selected/);
});

test("selection paints merged cells on pointer down before mouse up", async ({ page }) => {
  await page.goto("/#F-SELECT");

  const normalCell = cell(page, "SEL-0003", "program");
  await normalCell.click();
  await expect(normalCell).toHaveAttribute("aria-selected", "true");

  const mergedCell = cell(page, "SEL-0001", "region");
  const box = await mergedCell.boundingBox();
  if (!box) {
    throw new Error("Expected merged selection target to be visible");
  }

  await page.mouse.move(box.x + 16, box.y + box.height / 2);
  await page.mouse.down();

  await expect(mergedCell).toHaveAttribute("aria-selected", "true");
  await expect(normalCell).not.toHaveAttribute("aria-selected", "true");

  await page.mouse.up();
});

test("shift click range selection does not create native text selection", async ({ page }) => {
  await page.goto("/#F-SELECT");

  await cell(page, "SEL-0008", "id").click();
  await page.keyboard.down("Shift");
  await cell(page, "SEL-0008", "status").click();
  await page.keyboard.up("Shift");

  await expect(summaryValue(page, "Ranges")).toHaveText("1");
  await expect(cell(page, "SEL-0008", "id")).toHaveAttribute("aria-selected", "true");
  await expect(cell(page, "SEL-0008", "program")).toHaveAttribute("aria-selected", "true");
  await expect(cell(page, "SEL-0008", "memo")).toHaveAttribute("aria-selected", "true");
  await expect(cell(page, "SEL-0008", "status")).toHaveAttribute("aria-selected", "true");
  await expect.poll(() => page.evaluate(() => window.getSelection()?.toString() ?? "")).toBe("");
});

test("shift click across one row does not expand through vertical merged cells", async ({ page }) => {
  await page.goto("/#F-SELECT");

  await cell(page, "SEL-0001", "id").click();
  await page.keyboard.down("Shift");
  await cell(page, "SEL-0001", "status").click();
  await page.keyboard.up("Shift");

  await expect(summaryValue(page, "Ranges")).toHaveText("1");
  await expect(cell(page, "SEL-0001", "id")).toHaveAttribute("aria-selected", "true");
  await expect(cell(page, "SEL-0001", "region")).toHaveClass(/og-grid__cell--selection-range/);
  await expect(cell(page, "SEL-0001", "agency")).toHaveClass(/og-grid__cell--selection-range/);
  await expect(cell(page, "SEL-0001", "program")).toHaveAttribute("aria-selected", "true");
  await expect(cell(page, "SEL-0001", "memo")).toHaveAttribute("aria-selected", "true");
  await expect(cell(page, "SEL-0001", "status")).toHaveAttribute("aria-selected", "true");
  await expect(cell(page, "SEL-0002", "program")).not.toHaveAttribute("aria-selected", "true");
  await expect(cell(page, "SEL-0003", "status")).not.toHaveAttribute("aria-selected", "true");
});

function cell(page: Page, rowKey: string, field: string) {
  return page.locator(`[data-edit-row-key="${rowKey}"][data-field="${field}"]`).first();
}

function summaryValue(page: Page, label: string) {
  return page
    .getByLabel("Selection summary")
    .locator("dt", { hasText: label })
    .locator("xpath=following-sibling::dd[1]");
}
