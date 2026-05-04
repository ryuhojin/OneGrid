import { expect, test } from "@playwright/test";

test("CSP example exposes nonce and disabled style injection states", async ({ page }) => {
  await page.goto("/#SEC-001");

  await expect(page.getByRole("grid", { name: "CSP locked grid" })).toContainText("CSP-0001");
  await expect(page.getByLabel("CSP summary")).toContainText("Style injection");
  await expect(page.getByLabel("CSP summary")).toContainText("active");
  await expect(page.getByLabel("CSP summary")).toContainText("onegrid-csp-test");
  await expect(page.getByLabel("CSP summary")).toContainText("disabled");
});

test("standalone CSP page runs without CSP violations", async ({ page }) => {
  const cspErrors: string[] = [];
  page.on("console", (message) => {
    const text = message.text();
    if (/content security policy|violates.*directive/iu.test(text)) {
      cspErrors.push(text);
    }
  });

  await page.goto("/csp.html");

  await expect(page.getByRole("heading", { name: "OneGrid CSP Example" })).toBeVisible();
  await expect(page.getByRole("grid", { name: "CSP locked grid" })).toContainText("CSP-0001");
  await expect(page.getByLabel("CSP summary")).toContainText("onegrid-csp-test");

  const nonce = await page
    .locator("style[data-onegrid-instance-style]")
    .first()
    .evaluate((style) => (style as HTMLStyleElement).nonce);
  expect(nonce).toBe("onegrid-csp-test");
  expect(cspErrors).toEqual([]);
});
