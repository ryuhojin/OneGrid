# EX-005 10M Server Rows

This example demonstrates a 10M logical row grid using `rowModel: "server"`.
Rows are generated only for the requested range; the example must not allocate a
10M client array.
