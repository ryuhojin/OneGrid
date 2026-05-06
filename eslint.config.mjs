import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/build/**",
      "**/.docusaurus/**",
      "test-results/**",
      "playwright-report/**",
      "node_modules/**",
      "pnpm-lock.yaml"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { "prefer": "type-imports" }
      ],
      "@typescript-eslint/no-empty-object-type": "off"
    }
  },
  {
    files: ["**/*.cjs", "*.config.{js,mjs,ts}", "apps/docs/*.js"],
    languageOptions: {
      globals: globals.node
    }
  }
);
