import { expect, test } from "@playwright/test";

test("infinite row model loads blocks through user-visible controls", async ({ page }) => {
  await page.goto("/#ROW-002");

  await expect(page.getByRole("heading", { name: "Infinite row model" })).toBeVisible();

  const grid = page.getByRole("grid");
  await expect(grid).toHaveAttribute("aria-rowcount", "1000000");
  await expect(grid).toHaveAttribute("aria-colcount", "5");
  await expect(grid).toContainText("ORD-0000001");
  await expect(grid).toContainText("Public Account 1");

  const summary = page.getByLabel("Infinite row model summary");
  await expect(summary).toContainText("Block requests");
  await expect(summary).toContainText("1");

  await page.getByRole("button", { name: "Load more rows" }).click();
  await expect(grid).toContainText("ORD-0000021");
  await expect(grid).toContainText("Public Account 21");
  await expect(summary).toContainText("2");
});
