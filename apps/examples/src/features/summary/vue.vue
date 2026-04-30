<script setup lang="ts">
import { OneGrid } from "@onegrid/vue";
import {
  clientSummaryOptions,
  createSummaryDataSource,
  serverSummaryOptions,
  summaryColumns,
  summaryRows
} from "./data";

const serverDataSource = createSummaryDataSource();
</script>

<template>
  <OneGrid
    :columns="summaryColumns"
    :data="summaryRows"
    :accessibility="{ label: 'Client summary grid' }"
    v-bind="clientSummaryOptions"
  />
  <OneGrid
    :columns="summaryColumns"
    :data-source="serverDataSource"
    :accessibility="{ label: 'Server aggregate grid' }"
    v-bind="serverSummaryOptions"
  />
  <dl class="example-inspector" aria-label="Summary aggregate summary">
    <dt>Summary modes</dt>
    <dd>sum, avg, min, max, count, distinct count, custom, group, and server aggregate</dd>
    <dt>Wrapper behavior</dt>
    <dd>Vue forwards the shared summary and aggregation contracts to @onegrid/dom</dd>
  </dl>
</template>
