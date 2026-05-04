import { expect, test } from "@playwright/test";

test("xss defense example keeps malicious data inert", async ({ page }) => {
  await page.goto("/#SEC-002");

  await expect(page.getByRole("heading", { name: "XSS defense" })).toBeVisible();
  const grid = page.getByRole("grid");
  await expect(grid).toContainText("XSS-001");
  await expect(page.locator('[data-column-id="plain"]').first()).toContainText("<img src=x onerror=");
  await expect(page.locator('[data-column-id="textRenderer"]').first()).toContainText("<strong>Escaped text renderer</strong>");

  await expect(page.locator(".og-grid-shell img")).toHaveCount(0);
  await expect(page.locator(".og-grid-shell script")).toHaveCount(0);
  await expect(page.locator('[data-column-id="htmlRenderer"] strong').first()).toHaveText("Approved");
  await expect(page.locator('[data-column-id="htmlRenderer"] strong').first()).not.toHaveAttribute("onclick", /onegridXss/);

  const unsafeLink = page.locator(".xss-defense-link").first();
  await expect(unsafeLink).not.toHaveAttribute("href", /javascript/);
  await expect(unsafeLink).not.toHaveAttribute("onclick", /onegridXss/);
  await expect(unsafeLink).not.toHaveAttribute("style", /color/);
  await unsafeLink.click();

  await expect(page.getByLabel("XSS defense summary")).toContainText("XSS fired");
  await expect(page.getByLabel("XSS defense summary")).toContainText("no");
  await expect(page.getByLabel("XSS defense summary")).toContainText("blocked");
  await expect(page.evaluate(() => (window as { __onegridXss?: boolean }).__onegridXss)).resolves.toBe(false);
});
