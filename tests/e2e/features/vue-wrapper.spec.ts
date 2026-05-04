import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

test("vue wrapper bridges expose methods, emits, reactive data, and slots", async ({ page }) => {
  await page.goto("/vue.html");

  const grid = page.getByRole("grid", { name: "Vue wrapper grid" });
  await expect(page.getByRole("heading", { name: "OneGrid Vue Wrapper" })).toBeVisible();
  await expect(grid).toBeVisible();
  await expect(page.getByText("Workflow slots")).toBeVisible();
  await expect(page.getByText("Stage")).toBeVisible();
  await expect(grid.locator(".vue-wrapper-status--ready").first()).toHaveText("Ready");
  await expect(summaryValue(page, "Ready event")).toHaveText("received");

  await page.getByRole("button", { name: "Select first two" }).click();
  await expect(summaryValue(page, "Selected rows")).toHaveText("2");

  await page.getByRole("button", { name: "Add reactive row" }).click();
  await expect(grid).toContainText("WV-0004");
  await expect(summaryValue(page, "Rows")).toHaveText("4");
});

function summaryValue(page: Page, label: string) {
  return page
    .getByLabel("Vue wrapper summary")
    .locator("dt")
    .filter({ hasText: new RegExp(`^${label}$`) })
    .locator("+ dd");
}
