<script setup lang="ts">
import { createColumnModel } from "@onegrid/core";
import { OneGrid } from "@onegrid/vue";
import { columnUiColumns, columnUiOptions, columnUiRows } from "./data";

const columnModel = createColumnModel(columnUiColumns);
</script>

<template>
  <OneGrid
    :columns="columnUiColumns"
    :column-ui="columnUiOptions"
    :data="columnUiRows"
    row-model="client"
  />
  <dl class="example-inspector" aria-label="Column UI summary">
    <dt>Interactive controls</dt>
    <dd>resize, auto size, reorder, menu, tool panel</dd>
    <dt>Initial visible columns</dt>
    <dd>{{ columnModel.order.visible.join(", ") }}</dd>
    <dt>Initial hidden columns</dt>
    <dd>{{ columnModel.order.hidden.join(", ") }}</dd>
  </dl>
</template>
