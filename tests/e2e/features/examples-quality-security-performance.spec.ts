import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

test("EX-005 security, theme, and accessibility routes expose quality controls", async ({ page }) => {
  await page.goto("/#EX-005-001");
  await expect(page.getByRole("heading", { name: "CSP nonce setup" })).toBeVisible();
  await expect(summaryValue(page, "CSP summary", "Nonce")).toHaveText("onegrid-csp-test");
  await expect(page.getByRole("grid", { name: "CSP locked grid" })).toBeVisible();

  await page.goto("/#EX-005-002");
  await expect(page.getByRole("heading", { name: "XSS-safe renderer setup" })).toBeVisible();
  await expect(summaryValue(page, "XSS defense summary", "XSS fired")).toHaveText("no");
  await expect(summaryValue(page, "XSS defense summary", "Unsafe href")).toHaveText("blocked");

  await page.goto("/#EX-005-003");
  await expect(page.getByRole("heading", { name: "Theme customization setup" })).toBeVisible();
  await page.getByRole("button", { name: "BNK gold" }).click();
  await expect(summaryValue(page, "SI theme state", "Tenant theme")).toHaveText("si-bnk-gold");

  await page.goto("/#EX-005-004");
  await expect(page.getByRole("heading", { name: "Accessibility keyboard setup" })).toBeVisible();
  const grid = page.getByRole("grid", { name: "Accessibility contract grid" });
  await expect(grid).toHaveAttribute("aria-rowcount", "6");
  await grid.locator('[data-field="id"]').first().click();
  await page.keyboard.press("ArrowRight");
  await expect(grid.locator('[data-field="department"]').first()).toBeFocused();
});

test("EX-005 large-row routes keep DOM bounded while exposing logical scale", async ({ page }) => {
  await page.goto("/#EX-005-005");
  await expect(page.getByRole("heading", { name: "10M server rows setup" })).toBeVisible();
  const serverGrid = page.getByRole("grid", { name: "10M server rows grid" });
  await expect(serverGrid).toHaveAttribute("aria-rowcount", "10000000");
  await expect(summaryValue(page, "10M server rows summary", "Logical rows")).toHaveText("10,000,000");
  await expect.poll(async () => bodyRowCount(page)).toBeLessThanOrEqual(160);

  await page.getByRole("button", { name: "Jump near 10M" }).click();
  await expect(summaryValue(page, "10M server rows summary", "Page")).toHaveText("78125");
  await expect(serverGrid).toContainText("SRV10M-09999873");
  await expect.poll(async () => bodyRowCount(page)).toBeLessThanOrEqual(160);

  await page.goto("/#EX-005-006");
  await expect(page.getByRole("heading", { name: "100M viewport rows setup" })).toBeVisible();
  const viewportGrid = page.getByRole("grid", { name: "100M viewport rows grid" });
  await expect(viewportGrid).toHaveAttribute("aria-rowcount", "100000000");
  await expect(summaryValue(page, "100M viewport rows summary", "Logical rows")).toHaveText("100,000,000");
  await expect.poll(async () => bodyRowCount(page)).toBeLessThanOrEqual(80);

  await page.getByRole("button", { name: "Jump near 100M" }).click();
  await expect.poll(async () => visibleBodyRowCount(page)).toBeGreaterThan(0);
  await expect(summaryValue(page, "100M viewport rows summary", "Visible range")).toContainText("999999");
  await expect(viewportGrid).toContainText(/VP100M-0?999999/);
  await expect.poll(async () => bodyRowCount(page)).toBeLessThanOrEqual(80);

  await page.getByRole("button", { name: "Jump top" }).click();
  await expect(viewportGrid).toContainText("VP100M-000000001");
  await clickVerticalScrollbarTrack(page, 1);
  await expect.poll(async () => visibleBodyRowCount(page)).toBeGreaterThan(0);
  await expect.poll(async () => logicalScrollTop(page)).toBeGreaterThan(2_900_000_000);
  await expect.poll(async () => layoutScrollTop(viewportGrid)).toBeGreaterThan(2_900_000_000);
  await expect.poll(async () => layoutScrollMaxTop(viewportGrid)).toBeGreaterThan(2_900_000_000);
  await expect.poll(async () => layoutScrollHeight(viewportGrid)).toBe(3_000_000_000);
  await expect(viewportGrid).toContainText("VP100M-100000000");
  expect(await lastBodyRowFullyVisible(page)).toBe(true);
  await page.getByRole("button", { name: "Jump top" }).click();
  await expect(viewportGrid).toContainText("VP100M-000000001");
  await clickVerticalScrollbarTrack(page, 0.5);
  await expect.poll(async () => logicalScrollTop(page)).toBeGreaterThan(1_000_000_000);
  await expect(viewportGrid).toContainText(/VP100M-0?499999/);
  await dragVerticalScrollbarThumb(page, 0.75);
  await expect.poll(async () => logicalScrollTop(page)).toBeGreaterThan(2_000_000_000);
  await expect(viewportGrid).toContainText(/VP100M-0?7[0-9]{7}/);
  await expect.poll(async () => bodyRowCount(page)).toBeLessThanOrEqual(80);
});

test("EX-005 captures browser DOM, frame, and heap smoke metrics", async ({ page }, testInfo) => {
  await page.goto("/#EX-005-006");
  const viewportGrid = page.getByRole("grid", { name: "100M viewport rows grid" });
  await expect(viewportGrid).toHaveAttribute("aria-rowcount", "100000000");
  await expect.poll(async () => visibleBodyRowCount(page)).toBeGreaterThan(0);

  await clickVerticalScrollbarTrack(page, 0.35);
  await expect.poll(async () => visibleBodyRowCount(page)).toBeGreaterThan(0);
  const midMetrics = await collectBrowserGridMetrics(page);

  await clickVerticalScrollbarTrack(page, 0.95);
  await expect.poll(async () => visibleBodyRowCount(page)).toBeGreaterThan(0);
  const tailMetrics = await collectBrowserGridMetrics(page);

  testInfo.annotations.push({
    type: "browser-grid-metrics",
    description: JSON.stringify({ mid: midMetrics, tail: tailMetrics })
  });

  expect(midMetrics.renderedRows).toBeLessThanOrEqual(80);
  expect(tailMetrics.renderedRows).toBeLessThanOrEqual(80);
  expect(midMetrics.gridElementCount).toBeLessThanOrEqual(1_500);
  expect(tailMetrics.gridElementCount).toBeLessThanOrEqual(1_500);
  expect(midMetrics.averageFrameMs).toBeLessThanOrEqual(40);
  expect(tailMetrics.averageFrameMs).toBeLessThanOrEqual(40);
  expect(tailMetrics.heapUsedBytes === null || tailMetrics.heapUsedBytes > 0).toBe(true);
});

test("EX-005 SI scenario routes combine security posture with enterprise layout", async ({ page }) => {
  await page.goto("/#EX-005-007");
  await expect(page.getByRole("heading", { name: "Financial SI setup" })).toBeVisible();
  const financialGrid = page.getByRole("grid", { name: "Financial SI quality grid" });
  await expect(financialGrid.getByRole("columnheader", { name: "Financial controls" })).toBeVisible();
  await expect(summaryValue(page, "Financial SI summary", "Exposure total")).toHaveText("3,250,000");
  await expect(summaryValue(page, "Financial SI summary", "Security default")).toContainText("text rendering");

  await page.goto("/#EX-005-008");
  await expect(page.getByRole("heading", { name: "Public-sector SI setup" })).toBeVisible();
  const publicGrid = page.getByRole("grid", { name: "Public sector SI quality grid" });
  await expect(publicGrid.getByRole("columnheader", { name: "Citizen service" })).toBeVisible();
  await page.getByLabel("Public service quick filter").fill("welfare");
  await expect(publicGrid).toContainText("Welfare Office");
  await expect(publicGrid).not.toContainText("Records Office");
  await expect(summaryValue(page, "Public sector SI summary", "CSP posture")).toContainText("no inline");
});

function summaryValue(page: Page, summaryLabel: string, label: string) {
  return page
    .getByLabel(summaryLabel)
    .locator("dt")
    .filter({ hasText: new RegExp(`^${label}$`) })
    .locator("+ dd");
}

async function bodyRowCount(page: Page): Promise<number> {
  return page.locator('[data-layout-section="body"] [data-row-key]').count();
}

async function clickVerticalScrollbarTrack(page: Page, ratio: number): Promise<void> {
  const track = await currentVerticalScrollbar(page);
  const box = await track.boundingBox();
  if (!box) {
    throw new Error("Vertical scrollbar track was not rendered.");
  }

  await track.click({
    force: true,
    position: {
      x: box.width / 2,
      y: Math.max(0, Math.min(box.height - 1, box.height * ratio))
    }
  });
}

async function dragVerticalScrollbarThumb(page: Page, targetRatio: number): Promise<void> {
  const track = await currentVerticalScrollbar(page);
  const thumb = track.locator(".og-grid__scrollbar-thumb").first();
  const trackBox = await track.boundingBox();
  const thumbBox = await thumb.boundingBox();
  if (!trackBox || !thumbBox) {
    throw new Error("Vertical scrollbar thumb was not rendered.");
  }

  await page.mouse.move(thumbBox.x + thumbBox.width / 2, thumbBox.y + thumbBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(trackBox.x + trackBox.width / 2, trackBox.y + trackBox.height * targetRatio, {
    steps: 10
  });
  await page.mouse.up();
}

async function logicalScrollTop(page: Page): Promise<number> {
  return page.locator('[data-layout-viewport="body"]').evaluate((element) => {
    const value = Number((element as HTMLElement).dataset.logicalScrollTop);
    return Number.isFinite(value) ? value : 0;
  });
}

async function layoutScrollTop(grid: Locator): Promise<number> {
  return grid.evaluate((element) => {
    const value = Number((element as HTMLElement).dataset.layoutScrollTop);
    return Number.isFinite(value) ? value : 0;
  });
}

async function layoutScrollMaxTop(grid: Locator): Promise<number> {
  return grid.evaluate((element) => {
    const value = Number((element as HTMLElement).dataset.layoutScrollMaxTop);
    return Number.isFinite(value) ? value : 0;
  });
}

async function layoutScrollHeight(grid: Locator): Promise<number> {
  return grid.evaluate((element) => {
    const value = Number((element as HTMLElement).dataset.layoutScrollHeight);
    return Number.isFinite(value) ? value : 0;
  });
}

async function visibleBodyRowCount(page: Page): Promise<number> {
  return page.locator('[data-layout-viewport="body"]').evaluate((element) =>
    [...element.querySelectorAll('[data-row-key]')].filter((row) => {
      const viewportRect = element.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      return rowRect.bottom > viewportRect.top && rowRect.top < viewportRect.bottom;
    }).length
  );
}

interface BrowserGridMetrics {
  readonly renderedRows: number;
  readonly renderedCells: number;
  readonly gridElementCount: number;
  readonly averageFrameMs: number;
  readonly heapUsedBytes: number | null;
}

async function collectBrowserGridMetrics(page: Page): Promise<BrowserGridMetrics> {
  return page.locator('[role="grid"][aria-label="100M viewport rows grid"]').evaluate(async (grid) => {
    const root = grid as HTMLElement;
    const start = performance.now();
    let frameCount = 0;
    await new Promise<void>((resolve) => {
      const tick = (): void => {
        frameCount += 1;
        if (frameCount >= 8) {
          resolve();
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    const elapsed = performance.now() - start;
    const memory = (performance as Performance & {
      readonly memory?: { readonly usedJSHeapSize?: number };
    }).memory;

    return {
      renderedRows: root.querySelectorAll('[data-layout-section="body"] [data-row-key]').length,
      renderedCells: root.querySelectorAll('[data-layout-section="body"] [role="gridcell"]').length,
      gridElementCount: root.querySelectorAll("*").length,
      averageFrameMs: elapsed / Math.max(1, frameCount),
      heapUsedBytes: Number.isFinite(memory?.usedJSHeapSize)
        ? memory?.usedJSHeapSize ?? null
        : null
    };
  });
}

async function lastBodyRowFullyVisible(page: Page): Promise<boolean> {
  return page.locator('[data-layout-viewport="body"]').evaluate((element) => {
    const rows = [...element.querySelectorAll('[data-layout-pane="center"] [data-row-key]')];
    const lastRow = rows.at(-1);
    if (!lastRow) {
      return false;
    }

    const viewportRect = element.getBoundingClientRect();
    const rowRect = lastRow.getBoundingClientRect();
    return rowRect.top >= viewportRect.top - 0.5 && rowRect.bottom <= viewportRect.bottom + 0.5;
  });
}

async function currentVerticalScrollbar(page: Page) {
  const viewportId = await page.locator('[data-layout-viewport="body"]').evaluate((element) => {
    if (!element.id) {
      throw new Error("Body viewport is missing a scrollbar control id.");
    }

    return element.id;
  });
  return page.locator(`.og-grid__scrollbar--vertical[data-scrollbar-controls="${viewportId}"]`).first();
}
