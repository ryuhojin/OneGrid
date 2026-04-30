import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./axe-helper";

test("tree feature exposes expandable tree controls and mixed selection @a11y", async ({ page }) => {
  await page.goto("/#F-TREE");

  const grid = page.getByRole("treegrid", { name: "Client tree grid" });
  await expect(grid).toHaveAttribute("aria-rowcount", "9");
  await expect(page.getByRole("button", { name: "Collapse CAP" })).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("checkbox", { name: "Select DIG-REC" }).check();
  await expect(page.getByRole("checkbox", { name: "Select DIG", exact: true }))
    .toHaveAttribute("aria-checked", "mixed");
});

test("tree feature passes axe-core scans @a11y", async ({ page }) => {
  await page.goto("/#F-TREE");

  await expectNoAxeViolations(page, '[role="treegrid"][aria-label="Client tree grid"]');
  await expectNoAxeViolations(page, '[role="treegrid"][aria-label="Server tree grid"]');
});
