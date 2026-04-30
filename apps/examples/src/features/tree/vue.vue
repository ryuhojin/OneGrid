<script setup lang="ts">
import { OneGrid } from "@onegrid/vue";
import {
  clientTreeOptions,
  clientTreeRows,
  createServerTreeDataSource,
  createTreeFeatureDataSource,
  serverTreeOptions,
  serverTreeRows,
  treeFeatureColumns
} from "./data";

const clientDataSource = createTreeFeatureDataSource();
const serverDataSource = createServerTreeDataSource();
</script>

<template>
  <OneGrid
    :columns="treeFeatureColumns"
    :data="clientTreeRows"
    :data-source="clientDataSource"
    :accessibility="{ label: 'Client tree grid' }"
    v-bind="clientTreeOptions"
  />
  <OneGrid
    :columns="treeFeatureColumns"
    :data="serverTreeRows"
    :data-source="serverDataSource"
    :accessibility="{ label: 'Server tree grid' }"
    v-bind="serverTreeOptions"
  />
  <dl class="example-inspector" aria-label="Tree summary">
    <dt>Tree contracts</dt>
    <dd>tree column, lazy children, sibling sort, ancestor filter, cascade checkbox selection</dd>
    <dt>Wrapper behavior</dt>
    <dd>Vue forwards tree row model options to @onegrid/dom</dd>
  </dl>
</template>
