import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

interface PackageJson {
  readonly name: string;
  readonly license?: string;
  readonly sideEffects?: boolean | readonly string[];
  readonly exports?: {
    readonly ".": {
      readonly types: string;
      readonly import: string;
    };
    readonly [subpath: string]: unknown;
  };
  readonly files?: readonly string[];
  readonly peerDependencies?: Readonly<Record<string, string>>;
  readonly unpkg?: string;
  readonly jsdelivr?: string;
}

const repoRoot = process.cwd();
const packagePaths = [
  "packages/adapter-pdf-pdfkit/package.json",
  "packages/adapter-xlsx-exceljs/package.json",
  "packages/adapters/package.json",
  "packages/core/package.json",
  "packages/dom/package.json",
  "packages/pagination/package.json",
  "packages/react/package.json",
  "packages/testing/package.json",
  "packages/themes/package.json",
  "packages/vue/package.json"
];

describe("package distribution metadata", () => {
  it.each(packagePaths)("%s has publish-safe metadata", (packagePath) => {
    const pkg = readPackageJson(packagePath);

    expect(pkg.license).toBe("UNLICENSED");
    expect(pkg.files).toContain("dist");
    expect(pkg.exports?.["."]).toEqual({
      types: "./dist/index.d.ts",
      import: "./dist/index.js"
    });
    expect(pkg.sideEffects).toBeDefined();
  });

  it("declares framework peer dependencies only on wrappers", () => {
    expect(readPackageJson("packages/react/package.json").peerDependencies).toMatchObject({
      react: ">=18.0.0",
      "react-dom": ">=18.0.0"
    });
    expect(readPackageJson("packages/vue/package.json").peerDependencies).toMatchObject({
      vue: ">=3.4.0"
    });
  });

  it("declares CDN entrypoint metadata for the DOM package", () => {
    const pkg = readPackageJson("packages/dom/package.json");

    expect(pkg.unpkg).toBe("./dist/onegrid.umd.js");
    expect(pkg.jsdelivr).toBe("./dist/onegrid.umd.js");
  });

  it("exports built CSS artifacts and preserves CSS side effects", () => {
    const pkg = readPackageJson("packages/themes/package.json");

    expect(pkg.sideEffects).toEqual(["./dist/*.css", "./src/*.css"]);
    for (const file of ["tokens", "default", "clean", "compact", "dark", "high-contrast"]) {
      expect(pkg.exports?.[`./${file}.css`]).toEqual({
        style: `./dist/${file}.css`,
        default: `./dist/${file}.css`
      });
    }
  });
});

function readPackageJson(packagePath: string): PackageJson {
  return JSON.parse(readFileSync(path.join(repoRoot, packagePath), "utf8")) as PackageJson;
}
