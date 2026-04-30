# Pagination

`F-PAGE` covers client paging, server paging, cursor paging, page size selection,
page group navigation, and append-scroll loading without materializing large datasets
in the browser.

- Client pagination slices the filtered client row model.
- Server pagination sends `page` and `pageSize` to `DataSource.getRows`.
- Cursor pagination also sends `cursor` and stores returned `nextCursor` values by page.
- Append-scroll pagination delegates loading to the infinite row model.
