import { OneGrid } from "@onegrid/react";
import { cspColumns, cspNonce, cspRows, cspTheme } from "./data.js";

export function CspReactExample() {
  return (
    <>
      <OneGrid
        columns={cspColumns}
        data={cspRows}
        rowKey="id"
        theme={cspTheme}
        security={{ csp: { nonce: cspNonce } }}
        accessibility={{ label: "React CSP locked grid" }}
      />
      <OneGrid
        columns={cspColumns}
        data={cspRows.slice(0, 1)}
        rowKey="id"
        theme={cspTheme}
        security={{ csp: { disableStyleInjection: true } }}
        accessibility={{ label: "React CSP disabled style grid" }}
      />
    </>
  );
}
