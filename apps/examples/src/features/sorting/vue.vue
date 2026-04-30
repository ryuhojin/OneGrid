<script setup lang="ts">
import { OneGrid } from "@onegrid/vue";
import { sortingColumns, sortingOptions, sortingRows } from "./data";
</script>

<template>
  <OneGrid
    :columns="sortingColumns"
    :column-ui="{ menu: true }"
    :data="sortingRows"
    row-model="client"
    :sorting="sortingOptions"
  />
  <dl class="example-inspector" aria-label="Sorting summary">
    <dt>Sort cycle</dt>
    <dd>ascending, descending, none</dd>
    <dt>Multi sort</dt>
    <dd>Shift-click sortable headers</dd>
  </dl>
</template>
