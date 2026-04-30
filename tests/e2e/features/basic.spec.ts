import { expect, test } from "@playwright/test";

test("basic example renders user-visible grid shell", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "OneGrid Examples" })).toBeVisible();
  await expect(page.getByRole("grid")).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "ID" })).toBeVisible();
  await expect(page.getByRole("gridcell", { name: "ORD-1001" })).toBeVisible();
});
