<script setup lang="ts">
import { OneGrid } from "@onegrid/vue";
import {
  createQspServerDataSource,
  QSP_SERVER_PAGE_SIZE,
  QSP_SERVER_TOTAL_ROWS,
  qspServerColumns
} from "./data";

const dataSource = createQspServerDataSource();
</script>

<template>
  <OneGrid
    :columns="qspServerColumns"
    row-key="id"
    row-model="server"
    :data-source="dataSource"
    :server="{ pageSize: QSP_SERVER_PAGE_SIZE }"
    :pagination="{ mode: 'server', position: 'bottom', pageSize: QSP_SERVER_PAGE_SIZE }"
    :layout="{ height: 420, bodyHeight: 420 }"
    :sorting="{ serverOnly: true, model: [{ field: 'amount', direction: 'desc' }] }"
    :accessibility="{ label: 'Vue 10M server rows grid' }"
  />
  <dl class="example-inspector" aria-label="Vue 10M server rows summary">
    <dt>Logical rows</dt>
    <dd>{{ QSP_SERVER_TOTAL_ROWS.toLocaleString("en-US") }}</dd>
    <dt>Page size</dt>
    <dd>{{ QSP_SERVER_PAGE_SIZE }}</dd>
  </dl>
</template>
