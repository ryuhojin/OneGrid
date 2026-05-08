import { expect, test } from "@playwright/test";

test("row data update example exposes action and grid semantics @a11y", async ({ page }) => {
  await page.goto("/#EX-001-003");

  await expect(page.getByLabel("Row data update actions")).toBeVisible();
  await expect(page.getByRole("grid", { name: "Row data update grid" })).toBeVisible();
  await expect(page.getByLabel("Row data update summary")).toContainText("Rows");
});
