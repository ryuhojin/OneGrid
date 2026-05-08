<script setup lang="ts">
import { OneGrid } from "@onegrid/vue";
import { financialExposureTotal, financialSiOptions, financialSiRows } from "./data";
</script>

<template>
  <OneGrid v-bind="financialSiOptions" />
  <dl class="example-inspector" aria-label="Vue financial SI summary">
    <dt>Scenario</dt>
    <dd>financial controls</dd>
    <dt>Rows</dt>
    <dd>{{ financialSiRows.length }}</dd>
    <dt>Exposure total</dt>
    <dd>{{ financialExposureTotal.toLocaleString("en-US") }}</dd>
  </dl>
</template>
