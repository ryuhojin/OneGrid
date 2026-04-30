<script setup lang="ts">
import { OneGrid } from "@onegrid/vue";
import { createTreeOrderDataSource, treeRowModelColumns, treeRows } from "./data";

const dataSource = createTreeOrderDataSource();
</script>

<template>
  <OneGrid
    :columns="treeRowModelColumns"
    :data="treeRows"
    :data-source="dataSource"
    row-key="id"
    row-model="tree"
    :tree="{
      childrenField: 'children',
      hasChildrenField: 'hasChildren',
      indentSize: 22,
      selection: { policy: 'descendants' }
    }"
  />
  <dl class="example-inspector" aria-label="Tree row model summary">
    <dt>Selection policy</dt>
    <dd>descendants</dd>
    <dt>Indent size</dt>
    <dd>22</dd>
  </dl>
</template>
