import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./axe-helper";

test("pivot and grouping composite routes pass browser accessibility scans @a11y", async ({ page }) => {
  await page.goto("/#F-GROUP");
  const groupingGrid = page.getByRole("grid", { name: "Client grouping grid" });
  await expect(groupingGrid).toHaveAttribute("aria-rowcount", "10");
  await groupingGrid.getByRole("button", { name: "Collapse Capital group" }).click();
  await expect(groupingGrid.getByRole("button", { name: "Expand Capital group" }))
    .toHaveAttribute("aria-expanded", "false");
  await expectNoAxeViolations(page, '[role="grid"][aria-label="Client grouping grid"]');

  await page.goto("/#F-PIVOT");
  const pivotGrid = page.getByRole("grid", { name: "Client pivot grid" });
  await expect(pivotGrid).toHaveAttribute("aria-colcount", "8");
  await expectNoAxeViolations(page, '[role="grid"][aria-label="Client pivot grid"]');
  await page.getByRole("button", { name: "Pivot fields" }).first().click();
  const panel = page.getByRole("region", { name: "Client pivot panel" }).first();
  await expect(panel).toBeVisible();
  await panel.getByLabel("Search pivot fields").fill("status");
  await expect(panel.getByLabel("Available pivot fields")).toContainText("Status");
  await expectNoAxeViolations(page, '[role="region"][aria-label="Client pivot panel"]');
});
