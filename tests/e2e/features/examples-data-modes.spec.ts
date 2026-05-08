import { expect, test } from "@playwright/test";

test("EX-003 client row model route renders grouped client data", async ({ page }) => {
  await page.goto("/#EX-003-001");

  await expect(page.getByRole("heading", { name: "Client row model setup" })).toBeVisible();
  const grid = page.getByRole("grid");
  await expect(grid).toHaveAttribute("aria-rowcount", "7");
  await expect(grid).toContainText("region: Seoul (2 rows)");
  await expect(page.getByLabel("Client row model summary")).toContainText("Aggregate amount");
});

test("EX-003 infinite row model route loads the next block", async ({ page }) => {
  await page.goto("/#EX-003-002");

  await expect(page.getByRole("heading", { name: "Infinite row model setup" })).toBeVisible();
  const grid = page.getByRole("grid");
  await expect(grid).toHaveAttribute("aria-rowcount", "1000000");
  await expect(grid).toContainText("ORD-0000001");
  await page.getByRole("button", { name: "Load more rows" }).click();
  await expect(grid).toContainText("ORD-0000021");
});

test("EX-003 server row model route expands server groups", async ({ page }) => {
  await page.goto("/#EX-003-003");

  await expect(page.getByRole("heading", { name: "Server row model setup" })).toBeVisible();
  const grid = page.getByRole("grid");
  await expect(grid).toHaveAttribute("aria-rowcount", "4");
  await page.getByRole("button", { name: "Expand Daejeon group" }).click();
  await expect(grid).toHaveAttribute("aria-rowcount", "11");
  await expect(grid).toContainText("ORD-SRV-0040");
});

test("EX-003 viewport row model route jumps and applies live update", async ({ page }) => {
  await page.goto("/#EX-003-004");

  await expect(page.getByRole("heading", { name: "Viewport row model setup" })).toBeVisible();
  const grid = page.getByRole("grid");
  await expect(grid).toHaveAttribute("aria-rowcount", "10000000");
  await page.getByRole("button", { name: "Jump viewport" }).click();
  await expect(page.getByLabel("Viewport row model summary")).toContainText("4998-5009");
  await page.getByRole("button", { name: "Apply live update" }).click();
  await expect(grid).toContainText("Live Account 4999");
});

test("EX-003 tree row model route expands lazy tree rows", async ({ page }) => {
  await page.goto("/#EX-003-005");

  await expect(page.getByRole("heading", { name: "Tree row model setup" })).toBeVisible();
  const grid = page.getByRole("treegrid");
  await expect(grid).toHaveAttribute("aria-rowcount", "2");
  await page.getByRole("button", { name: "Expand OPS" }).click();
  await expect(page.getByLabel("Tree row model summary")).toContainText("1");
  await expect(grid).toContainText("Ops North");
});
