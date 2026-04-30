import { expect, test } from "@playwright/test";

test("renderer foundation renders safe cell, header, and overlay hosts", async ({ page }) => {
  await page.goto("/#DOM-001");

  await expect(page.getByRole("heading", { name: "Renderer foundation" })).toBeVisible();
  await expect(page.locator(".renderer-foundation-header").first()).toHaveText("Renderer Hosts");
  await expect(page.getByRole("gridcell", { name: "Customer: Treasury Office" })).toBeVisible();
  await expect(page.locator(".risk-badge--high")).toHaveText("High");

  const status = page.locator('[data-column-id="status"] strong').first();
  await expect(status).toHaveText("Ready");
  await expect(status).not.toHaveAttribute("onclick", /alert/);
  await expect(page.getByRole("grid")).toHaveAttribute("aria-rowcount", "3");
});
