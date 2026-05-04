<script setup lang="ts">
import { OneGrid } from "@onegrid/vue";
import {
  xssDefenseColumns,
  xssDefenseRows,
  xssDefenseSecurity
} from "./data";
</script>

<template>
  <OneGrid
    :columns="xssDefenseColumns"
    :data="xssDefenseRows"
    row-key="id"
    row-model="client"
    :security="xssDefenseSecurity"
  />
</template>
