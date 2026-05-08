import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { examples } from "../../apps/examples/src/catalog.js";
import type { ExampleCatalogItem } from "../../apps/examples/src/catalog.js";

type VariantName = ExampleCatalogItem["variants"][number];

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const examplesSrcRoot = resolve(repoRoot, "apps/examples/src");
const featureRoot = resolve(examplesSrcRoot, "features");
const e2eRoot = resolve(repoRoot, "tests/e2e/features");

const requiredVariants: readonly VariantName[] = ["vanilla", "react", "vue"];
const variantFiles: Readonly<Record<VariantName, string>> = {
  vanilla: "vanilla.ts",
  react: "react.tsx",
  vue: "vue.vue"
};

const standaloneFrameworkPages = [
  {
    feature: "react-wrapper",
    entry: "apps/examples/react.html",
    spec: "tests/e2e/features/react-wrapper.spec.ts",
    source: "apps/examples/src/features/react-wrapper/react.tsx"
  },
  {
    feature: "vue-wrapper",
    entry: "apps/examples/vue.html",
    spec: "tests/e2e/features/vue-wrapper.spec.ts",
    source: "apps/examples/src/features/vue-wrapper/vue.vue"
  }
] as const;

describe("example catalog integrity", () => {
  it("keeps all hash-routed feature examples registered and mounted", () => {
    const catalogFeatures = new Set(examples.map((example) => example.feature));
    const standaloneFeatures = new Set(
      standaloneFrameworkPages.map((page) => page.feature)
    );
    const unregisteredFeatures = listFeatureDirectories()
      .filter((feature) => !standaloneFeatures.has(feature))
      .filter((feature) => !catalogFeatures.has(feature));

    expect(unregisteredFeatures).toEqual([]);
    expect(findDuplicateIds()).toEqual([]);

    const mainSource = readFileSync(resolve(examplesSrcRoot, "main.ts"), "utf8");
    const unmountedExamples = examples
      .filter((example) => !mainSource.includes(`"${example.id}":`))
      .map(formatExample);

    expect(unmountedExamples).toEqual([]);
  });

  it("keeps every catalog example available in vanilla, React, and Vue", () => {
    const missingVariantEvidence = examples.flatMap((example) =>
      requiredVariants.flatMap((variant) => {
        const variantLabel = `${formatExample(example)} ${variant}`;
        if (!example.variants.includes(variant)) {
          return [`${variantLabel}: variant not declared`];
        }

        const variantFile = join(featureRoot, example.feature, variantFiles[variant]);
        return existsSync(variantFile) ? [] : [`${variantLabel}: ${variantFile}`];
      })
    );

    expect(missingVariantEvidence).toEqual([]);
  });

  it("keeps every catalog feature documented with a README", () => {
    const missingReadmes = listCatalogFeatures()
      .filter((feature) => !existsSync(join(featureRoot, feature, "README.md")))
      .map((feature) => `${feature}/README.md`);

    expect(missingReadmes).toEqual([]);
  });

  it("keeps every catalog example covered by Playwright E2E", () => {
    const e2eCorpus = collectFiles(e2eRoot, /\.spec\.ts$/u).map((file) => ({
      file,
      content: readFileSync(file, "utf8")
    }));
    const missingE2e = examples
      .filter((example) => !hasE2eCoverage(example, e2eCorpus))
      .map(formatExample);

    expect(missingE2e).toEqual([]);
  });

  it("keeps standalone framework wrapper examples explicitly covered", () => {
    const missingStandaloneEvidence = standaloneFrameworkPages.flatMap((page) =>
      [page.entry, page.spec, page.source].filter(
        (path) => !existsSync(resolve(repoRoot, path))
      )
    );

    expect(missingStandaloneEvidence).toEqual([]);
  });
});

function listFeatureDirectories(): readonly string[] {
  return readdirSync(featureRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function listCatalogFeatures(): readonly string[] {
  return Array.from(new Set(examples.map((example) => example.feature))).sort();
}

function findDuplicateIds(): readonly string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const example of examples) {
    if (seen.has(example.id)) {
      duplicates.add(example.id);
    }
    seen.add(example.id);
  }

  return Array.from(duplicates).sort();
}

function hasE2eCoverage(
  example: ExampleCatalogItem,
  e2eCorpus: readonly { readonly file: string; readonly content: string }[]
): boolean {
  const directSpec = join(e2eRoot, `${example.feature}.spec.ts`);
  if (existsSync(directSpec)) {
    return true;
  }

  return e2eCorpus.some(({ content }) => content.includes(`#${example.id}`));
}

function collectFiles(dir: string, pattern: RegExp): readonly string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return collectFiles(path, pattern);
    }
    return pattern.test(entry.name) ? [path] : [];
  });
}

function formatExample(example: ExampleCatalogItem): string {
  return `${example.id} (${example.feature})`;
}
