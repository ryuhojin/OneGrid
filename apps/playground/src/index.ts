import type { GridOptions } from "@onegrid/core";

export const playgroundOptions: GridOptions = {
  columns: [{ field: "id", headerName: "ID" }],
  data: [{ id: "PLAY-001" }],
  rowModel: "client"
};
