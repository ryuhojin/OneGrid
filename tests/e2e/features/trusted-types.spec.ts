import { expect, test } from "@playwright/test";

declare global {
  interface Window {
    __onegridTrustedTypesViolations?: TrustedTypesViolation[];
  }
}

interface TrustedTypesViolation {
  readonly blockedURI: string;
  readonly effectiveDirective: string;
  readonly violatedDirective: string;
}

const TRUSTED_TYPES_CSP =
  "require-trusted-types-for 'script'; trusted-types onegrid-xss-example";

test("sanitized html renderer works under enforced Trusted Types CSP", async ({
  browserName,
  page
}) => {
  test.skip(browserName !== "chromium", "Trusted Types enforcement is Chromium-based.");

  await page.route("**/*", async (route) => {
    if (route.request().resourceType() !== "document") {
      await route.continue();
      return;
    }

    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: {
        ...response.headers(),
        "content-security-policy": TRUSTED_TYPES_CSP
      }
    });
  });

  await page.addInitScript(() => {
    window.__onegridTrustedTypesViolations = [];
    window.addEventListener("securitypolicyviolation", (event) => {
      window.__onegridTrustedTypesViolations?.push({
        blockedURI: event.blockedURI,
        effectiveDirective: event.effectiveDirective,
        violatedDirective: event.violatedDirective
      });
    });
  });

  await page.goto("/#SEC-002");

  await expect(page.getByRole("heading", { name: "XSS defense" })).toBeVisible();
  await expect(page.locator('[data-column-id="htmlRenderer"] strong').first()).toHaveText("Approved");
  await expect(page.locator('[data-trusted-types-policy="onegrid-xss-example"]').first())
    .toBeVisible();
  await expect(page.locator("[data-trusted-types-blocked='true']")).toHaveCount(0);

  const renderViolations = await page.evaluate(() => window.__onegridTrustedTypesViolations ?? []);
  expect(renderViolations).toEqual([]);

  const policyIsRestricted = await page.evaluate(() => {
    try {
      window.trustedTypes?.createPolicy("onegrid-disallowed-probe", {
        createHTML: (input) => input
      });
      return false;
    } catch {
      return true;
    }
  });
  expect(policyIsRestricted).toBe(true);

  const rawHtmlSinkIsBlocked = await page.evaluate(() => {
    const element = document.createElement("div");
    try {
      element.innerHTML = "<strong>blocked</strong>";
      return false;
    } catch {
      return true;
    }
  });
  expect(rawHtmlSinkIsBlocked).toBe(true);
});
