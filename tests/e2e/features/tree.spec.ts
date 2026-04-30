import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

test("tree example filters, sorts, cascades selection, and loads lazy children", async ({ page }) => {
  await page.goto("/#F-TREE");

  const grid = page.getByRole("treegrid", { name: "Client tree grid" });
  await expect(grid).toHaveAttribute("aria-rowcount", "9");
  await expect(grid).toContainText("Bond issuance");
  await expect(grid).toContainText("Risk sampling");

  await page.getByRole("button", { name: "Filter open tree" }).click();
  await expect(grid).toHaveAttribute("aria-rowcount", "6");
  await expect(grid).not.toContainText("Risk sampling");
  await expect(grid).not.toContainText("Identity sync");
  await expect(grid).toContainText("Regional Services");

  await page.getByRole("button", { name: "Clear tree filter" }).click();
  await expect(grid).toHaveAttribute("aria-rowcount", "9");

  await page.getByRole("checkbox", { name: "Select DIG", exact: true }).check();
  await expect(page.getByRole("checkbox", { name: "Select DIG-REC" })).toBeChecked();
  await page.getByRole("checkbox", { name: "Select DIG-REC" }).uncheck();
  await expect(page.getByRole("checkbox", { name: "Select DIG", exact: true }))
    .toHaveAttribute("aria-checked", "mixed");

  await page.getByRole("button", { name: "Load audit children" }).click();
  await expect(grid).toContainText("Archive 2026");
  await expect(summaryValue(page, "Client lazy child requests")).toHaveText("1");
});

test("tree example sends filter and sort models to server tree children", async ({ page }) => {
  await page.goto("/#F-TREE");

  const serverGrid = page.getByRole("treegrid", { name: "Server tree grid" });
  await expect(serverGrid).toHaveAttribute("aria-rowcount", "2");

  await page.getByRole("button", { name: "Open server capital" }).click();
  await expect(serverGrid).toHaveAttribute("aria-rowcount", "4");
  await expect(serverGrid).toContainText("Server bond issuance");
  await expect(serverGrid).not.toContainText("Server risk sampling");
  await expect(summaryValue(page, "Server child requests")).toHaveText("1");
  await expect(summaryValue(page, "Last server parent")).toHaveText("SRV-CAP");
  await expect(summaryValue(page, "Last server sort")).toHaveText("budget:desc");
  await expect(summaryValue(page, "Last server filter")).toHaveText("status:Open,Review");
});

function summaryValue(page: Page, label: string): Locator {
  return page
    .getByLabel("Tree summary")
    .locator("dt", { hasText: label })
    .locator("xpath=following-sibling::dd[1]");
}
