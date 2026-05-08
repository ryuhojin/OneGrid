# F-EDIT Editing

This example exercises the shared editing contract across vanilla, React, and Vue.

- Core lifecycle resolves editable cells, parsers, validators, value setters, and commit/cancel results.
- DOM opens an accessible editor overlay on Enter, F2, printable keys, API `startEdit`, or cell double click.
- Checkbox cells toggle inline on single click and still stage pending edits for commit/cancel.
- `Quick Note` overrides the grid default with `editTrigger: "singleClick"`; `Manual Note` uses
  `editTrigger: "manual"` so pointer clicks do not open an editor.
- `editing.keyboard` keeps Tab, Enter, Escape, and Backspace behavior explicit for focused cells and
  active editors.
- The vanilla screen uses batch commit mode: accepted cell edits stay pending until Commit changes, while Cancel changes restores the pending history.
- `Start batch session` exercises the named batch session API and session lifecycle events.
- `Undo edit` and `Redo edit` exercise the edit history stack and keep pending edit detail in sync.
- The secondary vanilla grid and wrapper examples use `editing.readOnly: true`: accepted edits emit
  `cellEditRequested`, then the example applies `event.nextRow` from an external row store.
- Editors covered: text, number, date, datetime, checkbox, select, multi-select, radio, textarea, autocomplete, and custom.
- Active uses a basic checkbox display/editor, and Priority uses a basic radio editor.
