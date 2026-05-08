<script setup lang="ts">
import { OneGrid } from "@onegrid/vue";
import { cellMergeBlockOptions } from "./data.js";
</script>

<template>
  <OneGrid v-bind="cellMergeBlockOptions" />
</template>
