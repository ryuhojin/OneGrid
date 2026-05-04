import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

test("react wrapper bridges ref, events, controlled data, and renderers", async ({ page }) => {
  await page.goto("/react.html");

  const grid = page.getByRole("grid", { name: "React wrapper grid" });
  await expect(page.getByRole("heading", { name: "OneGrid React Wrapper" })).toBeVisible();
  await expect(grid).toBeVisible();
  await expect(page.getByText("Workflow slots")).toBeVisible();
  await expect(page.getByText("Stage")).toBeVisible();
  await expect(grid.locator(".react-wrapper-status--ready").first()).toHaveText("Ready");
  await expect(summaryValue(page, "Ready event")).toHaveText("received");

  await page.getByRole("button", { name: "Select first two" }).click();
  await expect(summaryValue(page, "Selected rows")).toHaveText("2");

  await page.getByRole("button", { name: "Add controlled row" }).click();
  await expect(grid).toContainText("WR-0004");
  await expect(summaryValue(page, "Rows")).toHaveText("4");
});

function summaryValue(page: Page, label: string) {
  return page
    .getByLabel("React wrapper summary")
    .locator("dt")
    .filter({ hasText: new RegExp(`^${label}$`) })
    .locator("+ dd");
}
