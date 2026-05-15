<script setup lang="ts">
import { OneGrid } from "@onegrid/vue";
import {
  clientPivotOptions,
  createPivotDataSource,
  pivotRows,
  pivotSourceColumns,
  pivotUxSummary,
  serverPivotColumns,
  serverPivotOptions
} from "./data";

const serverDataSource = createPivotDataSource();
</script>

<template>
  <h3 class="example-subheading">Client pivot</h3>
  <OneGrid
    :columns="pivotSourceColumns"
    :data="pivotRows"
    :accessibility="{ label: 'Client pivot grid' }"
    v-bind="clientPivotOptions"
  />
  <h3 class="example-subheading">Server pivot</h3>
  <OneGrid
    :columns="serverPivotColumns"
    :data-source="serverDataSource"
    :accessibility="{ label: 'Server pivot grid' }"
    v-bind="serverPivotOptions"
  />
  <dl class="example-inspector" aria-label="Pivot summary">
    <dt>Pivot row fields</dt>
    <dd>{{ pivotUxSummary.rows }}</dd>
    <dt>Pivot column fields</dt>
    <dd>{{ pivotUxSummary.columns }}</dd>
    <dt>Pivot value fields</dt>
    <dd>{{ pivotUxSummary.values }}</dd>
    <dt>Pivot totals</dt>
    <dd>{{ pivotUxSummary.totals }}</dd>
  </dl>
</template>
