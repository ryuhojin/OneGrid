import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

test("pagination example navigates client pages and page sizes", async ({ page }) => {
  await page.goto("/#F-PAGE");

  const clientGrid = page.getByRole("grid", { name: "Client pagination grid" });
  const clientPagination = paginationForGrid(page, "Client pagination grid");
  await expect(clientGrid).toContainText("PAGE-0001");
  await expect(page.locator(".og-grid__pagination--top")).toHaveCount(0);
  await clientPagination.getByRole("button", { name: "Next page" }).click();
  await expect(clientGrid).toContainText("PAGE-0005");
  await expect(summaryValue(page, "Client pagination summary", "Page")).toHaveText("2");

  await clientPagination.getByLabel("Rows per page").selectOption("6");
  await expect(clientGrid).toContainText("PAGE-0001");
  await expect(summaryValue(page, "Client pagination summary", "Page size")).toHaveText("6");
  await expect(clientPagination.getByRole("button", { name: "Page 1" })).toHaveAttribute(
    "aria-current",
    "page"
  );
});

test("pagination example sends server page and cursor request metadata", async ({ page }) => {
  await page.goto("/#F-PAGE");

  await paginationForGrid(page, "Server pagination grid")
    .getByRole("button", { name: "Page 2" })
    .click();
  await expect(summaryValue(page, "Server pagination summary", "Requested page")).toHaveText("2");
  await expect(summaryValue(page, "Server pagination summary", "Rows")).toContainText("PAGE-0006");

  await paginationForGrid(page, "Cursor pagination grid")
    .getByRole("button", { name: "Page 2" })
    .click();
  await expect(summaryValue(page, "Cursor pagination summary", "Cursor used")).toHaveText("cursor:4");
  await expect(summaryValue(page, "Cursor pagination summary", "Rows")).toContainText("PAGE-0005");
});

test("pagination example supports append-scroll load more", async ({ page }) => {
  await page.goto("/#F-PAGE");

  const appendGrid = page.getByRole("grid", { name: "Append scroll pagination grid" });
  const appendPagination = paginationForGrid(page, "Append scroll pagination grid");
  await expect(appendGrid).toContainText("PAGE-0001");
  await expect(summaryValue(page, "Append pagination summary", "Requests")).not.toHaveText("pending");
  const before = await numberValue(page, "Append pagination summary", "Requests");
  await appendPagination.getByRole("button", { name: "Load next page" }).click();
  await expect.poll(() => numberValue(page, "Append pagination summary", "Requests")).toBeGreaterThan(before);
  await expect(appendGrid).toContainText("PAGE-0006");
});

test("pagination controls stay scoped to their own grid", async ({ page }) => {
  await page.goto("/#F-PAGE");

  const clientGrid = page.getByRole("grid", { name: "Client pagination grid" });
  const serverGrid = page.getByRole("grid", { name: "Server pagination grid" });
  const cursorGrid = page.getByRole("grid", { name: "Cursor pagination grid" });
  await paginationForGrid(page, "Client pagination grid")
    .getByRole("button", { name: "Next page" })
    .click();

  await expect(clientGrid).toContainText("PAGE-0005");
  await expect(serverGrid).toContainText("PAGE-0001");
  await expect(cursorGrid).toContainText("PAGE-0001");
  await expect(summaryValue(page, "Server pagination summary", "Requested page")).toHaveText("1");
});

function paginationForGrid(page: Page, gridName: string) {
  return page.getByRole("navigation", { name: `${gridName} bottom pagination` });
}

function summaryValue(page: Page, summaryLabel: string, label: string) {
  return page
    .getByLabel(summaryLabel)
    .locator("dt")
    .filter({ hasText: new RegExp(`^${label}$`) })
    .locator("+ dd");
}

async function numberValue(page: Page, summaryLabel: string, label: string): Promise<number> {
  const text = await summaryValue(page, summaryLabel, label).textContent();
  return Number(text ?? "0");
}
