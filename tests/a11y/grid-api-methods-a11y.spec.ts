import { expect, test } from "@playwright/test";

test("grid api methods example exposes action and grid semantics @a11y", async ({ page }) => {
  await page.goto("/#EX-001-004");

  await expect(page.getByLabel("Grid API method actions")).toBeVisible();
  await expect(page.getByRole("grid", { name: "Grid API methods grid" })).toBeVisible();
  await expect(page.getByLabel("Grid API method summary")).toContainText("Last method");
});
