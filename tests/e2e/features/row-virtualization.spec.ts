import { expect, test, type Page } from "@playwright/test";

test("row virtualization keeps DOM rows bounded and supports scrollToRow", async ({ page }) => {
  await page.goto("/#LAY-002");

  await expect(page.getByRole("heading", { name: "Row virtualization" })).toBeVisible();

  const grid = page.getByRole("grid");
  const bodyRows = page.locator('[data-layout-section="body"] [data-layout-pane="center"] [data-row-key]');

  await expect(grid).toHaveAttribute("aria-rowcount", "50000");
  await expect(grid).toHaveAttribute("data-virtualized-rows", "true");
  await expect(page.locator('[data-layout-viewport="body"]')).toHaveAttribute("data-virtualized-rows", "true");
  await expect.poll(async () => bodyRows.count()).toBeLessThanOrEqual(64);
  await expect(grid).toContainText("Account 1");
  await expect.poll(async () =>
    page.locator(".og-grid__footer-pane").evaluate((element) => element.scrollHeight <= element.clientHeight)
  ).toBe(true);
  await expect.poll(async () =>
    page.locator('[data-layout-viewport="body"]').evaluate((element) => {
      const viewportRect = element.getBoundingClientRect();
      return Array.from(element.querySelectorAll("[data-row-key]")).every((row) => {
        const rowRect = row.getBoundingClientRect();
        return rowRect.top >= viewportRect.bottom - 1 || rowRect.bottom <= viewportRect.bottom + 1;
      });
    })
  ).toBe(true);

  await page.getByRole("button", { name: "Scroll to row 2500" }).click();

  await expect(grid).toContainText("Account 2500");
  await expect.poll(async () => bodyRows.count()).toBeLessThanOrEqual(64);
  await expect(page.getByLabel("Row virtualization summary")).toContainText("Rendered rows");

  const firstRowIndex = Number(await bodyRows.first().getAttribute("aria-rowindex"));
  expect(firstRowIndex).toBeGreaterThanOrEqual(2_496);
  expect(firstRowIndex).toBeLessThanOrEqual(2_500);
});

test("row virtualization keeps the scroll container stable during user scrolling", async ({ page }) => {
  await page.goto("/#LAY-002");

  const grid = page.getByRole("grid");
  const scrollViewport = page.locator('[data-layout-viewport="body"]');
  await scrollViewport.evaluate((element) => {
    (window as Window & { __oneGridScrollElement?: Element }).__oneGridScrollElement = element;
  });
  const initialScrollHeight = await scrollViewport.evaluate((element) => element.scrollHeight);

  const box = await scrollViewport.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move((box?.x ?? 0) + 120, (box?.y ?? 0) + 80);
  await page.mouse.wheel(0, 24_000);

  await expect.poll(async () => scrollViewport.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await expect.poll(async () => grid.evaluate((element) => element.scrollTop)).toBe(0);
  await expect.poll(async () =>
    page.evaluate(() =>
      document.querySelector('[data-layout-viewport="body"]')
        === (window as Window & { __oneGridScrollElement?: Element }).__oneGridScrollElement
    )
  ).toBe(true);

  await scrollViewport.evaluate((element) => {
    element.scrollTop = 128_000;
    element.dispatchEvent(new Event("scroll"));
  });

  await expect(grid).toContainText("Account 4000");
  await expect(page.locator('[data-layout-section="footer"]')).toBeInViewport();
  await expect.poll(async () => scrollViewport.evaluate((element) => element.scrollHeight)).toBe(initialScrollHeight);
  await expect.poll(async () =>
    page.evaluate(() =>
      document.querySelector('[data-layout-viewport="body"]')
        === (window as Window & { __oneGridScrollElement?: Element }).__oneGridScrollElement
    )
  ).toBe(true);
});

test("row virtualization updates the visible window in the same scroll event", async ({ page }) => {
  await page.goto("/#LAY-002");

  const scrollViewport = page.locator('[data-layout-viewport="body"]');
  const metrics = await scrollViewport.evaluate((element) => {
    element.scrollTop = 96_000;
    element.dispatchEvent(new Event("scroll"));

    const grid = element.closest('[role="grid"]') as HTMLElement | null;
    const gridRect = grid?.getBoundingClientRect();
    const headerRect = grid?.querySelector('[data-layout-section="header"]')?.getBoundingClientRect();
    const viewportRect = element.getBoundingClientRect();
    const firstRow = element.querySelector('[data-layout-section="body"] [data-layout-pane="center"] [data-row-key]');

    return {
      firstRowIndex: Number(firstRow?.getAttribute("aria-rowindex")),
      gridScrollTop: grid?.scrollTop ?? -1,
      layoutScrollTop: Number((grid as HTMLElement | null)?.dataset.layoutScrollTop),
      headerOffset: Math.abs((headerRect?.top ?? 0) - (gridRect?.top ?? 0)),
      scrollTop: element.scrollTop,
      viewportOffset: Math.abs(viewportRect.top - (headerRect?.bottom ?? viewportRect.top))
    };
  });

  expect(metrics.scrollTop).toBe(96_000);
  expect(metrics.layoutScrollTop).toBe(96_000);
  expect(metrics.gridScrollTop).toBe(0);
  expect(metrics.firstRowIndex).toBeGreaterThanOrEqual(2_997);
  expect(metrics.headerOffset).toBeLessThanOrEqual(2);
  expect(metrics.viewportOffset).toBeLessThanOrEqual(2);
});

test("row virtualization clamps high velocity wheel without blank body gaps", async ({ page }) => {
  await page.goto("/#LAY-002");

  const scrollViewport = page.locator('[data-layout-viewport="body"]');
  const box = await scrollViewport.boundingBox();
  expect(box).not.toBeNull();

  await page.mouse.move((box?.x ?? 0) + 180, (box?.y ?? 0) + 120);
  await page.mouse.wheel(0, 400_000);
  await page.mouse.wheel(0, 400_000);

  await expect.poll(async () => readRowViewportCoverage(page)).toMatchObject({
    topCovered: true
  });

  await page.mouse.wheel(0, -400_000);
  await page.mouse.wheel(0, -400_000);

  await expect.poll(async () => readRowViewportCoverage(page)).toMatchObject({
    topCovered: true
  });
  await expect(page.getByRole("grid")).toContainText("Account 1");
});

async function readRowViewportCoverage(page: Page) {
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
