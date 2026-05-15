# Security Policy

OneGrid defaults to text-safe rendering and CSP-friendly behavior. Report security issues privately
until a fix is available.

Security-sensitive changes must consider:

- no `eval` or `new Function`
- no inline event handlers
- HTML rendering as explicit opt-in
- sanitizer and Trusted Types integration points
- sanitizer adapter output is post-sanitized at OneGrid's DOM HTML boundary
- React/Vue custom renderer subtrees are application-owned; `dangerouslySetInnerHTML`, `v-html`,
  direct DOM writes, and third-party raw HTML sinks must be sanitized outside OneGrid
- CSP nonce support for style injection
- URL protocol allowlists for link-like renderers
- CSV/TSV clipboard payloads neutralize formula-like string values before spreadsheet handoff
