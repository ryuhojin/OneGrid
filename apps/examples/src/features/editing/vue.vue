<script setup lang="ts">
import { OneGrid } from "@onegrid/vue";
import { editingColumns, editingOptions, editingRows } from "./data.js";
</script>

<template>
  <OneGrid
    :columns="editingColumns"
    :column-ui="{ menu: true }"
    :data="editingRows"
    row-key="id"
    row-model="client"
    :editing="editingOptions"
    :layout="{ width: '100%', height: 420, bodyHeight: 420 }"
  />
  <dl class="example-inspector" aria-label="Editing summary">
    <dt>Commit mode</dt>
    <dd>Batch pending edits</dd>
    <dt>Editors</dt>
    <dd>Text, number, date, datetime, checkbox, select, multi-select, radio, textarea, autocomplete, custom</dd>
  </dl>
</template>
