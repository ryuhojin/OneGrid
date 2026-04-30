import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./axe-helper";

test("summary rows expose grid cells and stable row counts @a11y", async ({ page }) => {
  await page.goto("/#F-SUMMARY");

  const clientGrid = page.getByRole("grid", { name: "Client summary grid" });
  await expect(clientGrid).toHaveAttribute("aria-rowcount", "11");
  await expect(clientGrid.locator('[data-layout-section="summary"]')).toHaveCount(1);
  await expect(clientGrid.locator('[data-layout-section="summary"] [data-layout-pane="center"] [role="row"]'))
    .toHaveCount(1);
  await expect(clientGrid.locator('[data-summary-field="amount"]').first())
    .toHaveAttribute("role", "gridcell");
  await expect(clientGrid.locator('[data-summary-field="amount"]').first())
    .toHaveAttribute("aria-label", "Total 5690");

  const serverGrid = page.getByRole("grid", { name: "Server aggregate grid" });
  await expect(serverGrid).toHaveAttribute("aria-rowcount", "8");
  await expect(serverGrid.locator('[data-summary-field="amount"]').first())
    .toHaveAttribute("data-summary-value", "5690");
});

test("summary example passes axe-core scans @a11y", async ({ page }) => {
  await page.goto("/#F-SUMMARY");

  await expectNoAxeViolations(page, '[role="grid"][aria-label="Client summary grid"]');
  await expectNoAxeViolations(page, '[role="grid"][aria-label="Server aggregate grid"]');
});
