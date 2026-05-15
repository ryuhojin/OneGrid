import { expect, test, type Page } from "@playwright/test";

test("column virtualization keeps center DOM cells bounded and supports scrollToColumn", async ({ page }) => {
  await page.goto("/#LAY-003");

  await expect(page.getByRole("heading", { name: "Column virtualization" })).toBeVisible();

  const grid = page.getByRole("grid");
  const bodyViewport = page.locator('[data-layout-viewport="body"]');
  const firstCenterRow = page
    .locator('[data-layout-section="body"] [data-layout-pane="center"] [data-row-key]')
    .first();

  await expect(grid).toHaveAttribute("aria-colcount", "75");
  await expect(grid).toHaveAttribute("data-virtualized-columns", "true");
  await expect(page.getByRole("columnheader", { name: "ID", exact: true })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Desk" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Status", exact: true })).toBeVisible();
  await expect.poll(async () => firstCenterRow.locator('[role="gridcell"]').count()).toBeLessThanOrEqual(10);

  await page.getByRole("button", { name: "Scroll to M32" }).click();

  await expect(page.getByRole("columnheader", { name: "M32" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Liquidity Metrics" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Status", exact: true })).toBeVisible();
  await expect.poll(async () => firstCenterRow.locator('[role="gridcell"]').count()).toBeLessThanOrEqual(10);
  await expect.poll(async () => bodyViewport.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  await expect.poll(async () => grid.evaluate((element) => element.scrollLeft)).toBe(0);
  await expect.poll(async () => Number(
    await page.getByLabel("Column virtualization summary").locator("dd").nth(2).textContent()
  )).toBeGreaterThanOrEqual(20);
});

test("column virtualization updates the center pane from body horizontal scrolling", async ({ page }) => {
  await page.goto("/#LAY-003");

  const bodyViewport = page.locator('[data-layout-viewport="body"]');
  const centerBody = page.locator(
    '[data-layout-section="body"] [data-layout-pane="center"] .og-grid__body'
  );
  await bodyViewport.evaluate((element) => {
    element.scrollLeft = 4_800;
    element.dispatchEvent(new Event("scroll"));
  });

  await expect.poll(async () =>
    Number(await centerBody.getAttribute("data-virtual-first-column"))
  ).toBeGreaterThan(20);
  await expect(page.getByRole("columnheader", { name: /Liquidity Metrics|Forecast Metrics/ }).first()).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "ID", exact: true })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Status", exact: true })).toBeVisible();
});

test("column virtualization keeps header, body, and pinned panes aligned while scrolling", async ({ page }) => {
  await page.goto("/#LAY-003");

  const bodyViewport = page.locator('[data-layout-viewport="body"]');
  const box = await bodyViewport.boundingBox();
  expect(box).not.toBeNull();

  await page.mouse.move((box?.x ?? 0) + 420, (box?.y ?? 0) + 120);
  await page.mouse.wheel(3_900, 0);

  await expect.poll(async () => bodyViewport.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  await expect.poll(async () =>
    page.locator('[data-layout-section="body"] [data-layout-pane="left"] [data-column-id="id"]').first().textContent()
  ).toBe("CV-0001");

  const alignment = await page.evaluate(() => {
    const header = document.querySelector('[role="columnheader"][data-source-id="metric32"]');
    const cell = document.querySelector('[data-layout-section="body"] [data-column-id="metric32"]');
    const footer = document.querySelector('[data-layout-section="footer"]');
    const viewport = document.querySelector('[data-layout-viewport="body"]');
    const grid = document.querySelector<HTMLElement>('[role="grid"]');
    const headerRect = header?.getBoundingClientRect();
    const cellRect = cell?.getBoundingClientRect();
    const footerRect = footer?.getBoundingClientRect();
    const viewportRect = viewport?.getBoundingClientRect();

    return {
      headerCellOffset: Math.abs((headerRect?.left ?? 0) - (cellRect?.left ?? 100)),
      footerOffset: Math.abs((footerRect?.left ?? 0) - (viewportRect?.left ?? 100)),
      layoutScrollLeft: Number(grid?.dataset.layoutScrollLeft),
      viewportScrollLeft: viewport?.scrollLeft ?? -1,
      gridScrollLeft: document.querySelector('[role="grid"]')?.scrollLeft ?? -1
    };
  });

  expect(alignment.headerCellOffset).toBeLessThanOrEqual(1);
  expect(alignment.footerOffset).toBeLessThanOrEqual(1);
  expect(alignment.layoutScrollLeft).toBe(alignment.viewportScrollLeft);
  expect(alignment.gridScrollLeft).toBe(0);
});

test("column virtualization clamps high velocity wheel at scroll boundaries", async ({ page }) => {
  await page.goto("/#LAY-003");

  const bodyViewport = page.locator('[data-layout-viewport="body"]');
  const box = await bodyViewport.boundingBox();
  expect(box).not.toBeNull();

  await page.mouse.move((box?.x ?? 0) + 420, (box?.y ?? 0) + 120);
  await page.mouse.wheel(120_000, 0);
  await page.mouse.wheel(120_000, 0);

  const rightEdge = await readColumnVirtualizationGeometry(page);
  expect(rightEdge.gridScrollLeft).toBe(0);
  expect(rightEdge.leftPinnedGap).toBeLessThanOrEqual(1);
  expect(rightEdge.rightPinnedGap).toBeLessThanOrEqual(18);
  expect(rightEdge.statusOffset).toBeLessThanOrEqual(1);

  await page.mouse.wheel(-120_000, 0);
  await page.mouse.wheel(-120_000, 0);

  const leftEdge = await readColumnVirtualizationGeometry(page);
  expect(leftEdge.gridScrollLeft).toBe(0);
  expect(leftEdge.scrollLeft).toBe(0);
  expect(leftEdge.leftPinnedGap).toBeLessThanOrEqual(1);
  expect(leftEdge.statusOffset).toBeLessThanOrEqual(1);
});

test("column virtualization prevents vertical wheel bounce gaps", async ({ page }) => {
  await page.goto("/#LAY-003");

  const bodyViewport = page.locator('[data-layout-viewport="body"]');
  const box = await bodyViewport.boundingBox();
  expect(box).not.toBeNull();

  await page.mouse.move((box?.x ?? 0) + 420, (box?.y ?? 0) + 120);
  await page.mouse.wheel(0, -80_000);
  await page.mouse.wheel(0, -80_000);

  await expect.poll(async () => readVerticalCoverage(page)).toMatchObject({
    topCovered: true
  });

  await page.mouse.wheel(0, 80_000);
  await page.mouse.wheel(0, 80_000);

  await expect.poll(async () => readVerticalCoverage(page)).toMatchObject({
    topCovered: true
  });
});

async function readColumnVirtualizationGeometry(page: Page) {
  return page.evaluate(() => {
    const grid = document.querySelector<HTMLElement>('[role="grid"]');
    const viewport = document.querySelector<HTMLElement>('[data-layout-viewport="body"]');
    const headerStatus = document.querySelector<HTMLElement>(
      '[data-layout-section="header"] [role="columnheader"][data-source-id="status"]'
    );
    const bodyStatus = document.querySelector<HTMLElement>(
      '[data-layout-section="body"] [data-column-id="status"]'
    );
    const bodyId = document.querySelector<HTMLElement>(
      '[data-layout-section="body"] [data-column-id="id"]'
    );
    const viewportRect = viewport?.getBoundingClientRect();
    const idRect = bodyId?.getBoundingClientRect();
    const headerStatusRect = headerStatus?.getBoundingClientRect();
    const bodyStatusRect = bodyStatus?.getBoundingClientRect();

    return {
      gridScrollLeft: grid?.scrollLeft ?? -1,
      scrollLeft: viewport?.scrollLeft ?? -1,
      leftPinnedGap: Math.max(0, (idRect?.left ?? 0) - (viewportRect?.left ?? 0)),
      rightPinnedGap: Math.max(0, (viewportRect?.right ?? 0) - (bodyStatusRect?.right ?? 0)),
      statusOffset: Math.abs((headerStatusRect?.left ?? 0) - (bodyStatusRect?.left ?? 100))
    };
  });
}

async function readVerticalCoverage(page: Page) {
  return page.evaluate(() => {
    const viewport = document.querySelector<HTMLElement>('[data-layout-viewport="body"]');
    const viewportRect = viewport?.getBoundingClientRect();
    const probeY = (viewportRect?.top ?? 0) + 1;
    const rows = Array.from(
      document.querySelectorAll<HTMLElement>('[data-layout-section="body"] [data-row-key]')
    );

    return {
      topCovered: rows.some((row) => {
        const rect = row.getBoundingClientRect();
        return rect.top <= probeY && rect.bottom >= probeY;
      })
    };
  });
}
