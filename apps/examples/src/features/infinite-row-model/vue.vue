<script setup lang="ts">
import { OneGrid } from "@onegrid/vue";
import {
  createInfiniteOrderDataSource,
  INFINITE_BLOCK_SIZE,
  INFINITE_TOTAL_ROWS,
  infiniteRowModelColumns
} from "./data";

const dataSource = createInfiniteOrderDataSource();
</script>

<template>
  <OneGrid
    :columns="infiniteRowModelColumns"
    row-model="infinite"
    :data-source="dataSource"
    :infinite="{
      blockSize: INFINITE_BLOCK_SIZE,
      maxBlocksInCache: 2,
      initialRowCount: INFINITE_TOTAL_ROWS
    }"
  />
  <dl class="example-inspector" aria-label="Infinite row model summary">
    <dt>Total rows</dt>
    <dd>{{ INFINITE_TOTAL_ROWS }}</dd>
    <dt>Block size</dt>
    <dd>{{ INFINITE_BLOCK_SIZE }}</dd>
    <dt>Cache blocks</dt>
    <dd>2</dd>
  </dl>
</template>
