<script setup lang="ts">
import { OneGrid } from "@onegrid/vue";
import {
  exportColumns,
  exportGridOptions,
  exportRows
} from "./data";
</script>

<template>
  <OneGrid
    :columns="exportColumns"
    :data="exportRows"
    :accessibility="{ label: 'Vue export import grid' }"
    v-bind="exportGridOptions"
  />
  <dl class="example-inspector" aria-label="Export import summary">
    <dt>Formats</dt>
    <dd>CSV, XLSX, PDF, print HTML, selected range, and import parsing</dd>
    <dt>Wrapper behavior</dt>
    <dd>Vue forwards the shared export and import contracts to @onegrid/dom</dd>
  </dl>
</template>
