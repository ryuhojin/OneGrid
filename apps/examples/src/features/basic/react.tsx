import { OneGrid } from "@onegrid/react";
import { basicColumns, basicRows } from "./data.js";

export function BasicReactExample() {
  return <OneGrid columns={basicColumns} data={basicRows} rowModel="client" />;
}
