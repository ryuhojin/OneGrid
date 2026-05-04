import { expect, test } from "@playwright/test";
import type { Locator } from "@playwright/test";

test("theme foundation switches runtime theme, density, and scoped variables", async ({ page }) => {
  await page.goto("/#THEME-001");

  const host = page.locator("#THEME-001 .theme-example-grid");
  const grid = page.getByRole("grid", { name: "Theme foundation grid" });

  await expect(grid).toContainText("Rows: 6");
  await expect(host).toHaveAttribute("data-og-theme", "clean");
  await expect(host).toHaveAttribute("data-og-density", "standard");
  await expect(page.getByLabel("Theme state")).toContainText("clean");

  await page.getByRole("button", { name: "Dark" }).click();
  await expect(host).toHaveAttribute("data-og-theme", "dark");
  await expect(host).toHaveAttribute("data-og-density", "standard");
  await expect(await readCssVariable(host, "--og-color-bg")).toBe("#101418");

  await page.getByRole("button", { name: "Compact" }).click();
  await expect(host).toHaveAttribute("data-og-theme", "compact");
  await expect(host).toHaveAttribute("data-og-density", "compact");
  await expect(await readCssVariable(host, "--og-row-height")).toBe("30px");

  await page.getByRole("button", { name: "High contrast" }).click();
  await expect(host).toHaveAttribute("data-og-theme", "high-contrast");
  await expect(host).toHaveAttribute("data-og-density", "comfortable");
  await expect(await readCssVariable(host, "--og-color-border")).toBe("#111111");

  await page.getByRole("button", { name: "BNK scoped" }).click();
  await expect(host).toHaveAttribute("data-og-theme", "bnk-enterprise");
  await expect(page.getByLabel("Theme state")).toContainText("9");
  await expect(await readCssVariable(host, "--og-color-focus-ring")).toBe("#d7191f");
});

async function readCssVariable(locator: Locator, name: string): Promise<string> {
  return locator.evaluate((element, variableName) =>
    getComputedStyle(element).getPropertyValue(variableName).trim(), name);
}
