<script setup lang="ts">
import { OneGrid } from "@onegrid/vue";
import {
  columnTypeDefinitions,
  columnTypesColumns,
  columnTypesDefaultColumnDef,
  columnTypesRows
} from "./data.js";
</script>

<template>
  <OneGrid
    :columns="columnTypesColumns"
    :default-column-def="columnTypesDefaultColumnDef"
    :column-types="columnTypeDefinitions"
    :data="columnTypesRows"
    row-key="id"
    row-model="client"
    :accessibility="{ label: 'Column types Vue grid' }"
  />
</template>
