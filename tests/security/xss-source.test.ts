import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sourceRoots = [
  "packages/core/src",
  "packages/dom/src",
  "packages/react/src",
  "packages/vue/src"
];

describe("XSS source guardrails", () => {
  it("keeps innerHTML writes isolated to the audited html security boundary", () => {
    const writers = collectSourceFiles(sourceRoots).filter((file) =>
      /\.innerHTML\s*=/u.test(readFileSync(file, "utf8"))
    );

    expect(writers).toEqual(["packages/dom/src/grid/htmlSecurity.ts"]);
  });

  it("does not assign inline event handler properties in package sources", () => {
    for (const file of collectSourceFiles(sourceRoots)) {
      const content = readFileSync(file, "utf8");
      expect(content, file).not.toMatch(/\.on[a-z]+\s*=/iu);
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
