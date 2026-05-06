<script setup lang="ts">
import { OneGrid } from "@onegrid/vue";
import {
  exportColumns,
  exportGridOptions,
  exportPagedGridOptions,
  exportPagedRows,
  exportRows,
  exportWideColumns,
  exportWideGridOptions,
  exportWideRows
} from "./data";
</script>

<template>
  <div class="export-example-stack">
    <section class="export-example-section">
      <h3 class="export-example-heading">Standard export</h3>
      <OneGrid
        :columns="exportColumns"
        :data="exportRows"
        :accessibility="{ label: 'Vue export import grid' }"
        v-bind="exportGridOptions"
      />
    </section>
    <section class="export-example-section">
      <h3 class="export-example-heading">Paged row export</h3>
      <OneGrid
        :columns="exportColumns"
        :data="exportPagedRows"
        :accessibility="{ label: 'Vue paged export grid' }"
        v-bind="exportPagedGridOptions"
      />
    </section>
    <section class="export-example-section">
      <h3 class="export-example-heading">Wide column export</h3>
      <OneGrid
        :columns="exportWideColumns"
        :data="exportWideRows"
        :accessibility="{ label: 'Vue wide export grid' }"
        v-bind="exportWideGridOptions"
      />
    </section>
    <dl class="example-inspector" aria-label="Export import summary">
      <dt>Formats</dt>
      <dd>CSV, XLSX, PDF, print HTML, selected range, paged PDF, and wide-column export</dd>
      <dt>Wrapper behavior</dt>
      <dd>Vue forwards the shared export and import contracts to @onegrid/dom</dd>
    </dl>
  </div>
</template>
