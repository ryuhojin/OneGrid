<script setup lang="ts">
import { ref } from "vue";
import { OneGrid } from "@onegrid/vue";
import type { OneGridExpose } from "@onegrid/vue";
import { publicSiOptions, publicSiRows } from "./data";

const grid = ref<OneGridExpose>();
</script>

<template>
  <div class="example-actions">
    <input
      aria-label="Vue public service quick filter"
      type="search"
      placeholder="Filter public services"
      @input="grid?.setFilterModel({ quickText: ($event.target as HTMLInputElement).value })"
    />
  </div>
  <OneGrid ref="grid" v-bind="publicSiOptions" />
  <dl class="example-inspector" aria-label="Vue public sector SI summary">
    <dt>Scenario</dt>
    <dd>public-sector service desk</dd>
    <dt>Rows</dt>
    <dd>{{ publicSiRows.length }}</dd>
  </dl>
</template>
