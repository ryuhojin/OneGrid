import { OneGrid } from "@onegrid/react";
import {
  createInfiniteOrderDataSource,
  INFINITE_BLOCK_SIZE,
  INFINITE_TOTAL_ROWS,
  infiniteRowModelColumns
} from "./data.js";

export function InfiniteRowModelReactExample() {
  return (
    <>
      <OneGrid
        columns={infiniteRowModelColumns}
        rowModel="infinite"
        dataSource={createInfiniteOrderDataSource()}
        infinite={{
          blockSize: INFINITE_BLOCK_SIZE,
          maxBlocksInCache: 2,
          initialRowCount: INFINITE_TOTAL_ROWS
        }}
      />
      <dl className="example-inspector" aria-label="Infinite row model summary">
        <dt>Total rows</dt>
        <dd>{INFINITE_TOTAL_ROWS}</dd>
        <dt>Block size</dt>
        <dd>{INFINITE_BLOCK_SIZE}</dd>
        <dt>Cache blocks</dt>
        <dd>2</dd>
      </dl>
    </>
  );
}
