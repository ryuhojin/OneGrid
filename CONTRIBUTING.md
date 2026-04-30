# Contributing to OneGrid

OneGrid targets an enterprise 1.0 release. Changes must preserve the `core -> dom -> wrapper`
architecture, keep public APIs stable, and include tests and documentation evidence in
`CHECKLIST.md`.

Before opening a change, run:

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:e2e
pnpm build
pnpm docs:build
```

Do not introduce `eval`, `new Function`, inline event handlers, or renderer paths that treat user
strings as HTML by default.
