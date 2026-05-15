import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./axe-helper";

test("pivot grid exposes generated headers and panel semantics @a11y", async ({ page }) => {
  await page.goto("/#F-PIVOT");

  const grid = page.getByRole("grid", { name: "Client pivot grid" });
  await expect(grid).toHaveAttribute("aria-colcount", "8");
  await expect(grid.getByRole("columnheader", { name: "Q1" })).toBeVisible();

  const button = page.getByRole("button", { name: "Pivot fields" }).first();
  await button.click();
  await expect(button).toHaveAttribute("aria-expanded", "true");
  const panel = page.getByRole("region", { name: "Client pivot panel" }).first();
  await expect(panel).toBeVisible();
  await expect(panel.getByLabel("Available pivot fields")).toContainText("status");
  await panel.getByLabel("Search pivot fields").focus();
  await expect(panel.getByLabel("Search pivot fields")).toBeFocused();
  await panel.getByRole("button", { name: "Add status to rows" }).focus();
  await expect(panel.getByRole("button", { name: "Add status to rows" })).toBeFocused();
});

test("pivot example passes axe-core scans @a11y", async ({ page }) => {
  await page.goto("/#F-PIVOT");

  await expectNoAxeViolations(page, '[role="grid"][aria-label="Client pivot grid"]');
  await expectNoAxeViolations(page, '[role="grid"][aria-label="Server pivot grid"]');
});
