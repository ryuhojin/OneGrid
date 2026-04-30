import { expect, test } from "@playwright/test";

test("column UI exposes accessible controls @a11y", async ({ page }) => {
  await page.goto("/#COL-003");

  await expect(page.getByRole("grid")).toHaveAttribute("aria-colcount", "6");
  await expect(page.getByLabel("Column menu Customer")).toBeVisible();
  await expect(page.getByLabel("Resize Customer")).toBeVisible();

  await page.getByRole("button", { name: "Columns" }).click();
  await expect(page.getByRole("region", { name: "Columns tool panel" })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Audit Note" })).toBeVisible();
});
