<script setup lang="ts">
import { OneGrid } from "@onegrid/vue";
import {
  ROW_VIRTUALIZATION_ROW_COUNT,
  rowVirtualizationColumns,
  rowVirtualizationOptions,
  rowVirtualizationRows
} from "./data";
</script>

<template>
  <OneGrid
    :columns="rowVirtualizationColumns"
    :data="rowVirtualizationRows"
    :row-key="rowVirtualizationOptions.rowKey"
    :row-model="rowVirtualizationOptions.rowModel"
    :layout="rowVirtualizationOptions.layout"
    :virtualization="rowVirtualizationOptions.virtualization"
    :row-height="rowVirtualizationOptions.rowHeight"
  />
  <dl class="example-inspector" aria-label="Row virtualization summary">
    <dt>Logical rows</dt>
    <dd>{{ ROW_VIRTUALIZATION_ROW_COUNT }}</dd>
    <dt>Virtual row height</dt>
    <dd>{{ rowVirtualizationOptions.virtualization?.rowHeight }}px</dd>
  </dl>
</template>
