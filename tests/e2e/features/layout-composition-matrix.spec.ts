import { expect, test, type Page } from "@playwright/test";

test.describe("Pinned/Frozen/Virtual/Merge layout matrix", () => {
  test("F-FROZEN keeps pinned panes, frozen rows, row virtualization, and value merge aligned", async ({ page }) => {
    await page.goto("/#F-FROZEN");

    await expect(page.getByRole("heading", { name: "Frozen rows and columns" })).toBeVisible();
    const bodyViewport = page.locator('[data-layout-viewport="body"]');
    await bodyViewport.evaluate((element) => {
      element.scrollTop = 2_600;
      element.scrollLeft = 420;
      element.dispatchEvent(new Event("scroll"));
    });
    await expect.poll(async () => bodyViewport.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);

    const state = await readFrozenComposition(page);
    expect(state.hasTopFrozen).toBe(true);
    expect(state.hasBottomFrozen).toBe(true);
    expect(state.virtualizedRows).toBe(true);
    expect(state.centerBodyRows).toBeGreaterThan(0);
    expect(state.centerBodyRows).toBeLessThanOrEqual(60);
    expect(state.leftBodyRows).toBe(state.centerBodyRows);
    expect(state.rightBodyRows).toBe(state.centerBodyRows);
    expect(state.bodyRegionRowSpan).toBeGreaterThanOrEqual(2);
    expect(state.bodyAgencyRowSpan).toBeGreaterThanOrEqual(2);
    expect(state.frozenRegionRowSpan).toBeGreaterThanOrEqual(2);
    expect(state.sampleRowTopDelta).toBeLessThanOrEqual(1);
    expect(state.sampleRowHeightDelta).toBeLessThanOrEqual(1);
    expect(state.statusHeaderToBodyDelta).toBeLessThanOrEqual(1);
    expect(state.statusFrozenToBodyDelta).toBeLessThanOrEqual(1);
    expect(state.leftPinnedGap).toBeLessThanOrEqual(1);
    expect(state.rightPinnedGap).toBeLessThanOrEqual(18);
  });

  test("LAY-004 keeps pinned panes stable with value, custom, and server merge spans", async ({ page }) => {
    await page.goto("/#LAY-004");

    await expect(page.getByRole("heading", { name: "Cell merge layout" })).toBeVisible();
    const bodyViewport = page.locator('[data-layout-viewport="body"]');
    await bodyViewport.evaluate((element) => {
      element.scrollLeft = 360;
      element.dispatchEvent(new Event("scroll"));
    });

    const state = await readCellMergeComposition(page);
    expect(state.regionRowSpan).toBe(3);
    expect(state.memoColSpan).toBe(2);
    expect(state.serverStatusRowSpan).toBe(2);
    expect(state.headerProgramToBodyDelta).toBeLessThanOrEqual(1);
    expect(state.leftPaneFenceDelta).toBeLessThanOrEqual(1);
    expect(state.memoRight).toBeLessThanOrEqual(state.rightPaneLeft + 1);
    expect(state.serverStatusTopDelta).toBeLessThanOrEqual(1);
    expect(state.statusHeaderToBodyDelta).toBeLessThanOrEqual(1);
  });

  test("LAY-003 keeps column virtualization clipped behind pinned panes", async ({ page }) => {
    await page.goto("/#LAY-003");

    await expect(page.getByRole("heading", { name: "Column virtualization" })).toBeVisible();
    const bodyViewport = page.locator('[data-layout-viewport="body"]');
    await bodyViewport.evaluate((element) => {
      element.scrollLeft = 4_800;
      element.dispatchEvent(new Event("scroll"));
    });

    await expect.poll(async () => bodyViewport.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    const state = await readColumnVirtualComposition(page);
    expect(state.virtualizedColumns).toBe(true);
    expect(state.firstVirtualColumn).toBeGreaterThan(20);
    expect(state.renderedCenterCells).toBeLessThanOrEqual(10);
    expect(state.statusHeaderToBodyDelta).toBeLessThanOrEqual(1);
    expect(state.leftPinnedGap).toBeLessThanOrEqual(1);
    expect(state.rightPinnedGap).toBeLessThanOrEqual(18);
    expect(state.rightHeaderHitSourceId).toBe("status");
    expect(state.rightBodyHitColumnId).toBe("status");
  });

  test("EX-002 variable row height keeps pinned panes aligned during virtual scroll", async ({ page }) => {
    await page.goto("/#EX-002-008");

    await expect(page.getByRole("heading", { name: "Variable row height" })).toBeVisible();
    await page.waitForFunction(() =>
      (document.querySelector('[data-row-key="VRH-0004"]')?.getBoundingClientRect().height ?? 0) >= 80
    );
    const bodyViewport = page.locator('[data-layout-viewport="body"]');
    await bodyViewport.evaluate((element) => {
      element.scrollTop = element.scrollHeight * 0.55;
      element.dispatchEvent(new Event("scroll"));
    });

    const state = await readVariableHeightComposition(page);
    expect(state.virtualizedRows).toBe(true);
    expect(state.centerRows).toBeGreaterThan(0);
    expect(state.centerRows).toBeLessThanOrEqual(16);
    expect(state.leftRows).toBe(state.centerRows);
    expect(state.rightRows).toBe(state.centerRows);
    expect(state.maxTopDelta).toBeLessThanOrEqual(1);
    expect(state.maxHeightDelta).toBeLessThanOrEqual(1);
    expect(state.headerGap).toBeLessThanOrEqual(1);
    expect(state.topCovered).toBe(true);
    expect(state.statusHeaderToBodyDelta).toBeLessThanOrEqual(1);
  });
});

async function readFrozenComposition(page: Page) {
  return page.evaluate(() => {
    const rect = (selector: string) =>
      document.querySelector<HTMLElement>(selector)?.getBoundingClientRect();
    const rows = (pane: string) =>
      Array.from(
        document.querySelectorAll<HTMLElement>(
          `[data-layout-section="body"] [data-layout-pane="${pane}"] [role="row"]`
        )
      );
    const rowSpan = (selector: string) =>
      Number(document.querySelector<HTMLElement>(selector)?.getAttribute("aria-rowspan") ?? "1");

    const leftRows = rows("left");
    const centerRows = rows("center");
    const rightRows = rows("right");
    const sampleIndex = Math.min(2, Math.max(0, centerRows.length - 1));
    const leftSample = leftRows[sampleIndex]?.getBoundingClientRect();
    const centerSample = centerRows[sampleIndex]?.getBoundingClientRect();
    const rightSample = rightRows[sampleIndex]?.getBoundingClientRect();
    const viewport = rect('[data-layout-viewport="body"]');
    const firstLeftCell = rect('[data-layout-section="body"] [data-layout-pane="left"] [data-column-id="id"]');
    const bodyStatus = rect('[data-layout-section="body"] [data-layout-pane="right"] [data-column-id="status"]');
    const headerStatus = rect('[data-layout-section="header"] [role="columnheader"][data-source-id="status"]');
    const frozenStatus = rect('[data-layout-section="frozen"] [data-column-id="status"]');

    return {
      hasTopFrozen: Boolean(
        document.querySelector('[data-layout-section="frozen"][data-frozen-position="top"]')
      ),
      hasBottomFrozen: Boolean(
        document.querySelector('[data-layout-section="frozen"][data-frozen-position="bottom"]')
      ),
      virtualizedRows: document.querySelector<HTMLElement>('[role="grid"]')?.dataset.virtualizedRows === "true",
      leftBodyRows: leftRows.length,
      centerBodyRows: centerRows.length,
      rightBodyRows: rightRows.length,
      bodyRegionRowSpan: rowSpan(
        '[data-layout-section="body"] [data-layout-pane="left"] [data-cell-span-kind="value"][data-column-id="region"]'
      ),
      bodyAgencyRowSpan: rowSpan(
        '[data-layout-section="body"] [data-layout-pane="center"] [data-cell-span-kind="value"][data-column-id="agency"]'
      ),
      frozenRegionRowSpan: rowSpan(
        '[data-layout-section="frozen"] [data-layout-pane="left"] [data-cell-span-kind="value"][data-column-id="region"]'
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
      statusFrozenToBodyDelta: Math.abs((frozenStatus?.left ?? 0) - (bodyStatus?.left ?? 100)),
      leftPinnedGap: Math.max(0, (firstLeftCell?.left ?? 0) - (viewport?.left ?? 0)),
      rightPinnedGap: Math.max(0, (viewport?.right ?? 0) - (bodyStatus?.right ?? 0))
    };
  });
}

async function readCellMergeComposition(page: Page) {
  return page.evaluate(() => {
    const rect = (selector: string) =>
      document.querySelector<HTMLElement>(selector)?.getBoundingClientRect();
    const spanNumber = (selector: string, attribute: "aria-rowspan" | "aria-colspan") =>
      Number(document.querySelector<HTMLElement>(selector)?.getAttribute(attribute) ?? "1");

    const headerProgram = rect('[data-layout-section="header"] [data-source-id="program"]');
    const bodyProgram = rect('[data-row-key="CM-0001"] [data-column-id="program"]');
    const leftPane = rect('[data-layout-section="body"] [data-layout-pane="left"]');
    const firstId = rect('[data-layout-section="body"] [data-layout-pane="left"] [data-column-id="id"]');
    const rightPane = rect('[data-layout-section="body"] [data-layout-pane="right"]');
    const memo = rect('[data-row-key="CM-0001"] [data-cell-span-kind="custom"][data-column-id="memo"]');
    const serverStatus = rect('[data-cell-span-kind="server"][data-column-id="status"]');
    const serverRow = rect('[data-row-key="CM-0005"]');
    const headerStatus = rect('[data-layout-section="header"] [data-source-id="status"]');
    const bodyStatus = rect('[data-layout-section="body"] [data-column-id="status"]');

    return {
      regionRowSpan: spanNumber('[data-cell-span-kind="value"][data-column-id="region"]', "aria-rowspan"),
      memoColSpan: spanNumber('[data-cell-span-kind="custom"][data-column-id="memo"]', "aria-colspan"),
      serverStatusRowSpan: spanNumber('[data-cell-span-kind="server"][data-column-id="status"]', "aria-rowspan"),
      headerProgramToBodyDelta: Math.abs((headerProgram?.left ?? 0) - (bodyProgram?.left ?? 100)),
      leftPaneFenceDelta: Math.abs((leftPane?.right ?? 0) - (firstId?.right ?? 100)),
      memoRight: memo?.right ?? 0,
      rightPaneLeft: rightPane?.left ?? 0,
      serverStatusTopDelta: Math.abs((serverStatus?.top ?? 0) - (serverRow?.top ?? 100)),
      statusHeaderToBodyDelta: Math.abs((headerStatus?.left ?? 0) - (bodyStatus?.left ?? 100))
    };
  });
}

async function readColumnVirtualComposition(page: Page) {
  return page.evaluate(() => {
    const rect = (selector: string) =>
      document.querySelector<HTMLElement>(selector)?.getBoundingClientRect();
    const grid = document.querySelector<HTMLElement>('[role="grid"]');
    const centerBody = document.querySelector<HTMLElement>(
      '[data-layout-section="body"] [data-layout-pane="center"] .og-grid__body'
    );
    const firstCenterRow = document.querySelector<HTMLElement>(
      '[data-layout-section="body"] [data-layout-pane="center"] [data-row-key]'
    );
    const viewport = rect('[data-layout-viewport="body"]');
    const firstLeftCell = rect('[data-layout-section="body"] [data-layout-pane="left"] [data-column-id="id"]');
    const bodyStatus = rect('[data-layout-section="body"] [data-layout-pane="right"] [data-column-id="status"]');
    const headerStatus = rect('[data-layout-section="header"] [role="columnheader"][data-source-id="status"]');
    const headerHit = elementSourceAt(headerStatus);
    const bodyHit = elementSourceAt(bodyStatus);

    return {
      virtualizedColumns: grid?.dataset.virtualizedColumns === "true",
      firstVirtualColumn: Number(centerBody?.dataset.virtualFirstColumn ?? "0"),
      renderedCenterCells: firstCenterRow?.querySelectorAll('[role="gridcell"]').length ?? 0,
      statusHeaderToBodyDelta: Math.abs((headerStatus?.left ?? 0) - (bodyStatus?.left ?? 100)),
      leftPinnedGap: Math.max(0, (firstLeftCell?.left ?? 0) - (viewport?.left ?? 0)),
      rightPinnedGap: Math.max(0, (viewport?.right ?? 0) - (bodyStatus?.right ?? 0)),
      rightHeaderHitSourceId: headerHit?.closest('[role="columnheader"]')?.getAttribute("data-source-id"),
      rightBodyHitColumnId: bodyHit?.closest('[role="gridcell"]')?.getAttribute("data-column-id")
    };

    function elementSourceAt(sourceRect: DOMRect | undefined) {
      if (!sourceRect) {
        return null;
      }
      return document.elementFromPoint(sourceRect.left + 8, sourceRect.top + 8);
    }
  });
}

async function readVariableHeightComposition(page: Page) {
  return page.evaluate(() => {
    const grid = document.querySelector<HTMLElement>('[role="grid"]');
    const viewport = document.querySelector<HTMLElement>('[data-layout-viewport="body"]');
    const rows = (pane: string) =>
      Array.from(
        document.querySelectorAll<HTMLElement>(
          `[data-layout-section="body"] [data-layout-pane="${pane}"] [role="row"]`
        )
      );
    const leftRows = rows("left");
    const centerRows = rows("center");
    const rightRows = rows("right");
    const comparable = centerRows.map((centerRow, index) => ({
      center: centerRow.getBoundingClientRect(),
      left: leftRows[index]?.getBoundingClientRect(),
      right: rightRows[index]?.getBoundingClientRect()
    })).filter((item) => item.left && item.right);
    const viewportRect = viewport?.getBoundingClientRect();
    const header = document.querySelector<HTMLElement>('[data-layout-section="header"]');
    const firstCenterRow = centerRows[0]?.getBoundingClientRect();
    const headerStatus = document
      .querySelector<HTMLElement>('[data-layout-section="header"] [data-source-id="status"]')
      ?.getBoundingClientRect();
    const bodyStatus = document
      .querySelector<HTMLElement>('[data-layout-section="body"] [data-column-id="status"]')
      ?.getBoundingClientRect();

    return {
      virtualizedRows: grid?.dataset.virtualizedRows === "true",
      leftRows: leftRows.length,
      centerRows: centerRows.length,
      rightRows: rightRows.length,
      maxTopDelta: Math.max(0, ...comparable.map((item) =>
        Math.max(
          Math.abs((item.left?.top ?? 0) - item.center.top),
          Math.abs((item.right?.top ?? 0) - item.center.top)
        )
      )),
      maxHeightDelta: Math.max(0, ...comparable.map((item) =>
        Math.max(
          Math.abs((item.left?.height ?? 0) - item.center.height),
          Math.abs((item.right?.height ?? 0) - item.center.height)
        )
      )),
      headerGap: firstCenterRow && header
        ? firstCenterRow.top - header.getBoundingClientRect().bottom
        : 0,
      topCovered: comparable.some((item) =>
        item.center.top <= (viewportRect?.top ?? 0) + 1
          && item.center.bottom >= (viewportRect?.top ?? 0) + 1
      ),
      statusHeaderToBodyDelta: Math.abs((headerStatus?.left ?? 0) - (bodyStatus?.left ?? 100))
    };
  });
}
