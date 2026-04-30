<script setup lang="ts">
import { OneGrid } from "@onegrid/vue";
import {
  clientGroupingOptions,
  createGroupingDataSource,
  groupingColumns,
  groupingRows,
  serverGroupingOptions
} from "./data";

const serverDataSource = createGroupingDataSource();
</script>

<template>
  <OneGrid
    :columns="groupingColumns"
    :data="groupingRows"
    :accessibility="{ label: 'Client grouping grid' }"
    v-bind="clientGroupingOptions"
  />
  <OneGrid
    :columns="groupingColumns"
    :data-source="serverDataSource"
    :accessibility="{ label: 'Server grouping grid' }"
    v-bind="serverGroupingOptions"
  />
  <dl class="example-inspector" aria-label="Grouping summary">
    <dt>Grouping modes</dt>
    <dd>client groups, expandable group rows, group footers, and server group requests</dd>
    <dt>Wrapper behavior</dt>
    <dd>Vue forwards grouping and aggregation contracts to @onegrid/dom</dd>
  </dl>
</template>
