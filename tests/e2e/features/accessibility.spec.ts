import { expect, test } from "@playwright/test";

test("accessibility example renders labeled grid and keyboard menu behavior", async ({ page }) => {
  await page.goto("/#DOM-003");

  const grid = page.getByRole("grid", { name: "Accessibility contract grid" });
  await expect(grid).toBeVisible();
  await expect(grid.getByRole("columnheader", { name: "Status" })).toBeVisible();
  await expect(grid.getByRole("gridcell", { name: "AX-0001" })).toBeVisible();

  await grid.getByRole("gridcell", { name: "AX-0001" }).click();
  await page.evaluate(() => {
    const button = document.querySelector("[aria-label='Column menu Department']");
    button?.addEventListener("pointerdown", () => {
      (window as typeof window & { __ogActiveAtMenuPointerDown?: number })
        .__ogActiveAtMenuPointerDown = document.querySelectorAll("[data-focus-active='true']").length;
    }, { once: true });
  });
  await page.getByLabel("Column menu Department").click();
  await expect(page.getByRole("menu", { name: "Department column menu" })).toBeVisible();
  await expect.poll(() =>
    page.evaluate(() => (window as typeof window & { __ogActiveAtMenuPointerDown?: number })
      .__ogActiveAtMenuPointerDown)
  ).toBe(0);
  await expect(page.locator('[data-focus-active="true"]')).toHaveCount(0);
  await expect(page.getByRole("menuitem", { name: "Auto size Department" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Hide Department" })).toBeFocused();
});

test("header menu does not transiently activate the first body cell", async ({ page }) => {
  await page.goto("/#DOM-003");

  await page.evaluate(() => {
    const grid = document.querySelector("[role='grid']");
    const activations: string[] = [];
    const observer = new MutationObserver(() => {
      const active = document.querySelector("[data-focus-active='true']");
      if (active?.textContent) {
        activations.push(active.textContent.trim());
      }
    });
    if (grid) {
      observer.observe(grid, {
        attributeFilter: ["data-focus-active"],
        attributes: true,
        subtree: true
      });
    }
    const targetWindow = window as typeof window & {
      __ogFocusActivations?: string[];
      __ogFocusObserver?: MutationObserver;
    };
    targetWindow.__ogFocusActivations = activations;
    targetWindow.__ogFocusObserver = observer;
  });

  await page.getByLabel("Column menu Department").click();
  await expect(page.getByRole("menuitem", { name: "Auto size Department" })).toBeFocused();

  const activations = await page.evaluate(() => {
    const targetWindow = window as typeof window & {
      __ogFocusActivations?: string[];
      __ogFocusObserver?: MutationObserver;
    };
    targetWindow.__ogFocusObserver?.disconnect();
    return targetWindow.__ogFocusActivations ?? [];
  });
  expect(activations).toEqual([]);
});

test("plain header click does not activate the first body cell", async ({ page }) => {
  await page.goto("/#DOM-003");

  await page.evaluate(() => {
    const activations: string[] = [];
    const observer = new MutationObserver(() => {
      const active = document.querySelector("[data-focus-active='true']");
      if (active?.textContent) {
        activations.push(active.textContent.trim());
      }
    });
    observer.observe(document.querySelector("[role='grid']") as HTMLElement, {
      attributeFilter: ["data-focus-active"],
      attributes: true,
      subtree: true
    });
    const targetWindow = window as typeof window & {
      __ogHeaderFocusActivations?: string[];
      __ogHeaderFocusObserver?: MutationObserver;
    };
    targetWindow.__ogHeaderFocusActivations = activations;
    targetWindow.__ogHeaderFocusObserver = observer;
  });

  await page.getByRole("columnheader", { name: "Service" }).click({ position: { x: 16, y: 16 } });
  await expect(page.locator('[data-focus-active="true"]')).toHaveCount(0);

  const activations = await page.evaluate(() => {
    const targetWindow = window as typeof window & {
      __ogHeaderFocusActivations?: string[];
      __ogHeaderFocusObserver?: MutationObserver;
    };
    targetWindow.__ogHeaderFocusObserver?.disconnect();
    return targetWindow.__ogHeaderFocusActivations ?? [];
  });
  expect(activations).toEqual([]);
});

test("columns panel keeps center columns visible when hiding a left pinned column", async ({ page }) => {
  await page.goto("/#DOM-003");

  await page.getByRole("button", { name: "Columns" }).click();
  await page.getByRole("checkbox", { name: "ID" }).click();

  await expect(page.getByRole("columnheader", { name: "ID" })).toHaveCount(0);
  await expect(page.getByRole("columnheader", { name: "Department" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Service" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Owner" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Status" })).toBeVisible();
  await expect(page.getByRole("gridcell", { name: "Budget approval" })).toBeVisible();

  const separation = await page.evaluate(() => {
    const owner = document
      .querySelector('[role="columnheader"][data-source-id="owner"]')
      ?.getBoundingClientRect();
    const status = document
      .querySelector('[role="columnheader"][data-source-id="status"]')
      ?.getBoundingClientRect();
    return owner && status ? status.left - owner.right : 0;
  });
  expect(separation).toBeGreaterThanOrEqual(0);
});
