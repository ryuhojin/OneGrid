# Export / Import

`F-EXPORT` covers CSV export/import, XLSX export/import, PDF export, print HTML layout, merged
headers, merged cells, and selected range export.

The example uses `GridApi.exportData()` and `GridApi.importData()` from the DOM renderer. React and
Vue pass the same `GridOptions.export` and `GridOptions.import` contracts through without
reimplementing export logic.

Vanilla import controls use real file inputs. Test files are served from:

- `/export-testFile.csv`
- `/export-testFile.xlsx`
