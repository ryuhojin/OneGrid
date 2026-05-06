# Export / Import

`F-EXPORT` covers CSV export/import, XLSX export/import, PDF export, print HTML layout, merged
headers, merged cells, selected range export, paged row output, and wide-column output.

The example uses `GridApi.exportData()` and `GridApi.importData()` from the DOM renderer. React and
Vue pass the same `GridOptions.export` and `GridOptions.import` contracts through without
reimplementing export logic.

Vanilla import controls use real file inputs. Test files are served from:

- `/export-testFile.csv`
- `/export-testFile.xlsx`

The vanilla page renders three export scenarios:

- standard visual merge export/import
- paged row export with enough rows to force PDF page breaks
- wide column export with enough columns to force horizontal PDF pages and wide XLSX output
