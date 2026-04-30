<script setup lang="ts">
import { OneGrid } from "@onegrid/vue";
import { baseLayoutColumns, baseLayoutOptions, baseLayoutRows } from "./data";
</script>

<template>
  <OneGrid
    :columns="baseLayoutColumns"
    :data="baseLayoutRows"
    :row-key="baseLayoutOptions.rowKey"
    :row-model="baseLayoutOptions.rowModel"
    :layout="baseLayoutOptions.layout"
    :summary="baseLayoutOptions.summary"
  />
  <dl class="example-inspector" aria-label="Base layout summary">
    <dt>Pinned panes</dt>
    <dd>left, center, right</dd>
    <dt>Summary position</dt>
    <dd>bottom</dd>
    <dt>Footer status</dt>
    <dd>rows</dd>
  </dl>
</template>
