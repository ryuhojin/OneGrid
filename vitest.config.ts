import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@onegrid/adapters": resolve(__dirname, "packages/adapters/src/index.ts"),
      "@onegrid/adapter-pdf-pdfkit": resolve(__dirname, "packages/adapter-pdf-pdfkit/src/index.ts"),
      "@onegrid/adapter-xlsx-exceljs": resolve(__dirname, "packages/adapter-xlsx-exceljs/src/index.ts"),
      "@onegrid/core": resolve(__dirname, "packages/core/src/index.ts"),
      "@onegrid/dom": resolve(__dirname, "packages/dom/src/index.ts"),
      "@onegrid/react": resolve(__dirname, "packages/react/src/index.ts"),
      "@onegrid/testing": resolve(__dirname, "packages/testing/src/index.ts"),
      "@onegrid/vue": resolve(__dirname, "packages/vue/src/index.ts")
    }
  },
  test: {
    environment: "jsdom",
    exclude: ["**/node_modules/**", "**/dist/**", "tests/e2e/**", "tests/a11y/**"],
    include: [
      "packages/**/test/**/*.test.{ts,tsx}",
      "tests/catalog/**/*.test.ts",
      "tests/packaging/**/*.test.ts",
      "tests/perf/**/*.test.ts",
      "tests/security/**/*.test.ts"
    ]
  }
});
