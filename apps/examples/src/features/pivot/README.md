# F-PIVOT Pivot

`F-PIVOT` validates the shared pivot model across client and server row models.

- Client pivot derives dynamic grouped columns from `PivotModel.columns`.
- Row fields remain visible as normal grid columns.
- Value fields support aggregate functions and labels.
- `totals: "both"` adds row and column totals.
- `subtotals: true` adds subtotal rows for the first row field.
- Server pivot forwards the same `pivotModel` through `DataSource.getRows`.

The pivot panel is a draft/apply builder. It supports drag/drop and keyboard button movement across
row, column, and value buckets, then applies changes through `GridApi.setPivotModel()` so client and
server pivot stay on the same public contract.
