<script setup lang="ts">
import { OneGrid } from "@onegrid/vue";
import {
  createFilteringDataSource,
  filteringColumns,
  filteringOptions
} from "./data";

const dataSource = createFilteringDataSource();
</script>

<template>
  <OneGrid
    :columns="filteringColumns"
    :column-ui="{ menu: true }"
    :data-source="dataSource"
    :filtering="filteringOptions"
    row-key="id"
    row-model="server"
    :server="{ pageSize: 8 }"
  />
  <dl class="example-inspector" aria-label="Filtering summary">
    <dt>Filter UI</dt>
    <dd>Quick filter and column menu filters use the shared filter model</dd>
    <dt>Server mode</dt>
    <dd>getRows receives FilterModel and getDistinctValues powers set filters</dd>
  </dl>
</template>
