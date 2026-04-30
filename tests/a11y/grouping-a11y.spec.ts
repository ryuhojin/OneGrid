import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./axe-helper";

test("group rows expose expandable buttons and aggregate cells @a11y", async ({ page }) => {
  await page.goto("/#F-GROUP");

  const clientGrid = page.getByRole("grid", { name: "Client grouping grid" });
  await expect(clientGrid).toHaveAttribute("aria-rowcount", "10");
  await expect(clientGrid.getByRole("button", { name: "Collapse Capital group" }))
    .toHaveAttribute("aria-expanded", "true");
  await expect(clientGrid.locator('[data-group-aggregate-value="2000"]').first())
    .toHaveAttribute("role", "gridcell");

  await clientGrid.getByRole("button", { name: "Collapse Capital group" }).click();
  await expect(clientGrid.getByRole("button", { name: "Expand Capital group" }))
    .toHaveAttribute("aria-expanded", "false");
});

test("grouping example passes axe-core scans @a11y", async ({ page }) => {
  await page.goto("/#F-GROUP");

  await expectNoAxeViolations(page, '[role="grid"][aria-label="Client grouping grid"]');
  await expectNoAxeViolations(page, '[role="grid"][aria-label="Server grouping grid"]');
});
