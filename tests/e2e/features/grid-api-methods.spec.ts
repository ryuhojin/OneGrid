import { expect, test } from "@playwright/test";

test("grid api methods example exposes setup-level API actions", async ({ page }) => {
  await page.goto("/#EX-001-004");

  await expect(page.getByRole("heading", { name: "Grid API methods" })).toBeVisible();
  const grid = page.getByRole("grid", { name: "Grid API methods grid" });
  const summary = page.getByLabel("Grid API method summary");
  await expect(grid).toBeVisible();
  await expect(summary).toContainText("ready");

  await page.getByRole("button", { name: "Select API-0002" }).click();
  await expect(summary).toContainText("selectRows");
  await expect(summary).toContainText("API-0002 selected");

  await page.getByRole("button", { name: "Sort amount" }).click();
  await expect(summary).toContainText("amount desc");
  await expect(page.getByRole("gridcell", { name: "API-0006" })).toBeVisible();

  await page.getByRole("button", { name: "Hide owner" }).click();
  await expect(page.getByRole("columnheader", { name: "Owner" })).toHaveCount(0);
  await expect(summary).toContainText("owner hidden");

  await page.getByRole("button", { name: "Show owner" }).click();
  await expect(page.getByRole("columnheader", { name: "Owner" })).toBeVisible();

  await page.getByRole("button", { name: "Read API-0004" }).click();
  await expect(summary).toContainText("Records Office");
});
