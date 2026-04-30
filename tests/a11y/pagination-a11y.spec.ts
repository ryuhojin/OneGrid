import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./axe-helper.js";

test("pagination controls expose labels and current page state @a11y", async ({ page }) => {
  await page.goto("/#F-PAGE");

  const clientPagination = page.getByRole("navigation", {
    name: "Client pagination grid bottom pagination"
  });
  await expect(page.locator(".og-grid__pagination--top")).toHaveCount(0);
  await expect(clientPagination).toBeVisible();
  await expect(clientPagination.getByRole("button", { name: "Page 1" })).toHaveAttribute(
    "aria-current",
    "page"
  );
  await clientPagination.getByRole("button", { name: "Next page" }).focus();
  await expect(clientPagination.getByRole("button", { name: "Next page" })).toBeFocused();
});

test("pagination example passes axe-core scan @a11y", async ({ page }) => {
  await page.goto("/#F-PAGE");

  await expect(page.getByRole("grid", { name: "Client pagination grid" })).toContainText(
    "PAGE-0001"
  );
  await expectNoAxeViolations(page, '[role="grid"][aria-label="Client pagination grid"]');
  await expectNoAxeViolations(page, ".og-grid__pagination");
});
