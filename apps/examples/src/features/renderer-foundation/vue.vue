<script setup lang="ts">
import { OneGrid } from "@onegrid/vue";
import {
  rendererFoundationColumns,
  rendererFoundationRows,
  rendererFoundationSecurity
} from "./data";
</script>

<template>
  <OneGrid
    :columns="rendererFoundationColumns"
    :data="rendererFoundationRows"
    row-key="id"
    row-model="client"
    :security="rendererFoundationSecurity"
  />
</template>
