<script setup lang="ts">
import { OneGrid } from "@onegrid/vue";
import {
  clientPivotOptions,
  createPivotDataSource,
  pivotRows,
  pivotSourceColumns,
  serverPivotColumns,
  serverPivotOptions
} from "./data";

const serverDataSource = createPivotDataSource();
</script>

<template>
  <OneGrid
    :columns="pivotSourceColumns"
    :data="pivotRows"
    :accessibility="{ label: 'Client pivot grid' }"
    v-bind="clientPivotOptions"
  />
  <OneGrid
    :columns="serverPivotColumns"
    :data-source="serverDataSource"
    :accessibility="{ label: 'Server pivot grid' }"
    v-bind="serverPivotOptions"
  />
  <dl class="example-inspector" aria-label="Pivot summary">
    <dt>Pivot contracts</dt>
    <dd>row fields, column fields, value fields, row totals, column totals, subtotals</dd>
    <dt>Wrapper behavior</dt>
    <dd>Vue forwards the shared pivot model to @onegrid/dom</dd>
  </dl>
</template>
