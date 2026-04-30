import { expect, test } from "@playwright/test";

test("tree row model expands nested rows, lazy children, and descendant selection", async ({ page }) => {
  await page.goto("/#ROW-005");

  await expect(page.getByRole("heading", { name: "Tree row model" })).toBeVisible();

  const grid = page.getByRole("treegrid");
  await expect(grid).toHaveAttribute("aria-rowcount", "2");
  await expect(grid).toContainText("Finance");
  await expect(grid).toContainText("Operations");

  await page.getByRole("button", { name: "Expand FIN" }).click();
  await expect(grid).toHaveAttribute("aria-rowcount", "4");
  await expect(grid).toContainText("Receivables");
  await expect(grid).toContainText("Payables");

  await page.getByRole("checkbox", { name: "Select FIN", exact: true }).check();
  await expect(page.getByRole("checkbox", { name: "Select FIN-AR" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Select FIN-AP" })).toBeChecked();

  const summary = page.getByLabel("Tree row model summary");
  await expect(summary).toContainText("Lazy child requests");
  await expect(summary).toContainText("0");

  await page.getByRole("button", { name: "Expand OPS" }).click();
  await expect(summary).toContainText("1");
  await expect(grid).toContainText("Ops North");
  await expect(grid).toContainText("Ops South");
});
