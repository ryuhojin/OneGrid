<script setup lang="ts">
import { OneGrid } from "@onegrid/vue";
import { accessibilityOptions } from "./data";
</script>

<template>
  <OneGrid v-bind="accessibilityOptions" />
</template>
