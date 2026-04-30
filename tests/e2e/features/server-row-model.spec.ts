import { expect, test } from "@playwright/test";

test("server row model sends server models and applies transactions", async ({ page }) => {
  await page.goto("/#ROW-003");

  await expect(page.getByRole("heading", { name: "Server row model" })).toBeVisible();

  const grid = page.getByRole("grid");
  await expect(grid).toHaveAttribute("aria-rowcount", "27");
  await expect(grid).toHaveAttribute("aria-colcount", "5");
  await expect(grid).toContainText("ORD-SRV-0040");
  await expect(grid).toContainText("Public Sector 40");

  const summary = page.getByLabel("Server row model summary");
  await expect(summary).toContainText("Server requests");
  await expect(summary).toContainText("1");
  await expect(summary).toContainText("amount:desc");
  await expect(summary).toContainText("status");
  await expect(summary).toContainText("region");
  await expect(summary).toContainText("amountTotal");
  await expect(summary).toContainText("amount");

  await page.getByRole("button", { name: "Refresh server rows" }).click();
  await expect(summary).toContainText("2");

  await page.getByRole("button", { name: "Apply transaction" }).click();
  await expect(grid).toContainText("Public Sector 40 (updated)");
});
