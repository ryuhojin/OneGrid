import { expect, test } from "@playwright/test";

test("row virtualization exposes a draggable vertical scrollbar across browsers", async ({ page }) => {
  await page.goto("/#LAY-002");

  const viewport = page.locator('[data-layout-viewport="body"]');
  const vertical = page.locator(".og-grid__scrollbar--vertical:not([hidden])");
  const thumb = vertical.locator(".og-grid__scrollbar-thumb");

  await expect(vertical).toBeVisible();
  await expect(thumb).toBeVisible();
  await expect(page.getByRole("scrollbar", { name: "Vertical grid scrollbar" })).toBeVisible();
  await expect(vertical).toHaveAttribute("aria-orientation", "vertical");
  await expect(vertical).toHaveAttribute("aria-valuemin", "0");
  await expect(vertical).toHaveAttribute("aria-controls", await viewport.evaluate((element) => element.id));

  const geometry = await page.evaluate(() => {
    const rect = (selector: string) =>
      document.querySelector(selector)?.getBoundingClientRect();
    const viewportRect = rect('[data-layout-viewport="body"]');
    const trackRect = rect(".og-grid__scrollbar--vertical");
    const thumbRect = rect(".og-grid__scrollbar--vertical .og-grid__scrollbar-thumb");
    return {
      thumbWidth: thumbRect?.width ?? 0,
      trackLeft: trackRect?.left ?? 0,
      viewportRight: viewportRect?.right ?? 0
    };
  });

  expect(geometry.thumbWidth).toBeLessThanOrEqual(6);
  expect(geometry.trackLeft).toBeGreaterThanOrEqual(geometry.viewportRight - 1);

  const initialScrollTop = await viewport.evaluate((element) => element.scrollTop);
  const box = await thumb.boundingBox();
  if (!box) {
    throw new Error("Vertical scrollbar thumb was not measurable.");
  }

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 80, { steps: 5 });
  await page.mouse.up();

  await expect.poll(() => viewport.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(initialScrollTop);
  await expect(page.locator('[data-layout-section="body"] [data-layout-pane="center"] [data-row-key]').first())
    .toHaveAttribute("data-row-key", /VR-/);

  await vertical.focus();
  await page.keyboard.press("End");
  await expect.poll(() => vertical.getAttribute("aria-valuetext")).toBe("100%");
  await page.keyboard.press("Home");
  await expect.poll(() => viewport.evaluate((element) => element.scrollTop)).toBe(0);
});

test("variable row height keeps custom scrollbar aligned during fast rerenders", async ({ page }) => {
  await page.goto("/#EX-002-008");

  await expect(page.getByRole("heading", { name: "Variable row height" })).toBeVisible();
  const viewport = page.locator('[data-layout-viewport="body"]');
  const vertical = page.locator(".og-grid__scrollbar--vertical:not([hidden])");
  await expect(vertical).toBeVisible();

  const viewportBox = await viewport.boundingBox();
  if (!viewportBox) {
    throw new Error("Variable row height viewport was not measurable.");
  }

  await page.mouse.move(viewportBox.x + viewportBox.width / 2, viewportBox.y + 80);
  for (let index = 0; index < 12; index += 1) {
    await page.mouse.wheel(0, 720);
  }

  await expect.poll(() => page.evaluate(() => {
    const firstRow = document.querySelector<HTMLElement>(
      '[data-layout-section="body"] [data-layout-pane="center"] .og-grid__row[data-row-key]'
    );
    return firstRow?.dataset.rowKey ?? "";
  })).not.toBe("VRH-0001");

  const geometry = await page.evaluate(() => {
    const rect = (selector: string) => {
      const value = document.querySelector<HTMLElement>(selector)?.getBoundingClientRect();
      return value
        ? {
            top: value.top,
            bottom: value.bottom,
            left: value.left,
            right: value.right,
            height: value.height
          }
        : undefined;
    };
    const bodyShell = rect(".og-grid__body-shell");
    const track = rect(".og-grid__scrollbar--vertical:not([hidden])");
    const thumb = rect(".og-grid__scrollbar--vertical .og-grid__scrollbar-thumb");
    const viewportElement = document.querySelector<HTMLElement>('[data-layout-viewport="body"]');
    return {
      bodyShell,
      track,
      thumb,
      scrollTop: viewportElement?.scrollTop ?? 0
    };
  });

  expect(geometry.track).toBeDefined();
  expect(geometry.thumb).toBeDefined();
  expect(geometry.bodyShell).toBeDefined();
  expect(Math.abs((geometry.track?.top ?? 0) - (geometry.bodyShell?.top ?? 100))).toBeLessThanOrEqual(1);
  expect(Math.abs((geometry.track?.bottom ?? 0) - (geometry.bodyShell?.bottom ?? 100))).toBeLessThanOrEqual(1);
  expect(geometry.thumb?.top ?? 0).toBeGreaterThanOrEqual(geometry.track?.top ?? 0);
  expect(geometry.thumb?.bottom ?? 0).toBeLessThanOrEqual((geometry.track?.bottom ?? 0) + 1);
  expect(geometry.scrollTop).toBeGreaterThan(0);
});

test("column virtualization renders a thin horizontal scrollbar below pinned panes", async ({ page }) => {
  await page.goto("/#LAY-003");

  const viewport = page.locator('[data-layout-viewport="body"]');
  const horizontal = page.locator(".og-grid__scrollbar--horizontal:not([hidden])");
  const thumb = horizontal.locator(".og-grid__scrollbar-thumb");

  await expect(horizontal).toBeVisible();
  await expect(thumb).toBeVisible();
  await expect(page.getByRole("scrollbar", { name: "Horizontal grid scrollbar" })).toBeVisible();
  await expect(horizontal).toHaveAttribute("aria-orientation", "horizontal");
  await expect(horizontal).toHaveAttribute("aria-valuemin", "0");
  await expect(horizontal).toHaveAttribute("aria-controls", await viewport.evaluate((element) => element.id));

  const geometry = await page.evaluate(() => {
    const rect = (selector: string) =>
      document.querySelector(selector)?.getBoundingClientRect();
    const viewportRect = rect('[data-layout-viewport="body"]');
    const track = rect(".og-grid__scrollbar--horizontal");
    const thumbRect = rect(".og-grid__scrollbar--horizontal .og-grid__scrollbar-thumb");
    const leftPane = rect('[data-layout-section="body"] [data-layout-pane="left"]');
    const rightPane = rect('[data-layout-section="body"] [data-layout-pane="right"]');
    return {
      thumbHeight: thumbRect?.height ?? 0,
      trackTop: track?.top ?? 0,
      trackLeft: track?.left ?? 0,
      trackRight: track?.right ?? 0,
      viewportBottom: viewportRect?.bottom ?? 0,
      leftPaneLeft: leftPane?.left ?? 0,
      rightPaneRight: rightPane?.right ?? 0
    };
  });

  expect(geometry.thumbHeight).toBeLessThanOrEqual(6);
  expect(geometry.trackTop).toBeGreaterThanOrEqual(geometry.viewportBottom - 1);
  expect(geometry.trackLeft).toBeLessThanOrEqual(geometry.leftPaneLeft + 1);
  expect(geometry.trackRight).toBeGreaterThanOrEqual(geometry.rightPaneRight - 1);

  const initialScrollLeft = await viewport.evaluate((element) => element.scrollLeft);
  const box = await thumb.boundingBox();
  if (!box) {
    throw new Error("Horizontal scrollbar thumb was not measurable.");
  }

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();

  await expect.poll(() => viewport.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(initialScrollLeft);

  await horizontal.focus();
  await page.keyboard.press("End");
  await expect.poll(() => horizontal.getAttribute("aria-valuetext")).toBe("100%");
  await page.keyboard.press("Home");
  await expect.poll(() => viewport.evaluate((element) => element.scrollLeft)).toBe(0);
});

test("column virtualization masks center headers behind the right pinned scrollbar gutter", async ({ page }) => {
  await page.goto("/#LAY-003");

  const viewport = page.locator('[data-layout-viewport="body"]');
  const box = await viewport.boundingBox();
  if (!box) {
    throw new Error("Body viewport was not measurable.");
  }

  await page.mouse.move(box.x + 420, box.y + 80);
  await page.mouse.wheel(1_600, 0);

  const layer = await page.evaluate(() => {
    const status = document.querySelector<HTMLElement>(
      '[data-layout-section="header"] [role="columnheader"][data-source-id="status"]'
    );
    const bodyStatus = document.querySelector<HTMLElement>(
      '[data-layout-section="body"] [data-column-id="status"]'
    );
    const gutter = document.querySelector<HTMLElement>(
      '[data-layout-section="header"] .og-grid__pane--scrollbar-gutter'
    );
    const verticalTrack = document.querySelector<HTMLElement>(".og-grid__scrollbar--vertical");
    const statusRect = status?.getBoundingClientRect();
    const bodyStatusRect = bodyStatus?.getBoundingClientRect();
    const gutterRect = gutter?.getBoundingClientRect();
    const verticalTrackRect = verticalTrack?.getBoundingClientRect();
    const probeY = (statusRect?.top ?? 0) + (statusRect?.height ?? 0) / 2;
    const probeX = gutterRect
      ? gutterRect.left + Math.max(1, gutterRect.width / 2)
      : (statusRect?.right ?? 0) + 2;
    const topAtGutter = document.elementsFromPoint(probeX, probeY)[0];
    const topAtStatus = statusRect
      ? document.elementsFromPoint(statusRect.left + 8, probeY)[0]
      : undefined;
    const horizontalTrack = document.querySelector<HTMLElement>(".og-grid__scrollbar--horizontal");
    const trackRadius = horizontalTrack ? getComputedStyle(horizontalTrack).borderRadius : "";

    return {
      gutterLeft: gutterRect?.left ?? 0,
      statusRight: statusRect?.right ?? 0,
      bodyStatusLeftOffset: Math.abs((statusRect?.left ?? 0) - (bodyStatusRect?.left ?? 100)),
      bodyStatusRightOffset: Math.abs((statusRect?.right ?? 0) - (bodyStatusRect?.right ?? 100)),
      statusGutterOffset: Math.abs((statusRect?.right ?? 0) - (gutterRect?.left ?? 100)),
      verticalTrackOffset: Math.abs((verticalTrackRect?.left ?? 0) - (gutterRect?.left ?? 100)),
      topAtGutterClass: topAtGutter instanceof HTMLElement ? topAtGutter.className : "",
      topAtStatusSourceId: topAtStatus instanceof HTMLElement ? topAtStatus.dataset.sourceId : "",
      trackRadius
    };
  });

  expect(layer.gutterLeft).toBeGreaterThanOrEqual(layer.statusRight - 1);
  expect(layer.bodyStatusLeftOffset).toBeLessThanOrEqual(1);
  expect(layer.bodyStatusRightOffset).toBeLessThanOrEqual(1);
  expect(layer.statusGutterOffset).toBeLessThanOrEqual(1);
  expect(layer.verticalTrackOffset).toBeLessThanOrEqual(1);
  expect(String(layer.topAtGutterClass)).toContain("og-grid__pane--scrollbar-gutter");
  expect(layer.topAtStatusSourceId).toBe("status");
  expect(layer.trackRadius).toBe("0px");
});
