# Security Policy

OneGrid defaults to text-safe rendering and CSP-friendly behavior. Report security issues privately
until a fix is available.

Security-sensitive changes must consider:

- no `eval` or `new Function`
- no inline event handlers
- HTML rendering as explicit opt-in
- sanitizer and Trusted Types integration points
- CSP nonce support for style injection
- URL protocol allowlists for link-like renderers
