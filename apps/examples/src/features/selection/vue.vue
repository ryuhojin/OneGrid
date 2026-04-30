<script setup lang="ts">
import { OneGrid } from "@onegrid/vue";
import {
  selectionColumns,
  selectionOptions,
  selectionRows
} from "./data";
</script>

<template>
  <OneGrid
    :columns="selectionColumns"
    :data="selectionRows"
    row-key="id"
    row-model="client"
    :selection="selectionOptions"
    :merge="{ enabled: true }"
  />
  <dl class="example-inspector" aria-label="Selection summary">
    <dt>Selection modes</dt>
    <dd>Rows, cells, ranges, merged cells, visible rows, and server dataset token</dd>
    <dt>Wrapper behavior</dt>
    <dd>Vue passes the same GridOptions selection contract to @onegrid/dom</dd>
  </dl>
</template>
