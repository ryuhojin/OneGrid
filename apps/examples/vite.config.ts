import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

const rootDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(rootDir, "../..");

export default defineConfig({
  plugins: [react(), vue()],
  resolve: {
    alias: {
      "@onegrid/core": resolve(repoRoot, "packages/core/src/index.ts"),
      "@onegrid/dom": resolve(repoRoot, "packages/dom/src/index.ts"),
      "@onegrid/react": resolve(repoRoot, "packages/react/src/index.ts"),
      "@onegrid/themes/default.css": resolve(repoRoot, "packages/themes/src/default.css"),
      "@onegrid/vue": resolve(repoRoot, "packages/vue/src/index.ts")
    }
  },
  server: {
    host: "127.0.0.1",
    port: 4174
  }
});
