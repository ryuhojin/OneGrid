<script setup lang="ts">
import { createColumnModel, createHeaderModel } from "@onegrid/core";
import { OneGrid } from "@onegrid/vue";
import { groupHeaderColumns, groupHeaderMerge, groupHeaderRows, metricColumnIds } from "./data";

const columnModel = createColumnModel(groupHeaderColumns);
const headerModel = createHeaderModel(columnModel, { merge: groupHeaderMerge });
const metricColumnNames = metricColumnIds.map((columnId) => {
  const column = columnModel.byId.get(columnId);
  return column?.headerName ?? columnId;
});
</script>

<template>
  <OneGrid
    :columns="groupHeaderColumns"
    :header-merge="groupHeaderMerge"
    :data="groupHeaderRows"
    row-model="client"
  />
  <dl class="example-inspector" aria-label="Group header summary">
    <dt>Header rows</dt>
    <dd>{{ headerModel.depth }}</dd>
    <dt>Metric columns</dt>
    <dd>{{ metricColumnNames.join(", ") }}</dd>
    <dt>Center headers</dt>
    <dd>
      {{
        headerModel.regions.center.rows
          .flatMap((row) => row.cells.map((cell) => cell.headerName))
          .join(", ")
      }}
    </dd>
    <dt>ARIA labels</dt>
    <dd>{{ [...headerModel.ariaLabels.values()].slice(0, 4).join(" / ") }}</dd>
  </dl>
</template>
