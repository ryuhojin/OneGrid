import { expect, test } from "@playwright/test";
import type { BrowserContext, Page } from "@playwright/test";

test("clipboard example copies selected merged range with covered blanks", async ({ page }) => {
  await page.goto("/#F-CLIP");
  await installCopyProbe(page);

  await cell(page, "CLIP-0001", "region").click();
  await page.keyboard.down("Shift");
  await cell(page, "CLIP-0002", "program").click();
  await page.keyboard.up("Shift");
  await page.keyboard.press(shortcut("C"));

  await expect.poll(() => readCopyProbe(page)).toBe(
    "Capital\tTreasury Office\tBudget approval\r\n\t\tBond issuance"
  );
});

test("clipboard example copies selected rows with headers through public API", async ({ page, context }) => {
  await grantClipboard(context);
  await page.goto("/#F-CLIP");

  await page.getByLabel("Select row CLIP-0003").check();
  await page.getByRole("button", { name: "Copy with headers" }).click();

  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain(
    "ID\tRegion\tAgency\tProgram\tAmount\tMemo\tOwner\tStatus\r\nCLIP-0003"
  );
});

test("clipboard example pastes ranges and reports validation failures", async ({ page }) => {
  await page.goto("/#F-CLIP");

  await page.getByRole("button", { name: "Paste sample" }).click();
  await expect(cell(page, "CLIP-0004", "program")).toHaveText("Grant review");
  await expect(cell(page, "CLIP-0004", "amount")).toHaveText("410000");
  await expect(summaryValue(page, "Pasted")).toHaveText("2");

  await page.getByRole("button", { name: "Paste invalid amount" }).click();
  await expect(summaryValue(page, "Validation")).toHaveText("Amount must be greater than 0");
  await expect(cell(page, "CLIP-0005", "amount")).toHaveText("530000");
});

function cell(page: Page, rowKey: string, field: string) {
  return page.locator(`[data-edit-row-key="${rowKey}"][data-field="${field}"]`).first();
}

function summaryValue(page: Page, label: string) {
  return page
    .getByLabel("Clipboard summary")
    .locator("dt", { hasText: label })
    .locator("xpath=following-sibling::dd[1]");
}

async function installCopyProbe(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as unknown as { __onegridCopied?: string }).__onegridCopied = "";
    document.addEventListener("copy", (event) => {
      (window as unknown as { __onegridCopied?: string }).__onegridCopied =
        event.clipboardData?.getData("text/plain") ?? "";
    });
  });
}

async function readCopyProbe(page: Page): Promise<string> {
  return page.evaluate(() => (window as unknown as { __onegridCopied?: string }).__onegridCopied ?? "");
}

async function grantClipboard(context: BrowserContext): Promise<void> {
  await context.grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: "http://127.0.0.1:4174"
  });
}

function shortcut(key: string): string {
  return `${process.platform === "darwin" ? "Meta" : "Control"}+${key}`;
}
