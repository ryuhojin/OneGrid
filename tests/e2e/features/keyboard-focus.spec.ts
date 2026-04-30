import { expect, test, type Page } from "@playwright/test";

test("keyboard focus supports arrows, home/end, page keys, and tab movement", async ({ page }) => {
  await page.goto("/#DOM-002");

  await page.getByRole("gridcell", { name: "KF-0001" }).click();
  await expectActiveCell(page, { row: 1, col: 1, columnId: "id", text: "KF-0001" });

  await page.keyboard.press("ArrowRight");
  await expectActiveCell(page, { row: 1, col: 2, columnId: "region", text: "Capital" });

  await page.keyboard.press("Tab");
  await expectActiveCell(page, { row: 1, col: 3, columnId: "agency", text: "Treasury Office" });

  await page.keyboard.press("Shift+Tab");
  await expectActiveCell(page, { row: 1, col: 2, columnId: "region", text: "Capital" });

  await page.keyboard.press("End");
  await expectActiveCell(page, { row: 1, col: 7, columnId: "status", text: "Approved" });

  await page.keyboard.press("Home");
  await expectActiveCell(page, { row: 1, col: 1, columnId: "id", text: "KF-0001" });

  await page.keyboard.press("PageDown");
  await expect.poll(() => getActiveCell(page)).toMatchObject({
    columnId: "id"
  });
  expect((await getActiveCell(page)).row).toBeGreaterThan(1);

  await page.keyboard.press("PageUp");
  await expectActiveCell(page, { row: 1, col: 1, columnId: "id", text: "KF-0001" });
});

test("keyboard focus skips covered merge cells and crosses pinned panes", async ({ page }) => {
  await page.goto("/#DOM-002");

  await page.locator('[data-column-id="region"][data-cell-span-id]').first().click();
  await expectActiveCell(page, { row: 1, col: 2, columnId: "region", text: "Capital" });

  await page.keyboard.press("ArrowDown");
  await expectActiveCell(page, { row: 4, col: 2, columnId: "region", text: "Regional" });

  await page.keyboard.press("End");
  await expectActiveCell(page, { row: 4, col: 7, columnId: "status", text: "Hold" });

  await page.locator('[data-column-id="memo"][data-cell-span-id]').first().click();
  await expectActiveCell(page, { row: 1, col: 5, columnId: "memo", text: "Joint approval" });

  await page.keyboard.press("ArrowRight");
  await expectActiveCell(page, { row: 1, col: 7, columnId: "status", text: "Approved" });
});

test("keyboard focus does not paint center cells over pinned panes", async ({ page }) => {
  await page.goto("/#DOM-002");

  const viewport = page.locator('[data-layout-viewport="body"]');
  await page.locator('[data-column-id="region"][data-cell-span-id]').nth(1).click();
  await expectActiveCell(page, { row: 4, col: 2, columnId: "region", text: "Regional" });

  await viewport.evaluate((element) => {
    element.scrollLeft = 96;
    element.dispatchEvent(new Event("scroll"));
  });

  await expect.poll(async () => viewport.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);

  const topLayer = await page.evaluate(() => {
    const active = document.querySelector<HTMLElement>('[data-focus-active="true"]');
    const leftPane = document.querySelector<HTMLElement>(
      '[data-layout-section="body"] [data-layout-pane="left"]'
    );
    const activeRect = active?.getBoundingClientRect();
    const leftRect = leftPane?.getBoundingClientRect();
    if (!activeRect || !leftRect) {
      return { columnId: "", pane: "", activeOverlapsLeftPane: false };
    }

    const probeX = leftRect.right - 16;
    const probeY = activeRect.top + activeRect.height / 2;
    const topElement = document.elementFromPoint(probeX, probeY)?.closest<HTMLElement>(
      '[role="gridcell"]'
    );

    return {
      columnId: topElement?.dataset.columnId ?? "",
      pane: topElement?.closest<HTMLElement>("[data-layout-pane]")?.dataset.layoutPane ?? "",
      activeOverlapsLeftPane: activeRect.left < leftRect.right
    };
  });

  expect(topLayer.activeOverlapsLeftPane).toBe(true);
  expect(topLayer.pane).toBe("left");
  expect(topLayer.columnId).toBe("id");
});

async function expectActiveCell(
  page: Page,
  expected: { readonly row: number; readonly col: number; readonly columnId: string; readonly text: string }
): Promise<void> {
  await expect.poll(() => getActiveCell(page)).toMatchObject(expected);
}

async function getActiveCell(page: Page) {
  return page.evaluate(() => {
    const cell = document.querySelector<HTMLElement>('[data-focus-active="true"]');
    const row = cell?.closest<HTMLElement>('[role="row"]');
    return {
      row: Number(row?.getAttribute("aria-rowindex") ?? 0),
      col: Number(cell?.getAttribute("aria-colindex") ?? 0),
      columnId: cell?.dataset.columnId ?? "",
      text: cell?.textContent?.trim() ?? "",
      activeElementMatches: document.activeElement === cell
    };
  });
}
