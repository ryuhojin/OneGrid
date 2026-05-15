import { expect, test } from "@playwright/test";

test("EX-002 group header route renders nested grouped headers", async ({ page }) => {
  await page.goto("/#EX-002-001");

  await expect(page.getByRole("heading", { name: "Group header setup" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Portfolio, spans 3 columns" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Financial, spans 2 columns, Financial Metrics" }))
    .toBeVisible();
});

test("EX-002 header merge route renders label presentation inside header table", async ({ page }) => {
  await page.goto("/#EX-002-002");

  await expect(page.getByRole("heading", { name: "Header merge setup" })).toBeVisible();
  await expect(page.locator('[data-header-label-id="financial-merge-label"]')).toHaveText("Financial Metrics");
});

test("EX-002 vertical and horizontal cell merge routes expose span metadata", async ({ page }) => {
  await page.goto("/#EX-002-003");

  const verticalRegion = page.locator('[data-cell-span-kind="value"][data-column-id="region"]').first();
  await expect(verticalRegion).toHaveText("Capital");
  await expect(verticalRegion).toHaveAttribute("aria-rowspan", "3");

  await page.goto("/#EX-002-004");
  const horizontalMemo = page.locator('[data-cell-span-kind="custom"][data-column-id="memo"]').first();
  await expect(horizontalMemo).toHaveText("Joint approval window");
  await expect(horizontalMemo).toHaveAttribute("aria-colspan", "2");
});

test("EX-002 block cell merge route spans rows and columns together", async ({ page }) => {
  await page.goto("/#EX-002-005");

  await expect(page.getByRole("heading", { name: "Cell merge block" })).toBeVisible();
  const block = page.locator('[data-cell-span-kind="custom"][data-column-id="review"]').first();
  await expect(block).toHaveText("Joint review window");
  await expect(block).toHaveAttribute("aria-rowspan", "2");
  await expect(block).toHaveAttribute("aria-colspan", "2");
  await expect(page.locator('[data-merged-by="custom:0:review"]').first()).toHaveAttribute("aria-hidden", "true");
});

test("EX-002 frozen column and frozen row routes keep context panes visible", async ({ page }) => {
  await page.goto("/#EX-002-006");

  await expect(page.getByRole("heading", { name: "Frozen columns" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "ID", exact: true })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Status", exact: true })).toBeVisible();

  await page.goto("/#EX-002-007");
  await expect(page.getByRole("heading", { name: "Frozen rows" })).toBeVisible();
  await expect(page.locator('[data-layout-section="frozen"][data-frozen-position="top"]')).toBeVisible();
  await expect(page.locator('[data-layout-section="frozen"][data-frozen-position="bottom"]')).toBeVisible();
});

test("EX-002 variable row height route applies per-row heights", async ({ page }) => {
  await page.goto("/#EX-002-008");

  await expect(page.getByRole("heading", { name: "Variable row height" })).toBeVisible();
  await page.waitForFunction(() => {
    const longRow = document.querySelector('[data-row-key="VRH-0004"]');
    return (longRow?.getBoundingClientRect().height ?? 0) >= 80;
  });

  const heights = await page.evaluate(() => {
    const shortRow = document.querySelector('[data-row-key="VRH-0001"]')?.getBoundingClientRect().height ?? 0;
    const longRow = document.querySelector('[data-row-key="VRH-0004"]')?.getBoundingClientRect().height ?? 0;
    return { shortRow, longRow };
  });

  expect(heights.shortRow).toBeGreaterThanOrEqual(33);
  expect(heights.shortRow).toBeLessThanOrEqual(44);
  expect(heights.longRow).toBeGreaterThanOrEqual(80);
  expect(heights.longRow).toBeGreaterThan(heights.shortRow);

  const layoutHealth = await page.evaluate(() => {
    const header = document.querySelector<HTMLElement>('[data-layout-section="header"]');
    const firstCenterRow = document.querySelector<HTMLElement>(
      '[data-layout-section="body"] [data-layout-pane="center"] .og-grid__row[aria-rowindex="1"]'
    );
    const headerCells = Array.from(
      document.querySelectorAll<HTMLElement>('[data-layout-section="header"] .og-grid__header-cell')
    );
    const getRowHeight = (pane: string, ariaRowIndex: string) =>
      document
        .querySelector(
          `[data-layout-section="body"] [data-layout-pane="${pane}"] .og-grid__row[aria-rowindex="${ariaRowIndex}"]`
        )
        ?.getBoundingClientRect().height ?? 0;
    const rowRects = [1, 2, 3, 4].map((rowIndex) =>
      document
        .querySelector(
          `[data-layout-section="body"] [data-layout-pane="center"] .og-grid__row[aria-rowindex="${rowIndex}"]`
        )
        ?.getBoundingClientRect()
    );

    return {
      left: getRowHeight("left", "4"),
      center: getRowHeight("center", "4"),
      right: getRowHeight("right", "4"),
      headerGap: firstCenterRow && header
        ? firstCenterRow.getBoundingClientRect().top - header.getBoundingClientRect().bottom
        : 0,
      headerCellGap: header && headerCells.length > 0
        ? header.getBoundingClientRect().bottom
          - Math.max(...headerCells.map((cell) => cell.getBoundingClientRect().bottom))
        : 0,
      rowGaps: rowRects.slice(1).map((rect, index) => rect && rowRects[index]
        ? rect.top - rowRects[index].bottom
        : 0)
    };
  });

  expect(Math.abs(layoutHealth.left - layoutHealth.center)).toBeLessThanOrEqual(1);
  expect(Math.abs(layoutHealth.right - layoutHealth.center)).toBeLessThanOrEqual(1);
  expect(layoutHealth.headerGap).toBeLessThanOrEqual(1);
  expect(layoutHealth.headerCellGap).toBeLessThanOrEqual(1);
  for (const gap of layoutHealth.rowGaps) {
    expect(gap).toBeGreaterThanOrEqual(-1);
  }

  const virtualization = await page.evaluate(async () => {
    const initialViewport = document.querySelector<HTMLElement>('[data-layout-viewport="body"]');
    const initialCenterPane = document.querySelector<HTMLElement>(
      '[data-layout-section="body"] [data-layout-pane="center"]'
    );
    if (!initialViewport || !initialCenterPane) {
      return {
        renderedRows: 0,
        reachedBottom: false,
        topCovered: false,
        totalHeight: 0,
        topRenderedMaxHeight: 0
      };
    }

    const renderedRows = initialCenterPane.querySelectorAll(".og-grid__row[data-row-key]").length;
    initialViewport.scrollTop = initialViewport.scrollHeight - initialViewport.clientHeight;
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const viewport = document.querySelector<HTMLElement>('[data-layout-viewport="body"]');
    const centerPane = document.querySelector<HTMLElement>(
      '[data-layout-section="body"] [data-layout-pane="center"]'
    );
    if (!viewport || !centerPane) {
      return {
        renderedRows,
        reachedBottom: false,
        topCovered: false,
        totalHeight: 0,
        topRenderedMaxHeight: 0
      };
    }

    const lastRow = document.querySelector('[data-row-key="VRH-0048"]');
    const viewportTop = viewport.getBoundingClientRect().top;
    const renderedTopRows = Array.from(centerPane.querySelectorAll<HTMLElement>(".og-grid__row[data-row-key]"))
      .slice(0, 4);
    const topCovered = renderedTopRows
      .some((row) => {
        const rect = row.getBoundingClientRect();
        return rect.top <= viewportTop + 1 && rect.bottom >= viewportTop + 1;
      });
    return {
      renderedRows,
      reachedBottom: Boolean(lastRow),
      topCovered,
      totalHeight: viewport.scrollHeight,
      topRenderedMaxHeight: Math.max(0, ...renderedTopRows.map((row) => row.getBoundingClientRect().height))
    };
  });

  expect(virtualization.renderedRows).toBeLessThan(48);
  expect(virtualization.reachedBottom).toBe(true);
  expect(virtualization.topCovered).toBe(true);
  expect(virtualization.topRenderedMaxHeight).toBeLessThanOrEqual(44);
  expect(virtualization.totalHeight).toBeGreaterThan(48 * 34);
});
