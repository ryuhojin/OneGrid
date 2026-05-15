import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const SECURITY_SPECS = [
  "tests/e2e/features/csp.spec.ts",
  "tests/e2e/features/xss-defense.spec.ts",
  "tests/e2e/features/trusted-types.spec.ts",
  "tests/e2e/features/clipboard.spec.ts",
  "tests/e2e/features/export.spec.ts",
  "tests/e2e/packaging/package-csp.spec.ts"
];

const BROWSERS = [
  { name: "chromium", required: true },
  { name: "webkit", required: true },
  { name: "chrome", appPath: "/Applications/Google Chrome.app" },
  { name: "edge", appPath: "/Applications/Microsoft Edge.app" }
];

const skipBuild = process.argv.includes("--skip-build");

if (!skipBuild) {
  run("pnpm", ["build"]);
}

let ran = 0;
for (const browser of BROWSERS) {
  if (!isBrowserAvailable(browser)) {
    console.log(`[security-matrix] skip ${browser.name}: browser channel is not installed.`);
    continue;
  }
  ran += 1;
  run("pnpm", [
    "exec",
    "playwright",
    "test",
    "--config",
    "playwright.config.ts",
    ...SECURITY_SPECS,
    `--project=${browser.name}`
  ]);
}

if (ran === 0) {
  throw new Error("No browser security matrix projects were available.");
}

function isBrowserAvailable(browser) {
  return browser.required === true || !browser.appPath || existsSync(browser.appPath);
}

function run(command, args) {
  console.log(`[security-matrix] ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit"
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
