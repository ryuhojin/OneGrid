<script setup lang="ts">
import { createColumnModel } from "@onegrid/core";
import { OneGrid } from "@onegrid/vue";
import { columnModelColumns, columnModelOrder, columnModelRows } from "./data";

const model = createColumnModel(columnModelColumns, { columnOrder: columnModelOrder });
</script>

<template>
  <OneGrid
    :columns="columnModelColumns"
    :column-order="columnModelOrder"
    :data="columnModelRows"
    row-model="client"
  />
  <dl class="example-inspector" aria-label="Column model summary">
    <dt>Visible columns</dt>
    <dd>{{ model.order.visible.join(", ") }}</dd>
    <dt>Hidden columns</dt>
    <dd>{{ model.order.hidden.join(", ") }}</dd>
    <dt>Pinned left columns</dt>
    <dd>{{ model.pinnedLeafColumns.left.map((column) => column.headerName).join(", ") }}</dd>
    <dt>Pinned right columns</dt>
    <dd>{{ model.pinnedLeafColumns.right.map((column) => column.headerName).join(", ") }}</dd>
  </dl>
</template>
