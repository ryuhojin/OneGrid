import { expect, test } from "@playwright/test";
import type { Download, Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

test("export example creates CSV, selected CSV, XLSX, PDF, and print payloads", async ({ page }) => {
  await page.goto("/#F-EXPORT");

  await clickAndDownload(page, "Export CSV", "onegrid-export.csv");
  await expect(summaryValue(page, "Format")).toHaveText("csv");
  await expect(summaryValue(page, "Media type")).toHaveText("text/csv;charset=utf-8");
  await expect(summaryValue(page, "Preview")).toContainText("Export review window");

  await clickAndDownload(page, "Export selected CSV", "onegrid-export.csv");
  await expect(summaryValue(page, "Preview")).toContainText("Budget approval");
  await expect(summaryValue(page, "Preview")).not.toContainText("EXP-0004");

  const xlsxDownload = await clickAndDownload(page, "Export XLSX", "onegrid-export.xlsx");
  const xlsxContent = await readDownload(xlsxDownload);
  expect(xlsxContent).toContain("styles.xml");
  expect(xlsxContent).toContain("FFD1D5DB");
  expect(xlsxContent).toContain("<pane ySplit=\"3\"");
  expect(xlsxContent).toContain("<autoFilter ref=\"A3:H8\"");
  expect(xlsxContent).toContain("<pageSetup orientation=\"landscape\"");
  expect(xlsxContent).toContain("<c r=\"F1\" s=\"1\"");
  expect(xlsxContent).toContain("<c r=\"B8\" s=\"3\"");
  expect(xlsxContent).toContain("<c r=\"G4\" s=\"2\"><v>1200</v></c>");
  await expect(summaryValue(page, "Media type")).toHaveText(
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  await expect(summaryValue(page, "Preview")).toContainText("onegrid-export.xlsx");

  const pdfDownload = await clickAndDownload(page, "Export PDF", "onegrid-export.pdf");
  const pdfContent = await readDownload(pdfDownload);
  expect(pdfContent).toContain("OneGrid Export");
  expect(pdfContent).toContain("Page 1 of 1");
  expect(pdfContent).toContain(" re S");
  await expect(summaryValue(page, "Media type")).toHaveText("application/pdf");

  const printDownload = await clickAndDownload(page, "Print layout", "onegrid-export.html");
  expectPrintHeaderLayout(await readDownload(printDownload));
  await expect(summaryValue(page, "Media type")).toHaveText("text/html");
  await expect(summaryValue(page, "Preview")).toContainText("data-onegrid-print-layout");
});

test("export example imports CSV and XLSX files through public API", async ({ page }) => {
  await page.goto("/#F-EXPORT");
  const standardGrid = page.getByRole("grid", { name: "Export import grid" });

  await expect(page.getByRole("link", { name: "CSV test file" }))
    .toHaveAttribute("download", "export-testFile.csv");
  await page.getByLabel("Import CSV file").setInputFiles(resolve("apps/examples/public/export-testFile.csv"));
  await expect(summaryValue(page, "Imported rows")).toHaveText("2");
  await expect(standardGrid).not.toContainText("EXP-0001");
  await expect(standardGrid).toContainText("FILE-CSV-0002");
  const printDownload = await clickAndDownload(page, "Print layout", "onegrid-export.html");
  expectPrintHeaderLayout(await readDownload(printDownload));

  await expect(page.getByRole("link", { name: "XLSX test file" }))
    .toHaveAttribute("download", "export-testFile.xlsx");
  await page.getByLabel("Import XLSX file").setInputFiles(resolve("apps/examples/public/export-testFile.xlsx"));
  await expect(summaryValue(page, "Preview")).toHaveText("Imported XLSX file: export-testFile.xlsx");
  await expect(summaryValue(page, "Imported rows")).toHaveText("2");
  await expect(standardGrid).not.toContainText("FILE-CSV-0001");
  await expect(standardGrid).toContainText("FILE-XLS-0002");
});

test("export example includes paged-row and wide-column output scenarios", async ({ page }) => {
  await page.goto("/#F-EXPORT");

  const pagedPdf = await clickAndDownload(page, "Export paged PDF", "onegrid-paged-export.pdf");
  const pagedPdfContent = await readDownload(pagedPdf);
  expect(pagedPdfContent).toContain("OneGrid Paged Export");
  expect(pagedPdfContent).toContain("Page 1 of");
  expect(pagedPdfContent).toContain("Page 2 of");
  expect(pagedPdfContent).toContain("PAG-0064");

  const wideXlsx = await clickAndDownload(page, "Export wide XLSX", "onegrid-wide-export.xlsx");
  const wideXlsxContent = await readDownload(wideXlsx);
  expect(wideXlsxContent).toContain("<dimension ref=\"A1:T9\"");
  expect(wideXlsxContent).toContain("Metric 16");

  const widePdf = await clickAndDownload(page, "Export wide PDF", "onegrid-wide-export.pdf");
  const widePdfContent = await readDownload(widePdf);
  expect(widePdfContent).toContain("OneGrid Wide Export");
  expect(widePdfContent).toContain("Page 1 of 3");
  expect(widePdfContent).toContain("Page 3 of 3");
  expect(widePdfContent).toContain("Metric 16");
});

test("XLSX file import replaces rows with raw file values", async ({ page }) => {
  await page.goto("/#F-EXPORT");
  const standardGrid = page.getByRole("grid", { name: "Export import grid" });

  await page.getByLabel("Import XLSX file").setInputFiles(resolve("apps/examples/public/export-testFile.xlsx"));

  await expect(summaryValue(page, "Imported rows")).toHaveText("2");
  await expect(standardGrid).not.toContainText("EXP-0001");
  await expect(standardGrid).toContainText("FILE-XLS-0002");
  await expect(standardGrid).toContainText("1420");
  await expect(standardGrid).toContainText("Approved");
});

function summaryValue(page: Page, label: string) {
  return page
    .getByLabel("Export import summary")
    .locator("dt", { hasText: label })
    .locator("xpath=following-sibling::dd[1]");
}

async function clickAndDownload(page: Page, label: string, filename: string): Promise<Download> {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: label }).click()
  ]);
  expect(download.suggestedFilename()).toBe(filename);
  return download;
}

async function readDownload(download: Download): Promise<string> {
  const path = await download.path();
  expect(path).not.toBeNull();
  return readFile(path as string, "latin1");
}

function expectPrintHeaderLayout(content: string): void {
  expect(content).toContain(
    "<tr><th rowspan=\"3\">ID</th><th rowspan=\"3\">Region</th><th colspan=\"4\">Export review window</th><th rowspan=\"3\">Amount</th><th rowspan=\"3\">Status</th></tr>"
  );
  expect(content).toContain("<tr><th colspan=\"4\">Workflow</th></tr>");
  expect(content).toContain("<tr><th>Agency</th><th>Program</th><th>Memo</th><th>Owner</th></tr>");
}
