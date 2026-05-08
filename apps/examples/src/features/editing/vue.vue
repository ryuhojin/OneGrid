<script setup lang="ts">
import { ref } from "vue";
import { OneGrid } from "@onegrid/vue";
import { editingColumns, editingOptions, editingRows } from "./data.js";
import type { GridCellEditRequestedEvent } from "@onegrid/core";
import type { EditingRow } from "./data.js";

const rows = ref<readonly EditingRow[]>(editingRows);
const requests = ref(0);
const readonlyEditing = {
  ...editingOptions,
  commitMode: "cell" as const,
  readOnly: true
};

function onCellEditRequested(event: GridCellEditRequestedEvent<EditingRow>) {
  requests.value += 1;
  rows.value = rows.value.map((row) =>
    row.id === event.rowKey ? event.nextRow : row
  );
}
</script>

<template>
  <OneGrid
    :columns="editingColumns"
    :column-ui="{ menu: true }"
    :data="rows"
    row-key="id"
    row-model="client"
    :editing="readonlyEditing"
    :layout="{ width: '100%', height: 420, bodyHeight: 420 }"
    @cell-edit-requested="onCellEditRequested"
  />
  <dl class="example-inspector" aria-label="Editing summary">
    <dt>Commit mode</dt>
    <dd>Read-only external state</dd>
    <dt>External requests</dt>
    <dd>{{ requests }}</dd>
  </dl>
</template>
