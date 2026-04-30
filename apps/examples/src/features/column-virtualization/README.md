# LAY-003 Column Virtualization

This example renders a wide grid with pinned left/right columns and 72 center metric columns.
The DOM renderer only mounts the visible center column window plus horizontal overscan, while group
headers are clipped to the rendered virtual range.
