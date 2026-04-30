import { expect, test } from "@playwright/test";

test("renderer foundation exposes grid roles and sanitized renderer output @a11y", async ({ page }) => {
  await page.goto("/#DOM-001");

  await expect(page.getByRole("grid")).toHaveAttribute("aria-colcount", "5");
  await expect(page.getByRole("columnheader", { name: "Renderer Hosts" }).first()).toBeVisible();
  await expect(page.getByRole("gridcell", { name: "Customer: Audit Bureau" })).toBeVisible();
  await expect(page.locator('[data-column-id="status"] strong').nth(1)).not.toHaveAttribute("onclick", /alert/);
});
