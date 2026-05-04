import { expect, test } from "@playwright/test";

test("localization example switches renderer chrome and formatter output", async ({ page }) => {
  await page.goto("/#F-I18N");

  const grid = page.getByRole("grid", { name: "Localization grid" });
  await expect(grid).toContainText("Rows: 3");
  await expect(grid).toContainText("₩1,200,000");
  await expect(page.getByLabel("Localization summary")).toContainText("en-US");

  await page.getByRole("button", { name: "한국어" }).click();

  await expect(grid).toContainText("행: 3");
  await expect(grid).toContainText("준비");
  await expect(page.getByLabel("Localization summary")).toContainText("ko-KR");

  await page.getByRole("button", { name: "English" }).click();
  await expect(grid).toContainText("Rows: 3");
  await expect(grid).toContainText("Ready");
});
