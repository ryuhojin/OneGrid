<template>
  <div>
    <OneGrid
      :columns="paginationColumns"
      :data="paginationRows"
      :accessibility="{ label: 'Vue client pagination grid' }"
      v-bind="clientPaginationOptions"
    />
    <OneGrid
      :columns="paginationColumns"
      :data-source="createPaginationDataSource()"
      :accessibility="{ label: 'Vue server pagination grid' }"
      v-bind="serverPaginationOptions"
    />
  </div>
</template>

<script setup lang="ts">
import { OneGrid } from "@onegrid/vue";
import {
  clientPaginationOptions,
  createPaginationDataSource,
  paginationColumns,
  paginationRows,
  serverPaginationOptions
} from "./data.js";
</script>
