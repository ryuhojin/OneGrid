import { OneGrid } from "@onegrid/react";
import {
  createMenuContextMenu,
  menuClipboard,
  menuColumnUi,
  menuColumns,
  menuEditing,
  menuFiltering,
  menuRows,
  menuSelection
} from "./data.js";

const contextMenu = createMenuContextMenu();

export function MenusReactExample() {
  return (
    <>
      <OneGrid
        columns={menuColumns}
        data={menuRows}
        rowKey="id"
        rowModel="client"
        columnUi={menuColumnUi}
        filtering={menuFiltering}
        selection={menuSelection}
        editing={menuEditing}
        clipboard={menuClipboard}
        contextMenu={contextMenu}
        merge={{ enabled: true }}
      />
      <dl className="example-inspector" aria-label="Menu summary">
        <dt>Menu surfaces</dt>
        <dd>Header menu, column menu actions, filter menu, and cell context menu</dd>
        <dt>Wrapper behavior</dt>
        <dd>React forwards the shared contextMenu GridOptions contract to @onegrid/dom</dd>
      </dl>
    </>
  );
}
