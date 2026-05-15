# Variable Row Height

Demonstrates `rowHeight: "auto"` with local row virtualization. OneGrid starts from the configured
estimated height, measures rendered DOM rows, caches the measured values, and reuses them for
spacer heights, scrollbar range, `scrollToRow`, pinned panes, and rendered row count alignment.
