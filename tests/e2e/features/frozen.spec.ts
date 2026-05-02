import { expect, test, type Page } from "@playwright/test";

test("frozen rows and columns keep context visible while the body scrolls", async ({ page }) => {
  await page.goto("/#F-FROZEN");

  await expect(page.getByRole("heading", { name: "Frozen rows and columns" })).toBeVisible();
  const grid = page.getByRole("grid");
  const bodyViewport = page.locator('[data-layout-viewport="body"]');

  await expect(grid).toHaveAttribute("aria-rowcount", "240");
  await expect(grid).toHaveAttribute("data-virtualized-rows", "true");
  await expect(page.locator('[data-layout-section="frozen"][data-frozen-position="top"]')).toBeVisible();
  await expect(page.locator('[data-layout-section="frozen"][data-frozen-position="bottom"]')).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "ID", exact: true })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Status", exact: true })).toBeVisible();

  await expect(page.locator('[data-row-key="FR-00001"]').first()).toBeVisible();
  await expect(page.locator('[data-row-key="FR-00240"]').first()).toBeVisible();
  await expect.poll(async () => getBodyCenterRowCount(page)).toBeLessThanOrEqual(60);

  await bodyViewport.evaluate((element) => {
    element.scrollTop = 2_500;
    element.dispatchEvent(new Event("scroll"));
  });

  await expect.poll(async () => bodyViewport.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await expect(page.locator('[data-layout-section="frozen"] [data-row-key="FR-00001"]').first()).toBeVisible();
  await expect(page.locator('[data-layout-section="frozen"] [data-row-key="FR-00240"]').first()).toBeVisible();
  await expect.poll(async () => getBodyCenterRowCount(page)).toBeLessThanOrEqual(60);
});

test("frozen rows participate in horizontal scroll sync and pinned panes", async ({ page }) => {
  await page.goto("/#F-FROZEN");

  const bodyViewport = page.locator('[data-layout-viewport="body"]');
  await bodyViewport.evaluate((element) => {
    element.scrollLeft = 420;
    element.dispatchEvent(new Event("scroll"));
  });

  const geometry = await page.evaluate(() => {
    const headerStatus = document.querySelector<HTMLElement>(
      '[data-layout-section="header"] [role="columnheader"][data-source-id="status"]'
    );
    const frozenStatus = document.querySelector<HTMLElement>(
      '[data-layout-section="frozen"] [data-column-id="status"]'
    );
    const bodyStatus = document.querySelector<HTMLElement>(
      '[data-layout-section="body"] [data-column-id="status"]'
    );
    const viewport = document.querySelector<HTMLElement>('[data-layout-viewport="body"]');
    const statusRect = bodyStatus?.getBoundingClientRect();
    const viewportRect = viewport?.getBoundingClientRect();

    return {
      headerToBody: Math.abs(
        (headerStatus?.getBoundingClientRect().left ?? 0) - (statusRect?.left ?? 100)
      ),
      frozenToBody: Math.abs(
        (frozenStatus?.getBoundingClientRect().left ?? 0) - (statusRect?.left ?? 100)
      ),
      rightGap: Math.max(0, (viewportRect?.right ?? 0) - (statusRect?.right ?? 0))
    };
  });

  expect(geometry.headerToBody).toBeLessThanOrEqual(1);
  expect(geometry.frozenToBody).toBeLessThanOrEqual(1);
  expect(geometry.rightGap).toBeLessThanOrEqual(18);
});

test("keyboard focus can move within frozen rowgroups", async ({ page }) => {
  await page.goto("/#F-FROZEN");

  const topFrozenCell = page.locator(
    '[data-layout-section="frozen"][data-frozen-position="top"] [role="gridcell"][data-column-id="agency"]'
  ).first();
  await topFrozenCell.click();
  await expect(topFrozenCell).toHaveAttribute("data-focus-active", "true");

  await page.keyboard.press("ArrowDown");
  await expect(page.locator('[data-focus-active="true"]')).toHaveAttribute("aria-colindex", "3");
  await expect(page.locator('[data-focus-active="true"]').locator("xpath=ancestor::*[@role='row'][1]"))
    .toHaveAttribute("aria-rowindex", "3");
});

async function getBodyCenterRowCount(page: Page): Promise<number> {
  return page
    .locator('[data-layout-section="body"] [data-layout-pane="center"] [role="row"]')
    .count();
}
