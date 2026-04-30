import { OneGrid } from "@onegrid/react";
import {
  rendererFoundationColumns,
  rendererFoundationRows,
  rendererFoundationSecurity
} from "./data.js";

export function RendererFoundationReactExample() {
  return (
    <OneGrid
      columns={rendererFoundationColumns}
      data={rendererFoundationRows}
      rowKey="id"
      rowModel="client"
      security={rendererFoundationSecurity}
    />
  );
}
