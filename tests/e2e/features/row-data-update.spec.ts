import { expect, test } from "@playwright/test";

test("row data update example applies visible GridApi row operations", async ({ page }) => {
  await page.goto("/#EX-001-003");

  await expect(page.getByRole("heading", { name: "Row data update" })).toBeVisible();
  const summary = page.getByLabel("Row data update summary");
  await expect(summary).toContainText("initial data");
  await expect(page.getByRole("grid")).toHaveAttribute("aria-rowcount", "3");

  await page.getByRole("button", { name: "Append row" }).click();
  await expect(page.getByRole("grid")).toContainText("UPD-0004");
  await expect(summary).toContainText("appendRows UPD-0004");
  await expect(summary).toContainText("4");

  await page.getByRole("button", { name: "Update row" }).click();
  await expect(page.getByRole("grid")).toContainText("1,110");
  await expect(summary).toContainText("updateRows UPD-0002");

  await page.getByRole("button", { name: "Remove row" }).click();
  await expect(page.getByRole("grid")).not.toContainText("UPD-0001");
  await expect(summary).toContainText("removeRows UPD-0001");

  await page.getByRole("button", { name: "Reset data" }).click();
  await expect(page.getByRole("grid")).toContainText("UPD-0001");
  await expect(summary).toContainText("setData reset");
});
