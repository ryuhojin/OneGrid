<script setup lang="ts">
import { OneGrid } from "@onegrid/vue";
import {
  cellMergeColumns,
  cellMergeRows,
  cellMergeSelection,
  createCellMergeDataSource
} from "./data";

const dataSource = createCellMergeDataSource();
</script>

<template>
  <OneGrid
    :columns="cellMergeColumns"
    row-key="id"
    row-model="server"
    :data-source="dataSource"
    :server="{ pageSize: cellMergeRows.length }"
    :row-height="36"
    :layout="{ width: '100%', height: 392, bodyHeight: 392 }"
    :merge="{ enabled: true }"
    :selection="cellMergeSelection"
  />
  <dl class="example-inspector" aria-label="Cell merge summary">
    <dt>Merge sources</dt>
    <dd>value, custom, server mergeMeta</dd>
    <dt>Rows</dt>
    <dd>{{ cellMergeRows.length }}</dd>
  </dl>
</template>
