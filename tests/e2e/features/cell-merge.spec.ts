import { expect, test } from "@playwright/test";

test("cell merge layout renders value, custom, and server spans", async ({ page }) => {
  await page.goto("/#LAY-004");

  const grid = page.getByRole("grid");
  await expect(grid).toHaveAttribute("aria-rowcount", "8");
  await expect(page.getByRole("heading", { name: "Cell merge layout" })).toBeVisible();

  const region = page.locator('[data-cell-span-kind="value"][data-column-id="region"]').first();
  await expect(region).toHaveText("Capital");
  await expect(region).toHaveAttribute("aria-rowspan", "3");

  const memo = page.locator('[data-cell-span-kind="custom"][data-column-id="memo"]').first();
  await expect(memo).toHaveText("Joint approval window");
  await expect(memo).toHaveAttribute("aria-colspan", "2");

  const serverStatus = page.locator('[data-cell-span-kind="server"][data-column-id="status"]').first();
  await expect(serverStatus).toHaveText("Server hold");
  await expect(serverStatus).toHaveAttribute("aria-rowspan", "2");

  await expect(page.locator('[data-merged-by="custom:0:memo"]').first()).toHaveAttribute("aria-hidden", "true");
  await expect(page.getByLabel("Cell merge summary")).toContainText("Merged anchors");
});

test("cell merge keeps pinned right server span aligned with body rows", async ({ page }) => {
  await page.goto("/#LAY-004");

  const row = page.locator('[data-row-key="CM-0005"]').first();
  const serverStatus = page.locator('[data-cell-span-kind="server"][data-column-id="status"]').first();
  await expect(serverStatus).toBeVisible();

  const delta = await page.evaluate(() => {
    const rowRect = document.querySelector('[data-row-key="CM-0005"]')?.getBoundingClientRect();
    const statusRect = document
      .querySelector('[data-cell-span-kind="server"][data-column-id="status"]')
      ?.getBoundingClientRect();
    return Math.abs((rowRect?.top ?? 0) - (statusRect?.top ?? 100));
  });

  await expect(row).toBeVisible();
  expect(delta).toBeLessThanOrEqual(1);
});

test("cell merge keeps headers and pinned panes stable during horizontal body scroll", async ({ page }) => {
  await page.goto("/#LAY-004");

  const viewport = page.locator('[data-layout-viewport="body"]');
  await expect(page.locator('[data-cell-span-kind="server"][data-column-id="status"]').first())
    .toBeVisible();
  await viewport.evaluate((element) => {
    element.scrollLeft = 360;
    element.dispatchEvent(new Event("scroll"));
  });

  const geometry = await page.evaluate(() => {
    const rect = (selector: string) =>
      document.querySelector(selector)?.getBoundingClientRect();
    const headerProgram = rect('[data-layout-section="header"] [data-source-id="program"]');
    const bodyProgram = rect('[data-row-key="CM-0001"] [data-column-id="program"]');
    const leftPane = rect('[data-layout-section="body"] [data-layout-pane="left"]');
    const rightPane = rect('[data-layout-section="body"] [data-layout-pane="right"]');
    const memo = rect('[data-row-key="CM-0001"] [data-cell-span-kind="custom"][data-column-id="memo"]');
    const firstId = rect('[data-layout-section="body"] [data-layout-pane="left"] [data-column-id="id"]');
    return {
      headerProgramLeft: headerProgram?.left ?? 0,
      bodyProgramLeft: bodyProgram?.left ?? 100,
      leftPaneRight: leftPane?.right ?? 0,
      firstIdRight: firstId?.right ?? 0,
      memoRight: memo?.right ?? 0,
      rightPaneLeft: rightPane?.left ?? 0,
      bodyProgramHeight: bodyProgram?.height ?? 0
    };
  });

  await expect(page.locator('[data-layout-section="body"] [data-layout-pane="left"] [data-column-id="id"]').first())
    .toHaveText("CM-0001");
  expect(Math.abs(geometry.headerProgramLeft - geometry.bodyProgramLeft)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.leftPaneRight - geometry.firstIdRight)).toBeLessThanOrEqual(1);
  expect(geometry.memoRight).toBeLessThanOrEqual(geometry.rightPaneLeft);
  expect(geometry.bodyProgramHeight).toBeLessThanOrEqual(37);
});
