<script setup lang="ts">
import { OneGrid } from "@onegrid/vue";
import {
  createMenuContextMenu,
  menuClipboard,
  menuColumnUi,
  menuColumns,
  menuEditing,
  menuFiltering,
  menuRows,
  menuSelection
} from "./data";

const contextMenu = createMenuContextMenu();
</script>

<template>
  <OneGrid
    :columns="menuColumns"
    :data="menuRows"
    row-key="id"
    row-model="client"
    :column-ui="menuColumnUi"
    :filtering="menuFiltering"
    :selection="menuSelection"
    :editing="menuEditing"
    :clipboard="menuClipboard"
    :context-menu="contextMenu"
    :merge="{ enabled: true }"
  />
  <dl class="example-inspector" aria-label="Menu summary">
    <dt>Menu surfaces</dt>
    <dd>Header menu, column menu actions, filter menu, and cell context menu</dd>
    <dt>Wrapper behavior</dt>
    <dd>Vue forwards the shared contextMenu GridOptions contract to @onegrid/dom</dd>
  </dl>
</template>
