<script setup lang="ts">
import { OneGrid } from "@onegrid/vue";
import {
  FROZEN_BOTTOM_ROWS,
  FROZEN_ROW_COUNT,
  FROZEN_TOP_ROWS,
  frozenColumns,
  frozenLayout,
  frozenRows,
  frozenVirtualization
} from "./data";
</script>

<template>
  <OneGrid
    :columns="frozenColumns"
    :data="frozenRows"
    row-key="id"
    row-model="client"
    :row-height="32"
    :layout="frozenLayout"
    :virtualization="frozenVirtualization"
    :frozen-rows="{ top: FROZEN_TOP_ROWS, bottom: FROZEN_BOTTOM_ROWS }"
    :frozen-columns="{ left: ['id', 'region'], right: ['status'] }"
    :merge="{ enabled: true, strategy: 'value', fields: ['region', 'agency'] }"
  />
  <dl class="example-inspector" aria-label="Frozen rows and columns summary">
    <dt>Frozen top rows</dt>
    <dd>{{ FROZEN_TOP_ROWS }}</dd>
    <dt>Frozen bottom rows</dt>
    <dd>{{ FROZEN_BOTTOM_ROWS }}</dd>
    <dt>Logical rows</dt>
    <dd>{{ FROZEN_ROW_COUNT }}</dd>
  </dl>
</template>
