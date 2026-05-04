import { OneGridMenu } from "./oneGridMenu.js";
import type { GridApi } from "@onegrid/core";

export type { DomGridOptions } from "./oneGridTypes.js";

export class OneGrid<TData = unknown> extends OneGridMenu<TData> implements GridApi<TData> {}
