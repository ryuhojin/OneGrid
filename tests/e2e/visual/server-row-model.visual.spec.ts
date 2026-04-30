import { expect, test } from "@playwright/test";

test("server row model example visual smoke @visual", async ({ page }) => {
  await page.goto("/#ROW-003");

  await expect(page.getByRole("grid")).toContainText("ORD-SRV-0040");
  await expect(page.getByRole("grid")).toHaveScreenshot("server-row-model-grid.png");
});
