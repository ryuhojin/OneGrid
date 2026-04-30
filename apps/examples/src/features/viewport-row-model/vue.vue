<script setup lang="ts">
import { OneGrid } from "@onegrid/vue";
import {
  createViewportOrderDataSource,
  VIEWPORT_ROW_HEIGHT,
  VIEWPORT_SIZE,
  VIEWPORT_TOTAL_ROWS,
  viewportRowModelColumns
} from "./data";

const dataSource = createViewportOrderDataSource();
</script>

<template>
  <OneGrid
    :columns="viewportRowModelColumns"
    row-key="id"
    row-model="viewport"
    :data-source="dataSource"
    :viewport="{
      rowHeight: VIEWPORT_ROW_HEIGHT,
      viewportSize: VIEWPORT_SIZE,
      overscan: 2,
      prefetchRows: 24,
      maxCachedRanges: 3,
      initialRowCount: VIEWPORT_TOTAL_ROWS
    }"
    :sorting="{ serverOnly: true, model: [{ field: 'amount', direction: 'asc' }] }"
  />
  <dl class="example-inspector" aria-label="Viewport row model summary">
    <dt>Total rows</dt>
    <dd>{{ VIEWPORT_TOTAL_ROWS }}</dd>
    <dt>Viewport rows</dt>
    <dd>{{ VIEWPORT_SIZE }}</dd>
  </dl>
</template>
