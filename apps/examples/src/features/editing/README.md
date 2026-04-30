# F-EDIT Editing

This example exercises the shared editing contract across vanilla, React, and Vue.

- Core lifecycle resolves editable cells, parsers, validators, value setters, and commit/cancel results.
- DOM opens an accessible editor overlay on Enter, F2, printable keys, API `startEdit`, or cell double click.
- The vanilla screen uses batch commit mode: accepted cell edits stay pending until Commit changes, while Cancel changes restores the pending history.
- Editors covered: text, number, date, datetime, checkbox, select, multi-select, radio, textarea, autocomplete, and custom.
- Active uses a basic checkbox display/editor, and Priority uses a basic radio editor.
