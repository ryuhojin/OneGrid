import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

test("column UI example resizes and auto sizes a column", async ({ page }) => {
  await page.goto("/#COL-003");

  await expect(page.getByRole("heading", { name: "Column UI features" })).toBeVisible();
  const customerHeader = page.locator('[role="columnheader"][data-source-id="customer"]');
  const startWidth = await getWidth(customerHeader);
  const handle = page.getByLabel("Resize Customer");
  const handleBox = await handle.boundingBox();

  if (!handleBox) {
    throw new Error("Resize handle was not visible.");
  }

  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox.x + handleBox.width / 2 + 76, handleBox.y + handleBox.height / 2);
  await page.mouse.up();

  await expect.poll(() => getWidth(customerHeader)).toBeGreaterThan(startWidth + 48);

  await page.getByLabel("Column menu Customer").click();
  await page.getByRole("menuitem", { name: "Auto size Customer" }).click();

  await expect.poll(() => getWidth(customerHeader)).toBeGreaterThan(startWidth + 120);
});

test("column UI example reorders columns with header drag and drop", async ({ page }) => {
  await page.goto("/#COL-003");

  const statusHeader = page.locator('[role="columnheader"][data-source-id="status"]');
  const customerHeader = page.locator('[role="columnheader"][data-source-id="customer"]');
  await statusHeader.dragTo(customerHeader);

  await expect.poll(() => getHeaderOrder(page)).toEqual([
    "id",
    "status",
    "customer",
    "region",
    "amount",
    "owner"
  ]);
});

test("column UI example hides, shows, pins, and unpins columns", async ({ page }) => {
  await page.goto("/#COL-003");

  await page.getByLabel("Column menu Region").click();
  await page.getByRole("menuitem", { name: "Hide Region" }).click();
  await expect(page.getByRole("columnheader", { name: "Region" })).toHaveCount(0);

  await page.getByRole("button", { name: "Columns" }).click();
  await page.getByRole("checkbox", { name: "Region" }).click();
  await expect(page.getByRole("columnheader", { name: "Region" })).toBeVisible();

  await page.getByLabel("Column menu Customer").click();
  await page.getByRole("menuitem", { name: "Pin Customer left" }).click();
  await expect(page.locator('[role="columnheader"][data-source-id="customer"]')).toHaveClass(
    /pinned-left/
  );

  await page.getByLabel("Column menu Customer").click();
  await page.getByRole("menuitem", { name: "Unpin Customer" }).click();
  await expect(page.locator('[role="columnheader"][data-source-id="customer"]')).not.toHaveClass(
    /pinned-left/
  );
});

test("column UI example exposes menu and tool panel surfaces", async ({ page }) => {
  await page.goto("/#COL-003");

  await page.getByLabel("Column menu Customer").click();
  await expect(page.getByRole("menu", { name: "Customer column menu" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Hide Customer" })).toBeVisible();

  await page.getByRole("button", { name: "Columns" }).click();
  await expect(page.getByRole("region", { name: "Columns tool panel" })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Audit Note" })).toBeVisible();
});

test("column UI example honors column policy flags", async ({ page }) => {
  await page.goto("/#COL-003");

  await page.getByLabel("Column menu ID").click();
  await expect(page.getByRole("menuitem", { name: "Auto size ID" })).toBeDisabled();
  await expect(page.getByRole("menuitem", { name: "Hide ID" })).toBeDisabled();

  await page.getByRole("button", { name: "Columns" }).click();
  await expect(page.getByRole("checkbox", { name: "ID" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Pin Owner left" })).toBeDisabled();
});

async function getWidth(locator: Locator): Promise<number> {
  const box = await locator.boundingBox();
  return box?.width ?? 0;
}

async function getHeaderOrder(page: Page): Promise<(string | null)[]> {
  return page
    .locator('[role="columnheader"][data-source-id]')
    .evaluateAll((elements) => elements.map((element) => element.getAttribute("data-source-id")));
}
