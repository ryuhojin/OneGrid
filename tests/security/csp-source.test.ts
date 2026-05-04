import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sourceRoots = [
  "packages/core/src",
  "packages/dom/src",
  "packages/react/src",
  "packages/vue/src"
];

describe("CSP source guardrails", () => {
  it("does not use eval or new Function in package sources", () => {
    for (const file of collectSourceFiles(sourceRoots)) {
      const content = readFileSync(file, "utf8");
      expect(content, file).not.toMatch(/\beval\s*\(/u);
      expect(content, file).not.toMatch(/\bnew\s+Function\s*\(/u);
    }
  });

  it("does not register inline event handler attributes in package sources", () => {
    for (const file of collectSourceFiles(sourceRoots)) {
      const content = readFileSync(file, "utf8");
      expect(content, file).not.toMatch(/\.setAttribute\(\s*["']on[a-z]+/iu);
    }
  });
});

function collectSourceFiles(roots: readonly string[]): readonly string[] {
  return roots.flatMap((root) => collectFiles(root));
}

function collectFiles(dir: string): readonly string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return collectFiles(path);
    }
    return /\.(ts|tsx|vue)$/u.test(entry.name) ? [path] : [];
  });
}
