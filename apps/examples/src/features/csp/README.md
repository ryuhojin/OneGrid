# CSP

SEC-001 verifies that OneGrid runs without `eval`, `new Function`, inline event
handlers, or un-nonced runtime style tags. The example mounts one grid with a
nonce-backed runtime theme and another grid with `disableStyleInjection`.
