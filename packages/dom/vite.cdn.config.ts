import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const packageRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: resolve(packageRoot, "src/cdn.ts"),
      fileName: () => "onegrid.umd.js",
      formats: ["umd"],
      name: "OneGrid"
    },
    minify: false,
    rollupOptions: {
      output: {
        exports: "named"
      }
    },
    sourcemap: true
  }
});
