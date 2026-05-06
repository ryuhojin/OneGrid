import { expect, test } from "@playwright/test";

test("server row model sends server models and applies transactions", async ({ page }) => {
  await page.goto("/#ROW-003");

  await expect(page.getByRole("heading", { name: "Server row model" })).toBeVisible();

  const grid = page.getByRole("grid");
  await expect(grid).toHaveAttribute("aria-rowcount", "4");
  await expect(grid).toHaveAttribute("aria-colcount", "5");
  await expect(grid).toContainText("region: Daejeon");

  const summary = page.getByLabel("Server row model summary");
  await expect(summary).toContainText("Server requests");
  await expect(summary).toContainText("1");
  await expect(summary).toContainText("amount:desc");
  await expect(summary).toContainText("status");
  await expect(summary).toContainText("region");
  await expect(summary).toContainText("root");
  await expect(summary).toContainText("amountTotal");
  await expect(summary).toContainText("amount");

  await page.getByRole("button", { name: "Expand Daejeon group" }).click();
  await expect(summary).toContainText("2");
  await expect(summary).toContainText("region=Daejeon");
  await expect(grid).toHaveAttribute("aria-rowcount", "11");
  await expect(page.getByRole("button", { name: "Collapse Daejeon group" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Expand Seoul group" })).toBeVisible();
  await expect(grid).toContainText("ORD-SRV-0040");
  await expect(grid).toContainText("Public Sector 40");

  await page.getByRole("button", { name: "Expand Seoul group" }).click();
  await expect(summary).toContainText("3");
  await expect(summary).toContainText("region=Seoul");
  await expect(grid).toHaveAttribute("aria-rowcount", "18");
  await expect(page.getByRole("button", { name: "Collapse Seoul group" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Collapse Daejeon group" })).toBeVisible();

  await page.getByRole("button", { name: "Collapse Seoul group" }).click();
  await expect(grid).toHaveAttribute("aria-rowcount", "11");
  await expect(page.getByRole("button", { name: "Expand Seoul group" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Collapse Daejeon group" })).toBeVisible();

  await page.getByRole("button", { name: "Refresh server rows" }).click();
  await expect(summary).toContainText("5");

  await page.getByRole("button", { name: "Apply transaction" }).click();
  await expect(grid).toContainText("Public Sector 40 (updated)");
});
