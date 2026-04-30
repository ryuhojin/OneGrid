# Menus

`F-MENU` covers the shared menu surface for header buttons, column actions, column filter panels,
and cell context menus.

The example keeps menu logic in `@onegrid/core` and lets `@onegrid/dom` own overlay positioning,
focus trapping, pointer context menus, and keyboard context menus. React and Vue pass the same
`GridOptions.contextMenu` contract through without reimplementing menu behavior.
