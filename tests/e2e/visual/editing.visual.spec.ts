import { expect, test } from "@playwright/test";

test("editing example visual smoke @visual", async ({ page }) => {
  await page.goto("/#F-EDIT");

  await page.locator('[data-field="status"][data-edit-row-key="ED-0001"]').first().dblclick();
  const editor = page.getByRole("dialog", { name: "Edit Status" });
  await expect(editor).toBeVisible();

  await expect(page.locator("#F-EDIT")).toHaveScreenshot("editing-example.png");
  await expect(editor).toHaveScreenshot("editing-status-editor.png");
});
