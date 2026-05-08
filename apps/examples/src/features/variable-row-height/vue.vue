<script setup lang="ts">
import { OneGrid } from "@onegrid/vue";
import { variableRowHeightOptions } from "./data.js";
</script>

<template>
  <OneGrid v-bind="variableRowHeightOptions" />
</template>
