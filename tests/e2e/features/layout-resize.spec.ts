import { expect, test, type Page } from "@playwright/test";

test.describe("Layout resize stability", () => {
  test("row virtualization recalculates rendered rows when the body viewport height changes", async ({ page }) => {
    await page.goto("/#LAY-002");
    await expect(page.getByRole("heading", { name: "Row virtualization" })).toBeVisible();

    await setGridSize(page, { height: 280 });
    const compact = await readRowResizeState(page);
    expect(compact.renderedRows).toBeGreaterThan(0);
    expect(compact.renderedRows).toBeLessThanOrEqual(64);
    expect(compact.topCoverageGap).toBeLessThanOrEqual(1);
    expect(compact.viewportFooterOverlap).toBeLessThanOrEqual(1);

    await setGridSize(page, { height: 620 });
    await expect.poll(async () => (await readRowResizeState(page)).viewportHeight)
      .toBeGreaterThan(compact.viewportHeight + 160);
    const expanded = await readRowResizeState(page);
    expect(expanded.renderedRows).toBeGreaterThan(compact.renderedRows);
    expect(expanded.renderedRows).toBeLessThanOrEqual(64);
    expect(expanded.topCoverageGap).toBeLessThanOrEqual(1);
    expect(expanded.viewportFooterOverlap).toBeLessThanOrEqual(1);
    expect(expanded.scrollbarTrackHeight).toBeGreaterThan(compact.scrollbarTrackHeight);
  });

  test("column virtualization recalculates the center window when width changes", async ({ page }) => {
    await page.goto("/#LAY-003");
    await expect(page.getByRole("heading", { name: "Column virtualization" })).toBeVisible();

    const bodyViewport = page.locator('[data-layout-viewport="body"]');
    await setGridSize(page, { width: 720 });
    await bodyViewport.evaluate((element) => {
      element.scrollLeft = 4_800;
      element.dispatchEvent(new Event("scroll"));
    });
    const narrow = await readColumnResizeState(page);
    expect(narrow.viewportWidth).toBeLessThan(760);
    expect(narrow.renderedCenterCells).toBeGreaterThan(0);
    expect(narrow.renderedCenterCells).toBeLessThanOrEqual(10);
    expect(narrow.statusHeaderToBodyDelta).toBeLessThanOrEqual(1);
    expect(narrow.rightBodyColumnId).toBe("status");

    await setGridSize(page, { width: 1_280 });
    await expect.poll(async () => (await readColumnResizeState(page)).viewportWidth)
      .toBeGreaterThan(narrow.viewportWidth + 300);
    const wide = await readColumnResizeState(page);
    expect(wide.renderedCenterCells).toBeGreaterThanOrEqual(narrow.renderedCenterCells);
    expect(wide.renderedCenterCells).toBeLessThanOrEqual(10);
    expect(wide.statusHeaderToBodyDelta).toBeLessThanOrEqual(1);
    expect(wide.leftPinnedGap).toBeLessThanOrEqual(1);
    expect(wide.rightPinnedGap).toBeLessThanOrEqual(18);
    expect(wide.rightHeaderSourceId).toBe("status");
    expect(wide.rightBodyColumnId).toBe("status");
  });

  test("frozen and merged panes remain aligned across combined width and height resize", async ({ page }) => {
    await page.goto("/#F-FROZEN");
    await expect(page.getByRole("heading", { name: "Frozen rows and columns" })).toBeVisible();

    const bodyViewport = page.locator('[data-layout-viewport="body"]');
    await setGridSize(page, { width: 900, height: 360 });
    await bodyViewport.evaluate((element) => {
      element.scrollTop = 2_300;
      element.scrollLeft = 380;
      element.dispatchEvent(new Event("scroll"));
    });
    const compact = await readFrozenResizeState(page);
    expect(compact.bodyRegionRowSpan).toBeGreaterThanOrEqual(2);
    expect(compact.sampleRowTopDelta).toBeLessThanOrEqual(1);
    expect(compact.sampleRowHeightDelta).toBeLessThanOrEqual(1);
    expect(compact.statusHeaderToBodyDelta).toBeLessThanOrEqual(1);
    expect(compact.rightBodyColumnId).toBe("status");

    await setGridSize(page, { width: 1_340, height: 620 });
    await expect.poll(async () => (await readFrozenResizeState(page)).viewportWidth)
      .toBeGreaterThan(compact.viewportWidth + 300);
    const wide = await readFrozenResizeState(page);
    expect(wide.viewportHeight).toBeGreaterThan(compact.viewportHeight + 160);
    expect(wide.centerBodyRows).toBeGreaterThanOrEqual(compact.centerBodyRows);
    expect(wide.centerBodyRows).toBeLessThanOrEqual(60);
    expect(wide.bodyRegionRowSpan).toBeGreaterThanOrEqual(2);
    expect(wide.sampleRowTopDelta).toBeLessThanOrEqual(1);
    expect(wide.sampleRowHeightDelta).toBeLessThanOrEqual(1);
    expect(wide.statusHeaderToBodyDelta).toBeLessThanOrEqual(1);
    expect(wide.rightBodyColumnId).toBe("status");
  });
});

async function setGridSize(
  page: Page,
  size: { readonly width?: number; readonly height?: number }
): Promise<void> {
  await page.evaluate(({ width, height }) => {
    const host = document.querySelector<HTMLElement>(".og-root-host");
    const grid = document.querySelector<HTMLElement>(".og-grid");
    if (host && width !== undefined) {
      host.style.inlineSize = `${width}px`;
    }
    if (grid && height !== undefined) {
      grid.style.blockSize = `${height}px`;
      grid.style.maxBlockSize = `${height}px`;
    }
  }, size);
  await page.waitForTimeout(80);
}

async function readRowResizeState(page: Page) {
  return page.evaluate(() => {
    const viewport = document.querySelector<HTMLElement>('[data-layout-viewport="body"]');
    const footer = document.querySelector<HTMLElement>('[data-layout-section="footer"]');
    const rows = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-layout-section="body"] [data-layout-pane="center"] [role="row"]:not([data-virtual-spacer])'
      )
    );
    const firstRow = rows[0]?.getBoundingClientRect();
    const viewportRect = viewport?.getBoundingClientRect();
    const footerRect = footer?.getBoundingClientRect();
    const scrollbar = document.querySelector<HTMLElement>('.og-grid__scrollbar--vertical');

    return {
      viewportHeight: viewport?.clientHeight ?? 0,
      renderedRows: rows.length,
      topCoverageGap: Math.max(0, (firstRow?.top ?? 0) - (viewportRect?.top ?? 0)),
      viewportFooterOverlap: Math.max(0, (viewportRect?.bottom ?? 0) - (footerRect?.top ?? Infinity)),
      scrollbarTrackHeight: scrollbar?.getBoundingClientRect().height ?? 0
    };
  });
}

async function readColumnResizeState(page: Page) {
  return page.evaluate(() => {
    const rect = (selector: string) =>
      document.querySelector<HTMLElement>(selector)?.getBoundingClientRect();
    const viewport = document.querySelector<HTMLElement>('[data-layout-viewport="body"]');
    const centerBody = document.querySelector<HTMLElement>(
      '[data-layout-section="body"] [data-layout-pane="center"] .og-grid__body'
    );
    const headerStatusElement = document.querySelector<HTMLElement>(
      '[data-layout-section="header"] [role="columnheader"][data-source-id="status"]'
    );
    const bodyStatusElement = document.querySelector<HTMLElement>(
      '[data-layout-section="body"] [data-layout-pane="right"] [data-column-id="status"]'
    );
    const firstCenterRow = document.querySelector<HTMLElement>(
      '[data-layout-section="body"] [data-layout-pane="center"] [data-row-key]'
    );
    const firstLeftCell = rect('[data-layout-section="body"] [data-layout-pane="left"] [data-column-id="id"]');
    const bodyStatus = bodyStatusElement?.getBoundingClientRect();
    const headerStatus = headerStatusElement?.getBoundingClientRect();
    const viewportRect = viewport?.getBoundingClientRect();

    return {
      viewportWidth: viewport?.clientWidth ?? 0,
      firstVirtualColumn: Number(centerBody?.dataset.virtualFirstColumn ?? "0"),
      renderedCenterCells: firstCenterRow?.querySelectorAll('[role="gridcell"]').length ?? 0,
      statusHeaderToBodyDelta: Math.abs((headerStatus?.left ?? 0) - (bodyStatus?.left ?? 100)),
      leftPinnedGap: Math.max(0, (firstLeftCell?.left ?? 0) - (viewportRect?.left ?? 0)),
      rightPinnedGap: Math.max(0, (viewportRect?.right ?? 0) - (bodyStatus?.right ?? 0)),
      rightHeaderSourceId: headerStatusElement?.getAttribute("data-source-id"),
      rightBodyColumnId: bodyStatusElement?.getAttribute("data-column-id"),
      firstVirtualColumnChanged: Number(centerBody?.dataset.virtualFirstColumn ?? "0") > 0
    };
  });
}

async function readFrozenResizeState(page: Page) {
  return page.evaluate(() => {
    const rect = (selector: string) =>
      document.querySelector<HTMLElement>(selector)?.getBoundingClientRect();
    const rows = (pane: string) =>
      Array.from(
        document.querySelectorAll<HTMLElement>(
          `[data-layout-section="body"] [data-layout-pane="${pane}"] [role="row"]`
        )
      );
    const leftRows = rows("left");
    const centerRows = rows("center");
    const rightRows = rows("right");
    const sampleIndex = Math.min(2, Math.max(0, centerRows.length - 1));
    const leftSample = leftRows[sampleIndex]?.getBoundingClientRect();
    const centerSample = centerRows[sampleIndex]?.getBoundingClientRect();
    const rightSample = rightRows[sampleIndex]?.getBoundingClientRect();
    const viewport = document.querySelector<HTMLElement>('[data-layout-viewport="body"]');
    const bodyStatusElement = document.querySelector<HTMLElement>(
      '[data-layout-section="body"] [data-layout-pane="right"] [data-column-id="status"]'
    );
    const bodyStatus = bodyStatusElement?.getBoundingClientRect();
    const headerStatus = rect('[data-layout-section="header"] [role="columnheader"][data-source-id="status"]');

    return {
      viewportWidth: viewport?.clientWidth ?? 0,
      viewportHeight: viewport?.clientHeight ?? 0,
      centerBodyRows: centerRows.length,
      bodyRegionRowSpan: Number(
        document
          .querySelector<HTMLElement>(
            '[data-layout-section="body"] [data-layout-pane="left"] [data-cell-span-kind="value"][data-column-id="region"]'
          )
          ?.getAttribute("aria-rowspan") ?? "1"
      ),
      sampleRowTopDelta: Math.max(
        Math.abs((leftSample?.top ?? 0) - (centerSample?.top ?? 100)),
        Math.abs((rightSample?.top ?? 0) - (centerSample?.top ?? 100))
      ),
      sampleRowHeightDelta: Math.max(
        Math.abs((leftSample?.height ?? 0) - (centerSample?.height ?? 100)),
        Math.abs((rightSample?.height ?? 0) - (centerSample?.height ?? 100))
      ),
      statusHeaderToBodyDelta: Math.abs((headerStatus?.left ?? 0) - (bodyStatus?.left ?? 100)),
      rightBodyColumnId: bodyStatusElement?.getAttribute("data-column-id")
    };
  });
}
