import { expect, test } from "@playwright/test";

test("basic example visual smoke @visual", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("grid")).toHaveScreenshot("basic-grid-shell.png");
});
