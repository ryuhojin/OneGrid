import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { expect, type Page } from "@playwright/test";

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

export async function expectNoAxeViolations(page: Page, selector: string): Promise<void> {
  await page.addScriptTag({ content: axeSource });
  const violations = await page.evaluate(async (targetSelector) => {
    const target = document.querySelector(targetSelector);
    if (!target) {
      throw new Error(`Axe target was not found: ${targetSelector}`);
    }

    const axe = (window as unknown as {
      axe: {
        run(
          context: Element,
          options?: unknown
        ): Promise<{ violations: readonly AxeViolationResult[] }>;
      };
    }).axe;

    const result = await axe.run(target);
    return result.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      targets: violation.nodes.flatMap((node) => node.target)
    }));
  }, selector);

  expect(violations).toEqual([]);
}

interface AxeViolationResult {
  readonly id: string;
  readonly impact: string | null;
  readonly help: string;
  readonly nodes: readonly { readonly target: readonly string[] }[];
}
