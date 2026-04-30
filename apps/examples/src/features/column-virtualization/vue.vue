<script setup lang="ts">
import { OneGrid } from "@onegrid/vue";
import {
  COLUMN_VIRTUALIZATION_CENTER_COLUMNS,
  columnVirtualizationColumns,
  columnVirtualizationLayout,
  columnVirtualizationRows,
  columnVirtualizationVirtualization
} from "./data";
</script>

<template>
  <OneGrid
    :columns="columnVirtualizationColumns"
    :data="columnVirtualizationRows"
    row-key="id"
    row-model="client"
    :layout="columnVirtualizationLayout"
    :virtualization="columnVirtualizationVirtualization"
    :row-height="32"
  />
  <dl class="example-inspector" aria-label="Column virtualization summary">
    <dt>Center columns</dt>
    <dd>{{ COLUMN_VIRTUALIZATION_CENTER_COLUMNS }}</dd>
    <dt>Max DOM columns</dt>
    <dd>{{ columnVirtualizationVirtualization.columns.maxDomColumns }}</dd>
  </dl>
</template>
