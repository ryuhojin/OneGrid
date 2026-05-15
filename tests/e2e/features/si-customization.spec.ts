import { expect, test } from "@playwright/test";
import type { Locator } from "@playwright/test";

test("SI customization maps tenant tokens and density into scoped theme variables", async ({ page }) => {
  await page.goto("/#THEME-002");

  const host = page.locator("#THEME-002 .si-theme-grid");
  const grid = page.getByRole("grid", { name: "SI customization grid" });
  await expect(grid).toContainText("Rows: 6");
  await expect(host).toHaveAttribute("data-og-theme", "si-public-red");
  await expect(host).toHaveAttribute("data-og-density", "standard");
  await expect(page.getByLabel("SI theme state")).toContainText("Validation");
  await expect(page.getByLabel("SI theme state")).toContainText("pass");
  await expect(await readCssVariable(host, "--og-color-accent")).toBe("#d7191f");

  await page.getByRole("button", { name: "Civic blue" }).click();
  await expect(host).toHaveAttribute("data-og-theme", "si-civic-blue");
  await expect(page.getByLabel("SI theme state")).toContainText("si-civic-blue");
  await expect(page.getByLabel("SI theme state")).toContainText("pass");
  await expect(await readCssVariable(host, "--og-color-header-bg")).toBe("#eef5ff");

  await page.getByRole("button", { name: "compact" }).click();
  await expect(host).toHaveAttribute("data-og-density", "compact");
  await expect(page.getByLabel("SI theme state")).toContainText("pass");
  await expect(await readCssVariable(host, "--og-row-height")).toBe("30px");

  await page.getByRole("button", { name: "Neutral audit" }).click();
  await expect(host).toHaveAttribute("data-og-theme", "si-neutral-audit");
  await expect(page.getByLabel("SI theme state")).toContainText("pass");
  await expect(await readCssVariable(host, "--og-color-border")).toBe("#cfc8bf");

  await page.getByRole("button", { name: "BNK red" }).click();
  await expect(host).toHaveAttribute("data-og-theme", "si-bnk-red");
  await expect(page.getByLabel("SI theme state")).toContainText("pass");
  await expect(await readCssVariable(host, "--og-color-accent")).toBe("#d7191f");
  await expect(await readCssVariable(host, "--og-color-accent-hover")).toBe("#8b0304");

  await page.getByRole("button", { name: "BNK gold" }).click();
  await expect(host).toHaveAttribute("data-og-theme", "si-bnk-gold");
  await expect(page.getByLabel("SI theme state")).toContainText("pass");
  await expect(await readCssVariable(host, "--og-color-accent")).toBe("#896e4a");

  await page.getByRole("button", { name: "BNK gray" }).click();
  await expect(host).toHaveAttribute("data-og-theme", "si-bnk-gray");
  await expect(page.getByLabel("SI theme state")).toContainText("pass");
  await expect(await readCssVariable(host, "--og-color-accent")).toBe("#655c4f");
});

async function readCssVariable(locator: Locator, name: string): Promise<string> {
  return locator.evaluate((element, variableName) =>
    getComputedStyle(element).getPropertyValue(variableName).trim(), name);
}
