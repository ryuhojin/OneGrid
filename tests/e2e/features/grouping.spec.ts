import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

test("grouping example expands, collapses, filters, sorts, and renders footers", async ({ page }) => {
  await page.goto("/#F-GROUP");

  const grid = page.getByRole("grid", { name: "Client grouping grid" });
  await expect(grid).toHaveAttribute("aria-rowcount", "10");
  await expect(grid).toContainText("region: Capital (2 rows)");
  await expect(grid).toContainText("Amount Total 2000");
  await expect(grid.locator('[data-group-summary-key="amountTotal"]').first()).toHaveText("Amount Total 2000");
  await expect(grid).toContainText("Digital subtotal");
  await expect(grid).toContainText("GRP-0001");
  await expect(grid).not.toContainText("GRP-0003");
  await expect(grid).not.toContainText("GRP-0005");

  await page.getByRole("button", { name: "Collapse Capital", exact: true }).click();
  await expect(grid).toHaveAttribute("aria-rowcount", "7");
  await expect(grid).not.toContainText("GRP-0001");
  await expect(summaryValue(page, "Client expanded groups")).toHaveText("Digital");

  await page.getByRole("button", { name: "Expand Regional", exact: true }).click();
  await expect(grid).toHaveAttribute("aria-rowcount", "9");
  await expect(grid).toContainText("GRP-0004");
  await expect(grid).toContainText("Regional subtotal");
  await expect(summaryValue(page, "Client expanded groups"))
    .toHaveText("Digital, Regional");

  await page.getByRole("button", { name: "Expand all client groups" }).click();
  await expect(grid).toHaveAttribute("aria-rowcount", "12");
  await expect(summaryValue(page, "Client expanded groups"))
    .toHaveText("Capital, Digital, Regional");

  await page.getByRole("button", { name: "Collapse all client groups" }).click();
  await expect(grid).toHaveAttribute("aria-rowcount", "3");
  await expect(summaryValue(page, "Client expanded groups")).toHaveText("none");
});

test("grouping example sends server group keys and renders server group entries", async ({ page }) => {
  await page.goto("/#F-GROUP");

  const serverGrid = page.getByRole("grid", { name: "Server grouping grid" });
  await expect(serverGrid).toHaveAttribute("aria-rowcount", "3");
  await expect(serverGrid).toContainText("region: Capital (2 rows)");
  await expect(summaryValue(page, "Server grouping requests")).toHaveText("1");
  await expect(summaryValue(page, "Server group keys")).toHaveText("root (region)");

  await page.getByRole("button", { name: "Open server Capital" }).click();
  await expect(summaryValue(page, "Server group keys")).toHaveText("Capital (region)");
  await expect(summaryValue(page, "Server grouping mode")).toHaveText("Capital children");
  await expect(serverGrid).toHaveAttribute("aria-rowcount", "6");
  await expect(serverGrid).toContainText("GRP-0001");
  await expect(serverGrid).toContainText("Capital subtotal");
  await expect(serverGrid.locator('[data-group-aggregate-value="2000"]').first()).toBeVisible();

  await page.getByRole("button", { name: "Show server groups" }).click();
  await expect(summaryValue(page, "Server group keys")).toHaveText("root (region)");
  await expect(summaryValue(page, "Server grouping mode")).toHaveText("root groups");
  await expect(serverGrid).toContainText("region: Digital (3 rows)");
});

function summaryValue(page: Page, label: string): Locator {
  return page
    .getByLabel("Grouping summary")
    .locator("dt", { hasText: label })
    .locator("xpath=following-sibling::dd[1]");
}
