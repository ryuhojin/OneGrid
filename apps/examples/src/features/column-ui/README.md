# COL-003 Column UI Features

This example exercises the first interactive column UI surface:

- pointer resize and double-click auto size
- column header drag/drop reorder
- header column menu actions
- show/hide and pin/unpin through the columns tool panel

The DOM renderer delegates column state changes to `@onegrid/core` state transformers and then
rerenders from the normalized column model.
