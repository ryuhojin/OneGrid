# Summary

`F-SUMMARY` covers built-in column summaries, custom summaries, top and bottom summary sections,
client group aggregate labels, and server aggregate values returned with row data.

The example uses `ColumnDef.summary` for labeled summary cells and `GridOptions.aggregation` for
group and server aggregate requests. Client summary is rendered at the top, while the server
aggregate summary is rendered at the bottom. React and Vue pass the same core contracts through to
the DOM renderer.
