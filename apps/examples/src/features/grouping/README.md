# Row Grouping

`F-GROUP` covers client row grouping, expand/collapse, sort and filter before grouping,
aggregate values on group rows, group footer rows, and server grouping requests.

The example uses the shared `GridOptions.grouping` and `GridOptions.aggregation` contracts.
Client grouping renders expandable group rows and bottom group footers. Server grouping sends
`groupModel` and `groupKeys` to the data source and renders server-supplied group metadata.

The UX intentionally separates client and server sections. Client controls exercise expand-all,
collapse-all, and reset against `GroupModel.expandedKeys`; group rows show aggregate chips so
totals are readable without relying on one long label.
