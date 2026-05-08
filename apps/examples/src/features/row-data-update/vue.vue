<script setup lang="ts">
import { ref } from "vue";
import { OneGrid } from "@onegrid/vue";
import type { OneGridExpose } from "@onegrid/vue";
import {
  createInsertedRow,
  createRowDataUpdateRows,
  rowDataUpdateColumns
} from "./data.js";
import type { RowDataUpdateRow } from "./data.js";

const grid = ref<OneGridExpose>();
const rows = ref<readonly RowDataUpdateRow[]>(createRowDataUpdateRows());
const operation = ref("initial data");

function resetData(): void {
  rows.value = createRowDataUpdateRows();
  operation.value = "reactive data reset";
}

function appendViaApi(): void {
  grid.value?.appendRows([createInsertedRow()]);
  operation.value = "GridApi appendRows";
}

function updateViaApi(): void {
  grid.value?.updateRows([{ rowKey: "UPD-0002", row: { status: "Approved", amount: 1110 } }]);
  operation.value = "GridApi updateRows";
}
</script>

<template>
  <div class="example-actions" aria-label="Row data update Vue actions">
    <button class="example-action-button" type="button" @click="resetData">
      Reset reactive data
    </button>
    <button class="example-action-button" type="button" @click="appendViaApi">
      Append via API
    </button>
    <button class="example-action-button" type="button" @click="updateViaApi">
      Update via API
    </button>
  </div>
  <OneGrid
    ref="grid"
    :columns="rowDataUpdateColumns"
    :data="rows"
    row-key="id"
    row-model="client"
    :accessibility="{ label: 'Row data update Vue grid' }"
  />
  <dl class="example-inspector" aria-label="Row data update Vue summary">
    <dt>Last operation</dt>
    <dd>{{ operation }}</dd>
  </dl>
</template>
