import { useRef } from "react";
import { OneGrid } from "@onegrid/react";
import type { OneGridHandle } from "@onegrid/react";
import { publicSiOptions, publicSiRows } from "./data.js";
import type { PublicSiRow } from "./data.js";

export function QspPublicSiReactExample() {
  const grid = useRef<OneGridHandle<PublicSiRow>>(null);
  return (
    <>
      <div className="example-actions">
        <input
          aria-label="React public service quick filter"
          type="search"
          placeholder="Filter public services"
          onChange={(event) => grid.current?.setFilterModel({ quickText: event.currentTarget.value })}
        />
      </div>
      <OneGrid ref={grid} {...publicSiOptions} />
      <dl className="example-inspector" aria-label="React public sector SI summary">
        <dt>Scenario</dt>
        <dd>public-sector service desk</dd>
        <dt>Rows</dt>
        <dd>{publicSiRows.length}</dd>
      </dl>
    </>
  );
}
