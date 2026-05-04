import { OneGrid } from "@onegrid/react";
import {
  xssDefenseColumns,
  xssDefenseRows,
  xssDefenseSecurity
} from "./data.js";

export function XssDefenseReactExample() {
  return (
    <OneGrid
      columns={xssDefenseColumns}
      data={xssDefenseRows}
      rowKey="id"
      rowModel="client"
      security={xssDefenseSecurity}
    />
  );
}
