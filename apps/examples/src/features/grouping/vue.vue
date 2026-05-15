<script setup lang="ts">
import { OneGrid } from "@onegrid/vue";
import {
  clientGroupingOptions,
  createGroupingDataSource,
  groupingColumns,
  groupingFieldSummary,
  groupingRows,
  serverGroupingOptions
} from "./data";

const serverDataSource = createGroupingDataSource();
</script>

<template>
  <h3 class="example-subheading">Client grouping</h3>
  <OneGrid
    :columns="groupingColumns"
    :data="groupingRows"
    :accessibility="{ label: 'Client grouping grid' }"
    v-bind="clientGroupingOptions"
  />
  <h3 class="example-subheading">Server grouping</h3>
  <OneGrid
    :columns="groupingColumns"
    :data-source="serverDataSource"
    :accessibility="{ label: 'Server grouping grid' }"
    v-bind="serverGroupingOptions"
  />
  <dl class="example-inspector" aria-label="Grouping summary">
    <dt>Grouping fields</dt>
    <dd>{{ groupingFieldSummary.fields }}</dd>
    <dt>Grouping aggregates</dt>
    <dd>{{ groupingFieldSummary.aggregates }}</dd>
    <dt>Client UX</dt>
    <dd>expandable rows, aggregate chips, and bottom group footers</dd>
    <dt>Server UX</dt>
    <dd>root groups, child route expansion, and server-supplied aggregate metadata</dd>
  </dl>
</template>
