<script setup lang="ts">
import { OneGrid } from "@onegrid/vue";
import { keyboardFocusOptions } from "./data";
</script>

<template>
  <OneGrid v-bind="keyboardFocusOptions" />
</template>
