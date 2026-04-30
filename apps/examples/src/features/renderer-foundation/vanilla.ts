import { OneGrid } from "@onegrid/dom";
import {
  rendererFoundationColumns,
  rendererFoundationRows,
  rendererFoundationSecurity
} from "./data.js";
import type { RendererFoundationRow } from "./data.js";

export function mountRendererFoundationExample(el: HTMLElement): OneGrid<RendererFoundationRow> {
  return new OneGrid<RendererFoundationRow>({
    el,
    columns: rendererFoundationColumns,
    data: rendererFoundationRows,
    rowKey: "id",
    rowModel: "client",
    security: rendererFoundationSecurity
  });
}
