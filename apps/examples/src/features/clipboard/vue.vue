<script setup lang="ts">
import { OneGrid } from "@onegrid/vue";
import {
  clipboardColumns,
  clipboardEditing,
  clipboardOptions,
  clipboardRows,
  clipboardSelection
} from "./data";
</script>

<template>
  <OneGrid
    :columns="clipboardColumns"
    :data="clipboardRows"
    row-key="id"
    row-model="client"
    :selection="clipboardSelection"
    :editing="clipboardEditing"
    :clipboard="clipboardOptions"
    :merge="{ enabled: true }"
  />
  <dl class="example-inspector" aria-label="Clipboard summary">
    <dt>Clipboard scope</dt>
    <dd>Selected cells, rows, headers, paste validation, and merged-cell blanks</dd>
    <dt>Wrapper behavior</dt>
    <dd>Vue passes the same GridOptions clipboard contract to @onegrid/dom</dd>
  </dl>
</template>
