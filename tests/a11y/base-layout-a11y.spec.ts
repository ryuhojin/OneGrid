import { expect, test } from "@playwright/test";

test("base layout keeps ARIA grid sections and footer visible @a11y", async ({ page }) => {
  await page.goto("/#LAY-001");

  const grid = page.getByRole("grid");
  await expect(grid).toHaveAttribute("aria-colcount", "6");
  await expect(grid).toHaveAttribute("aria-rowcount", "4");
  await expect(grid.getByRole("columnheader", { name: "Amount" })).toHaveAttribute(
    "aria-colindex",
    "4"
  );
  await expect(grid.getByText("Rows: 4")).toBeVisible();
});
