<script setup lang="ts">
import { createClientRowModel } from "@onegrid/core";
import { OneGrid } from "@onegrid/vue";
import {
  clientRowAggregateModel,
  clientRowFilterModel,
  clientRowGroupModel,
  clientRowModelColumns,
  clientRowModelRows,
  clientRowSortModel
} from "./data";

const model = createClientRowModel(clientRowModelRows, {
  rowKey: "id",
  filterModel: clientRowFilterModel,
  sortModel: clientRowSortModel,
  groupModel: clientRowGroupModel,
  aggregateModel: clientRowAggregateModel
});
</script>

<template>
  <OneGrid
    :columns="clientRowModelColumns"
    :data="clientRowModelRows"
    row-key="id"
    row-model="client"
    :filtering="{ model: clientRowFilterModel }"
    :sorting="{ model: clientRowSortModel }"
    :grouping="{ model: clientRowGroupModel }"
    :aggregation="{ model: clientRowAggregateModel }"
  />
  <dl class="example-inspector" aria-label="Client row model summary">
    <dt>Source rows</dt>
    <dd>{{ model.rows.length }}</dd>
    <dt>Filtered rows</dt>
    <dd>{{ model.dataRowCount }}</dd>
    <dt>Visible row entries</dt>
    <dd>{{ model.rowCount }}</dd>
    <dt>Aggregate amount</dt>
    <dd>{{ String(model.aggregateValues.amountTotal) }}</dd>
  </dl>
</template>
