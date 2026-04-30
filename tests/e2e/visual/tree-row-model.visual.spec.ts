import { expect, test } from "@playwright/test";

test("tree row model example visual smoke @visual", async ({ page }) => {
  await page.goto("/#ROW-005");

  await page.getByRole("button", { name: "Expand FIN" }).click();
  await expect(page.getByRole("treegrid")).toContainText("Receivables");
  await expect(page.getByRole("treegrid")).toHaveScreenshot("tree-row-model-grid.png");
});
