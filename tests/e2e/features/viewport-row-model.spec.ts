import { expect, test } from "@playwright/test";

test("viewport row model requests visible ranges and applies live updates", async ({ page }) => {
  await page.goto("/#ROW-004");

  await expect(page.getByRole("heading", { name: "Viewport row model" })).toBeVisible();

  const grid = page.getByRole("grid");
  await expect(grid).toHaveAttribute("aria-rowcount", "10000000");
  await expect(grid).toHaveAttribute("aria-colcount", "5");
  await expect(grid).toContainText("ORD-VP-0000001");
  await expect(grid).toContainText("Viewport Account 1");

  const summary = page.getByLabel("Viewport row model summary");
  await expect(summary).toContainText("Viewport requests");
  await expect(summary).toContainText("1");
  await expect(summary).toContainText("0-9");

  await page.getByRole("button", { name: "Jump viewport" }).click();
  await expect(summary).toContainText("2");
  await expect(summary).toContainText("4998-5009");
  await expect(grid).toContainText("ORD-VP-0004999");
  await expect(grid).toContainText("Viewport Account 4999");

  await page.getByRole("button", { name: "Apply live update" }).click();
  await expect(grid).toContainText("Live Account 4999");
});
