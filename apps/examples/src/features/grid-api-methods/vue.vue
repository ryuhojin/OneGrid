<script setup lang="ts">
import { ref } from "vue";
import { OneGrid } from "@onegrid/vue";
import type { OneGridExpose } from "@onegrid/vue";
import { gridApiMethodsColumns, gridApiMethodsRows } from "./data.js";

const grid = ref<OneGridExpose>();
const lastMethod = ref("ready");

function selectRow(): void {
  grid.value?.selectRows(["API-0002"]);
  lastMethod.value = "selectRows";
}

function sortAmount(): void {
  grid.value?.setSortModel([{ field: "amount", direction: "desc" }]);
  lastMethod.value = "setSortModel";
}

function hideOwner(): void {
  grid.value?.hideColumn("owner");
  lastMethod.value = "hideColumn";
}
</script>

<template>
  <div class="example-actions" aria-label="Grid API method Vue actions">
    <button class="example-action-button" type="button" @click="selectRow">
      Select API-0002
    </button>
    <button class="example-action-button" type="button" @click="sortAmount">
      Sort amount
    </button>
    <button class="example-action-button" type="button" @click="hideOwner">
      Hide owner
    </button>
  </div>
  <OneGrid
    ref="grid"
    :columns="gridApiMethodsColumns"
    :data="gridApiMethodsRows"
    row-key="id"
    row-model="client"
    :selection="{ mode: 'row', multiple: true, checkbox: true, selectAll: 'visible' }"
    :accessibility="{ label: 'Grid API methods Vue grid' }"
  />
  <dl class="example-inspector" aria-label="Grid API method Vue summary">
    <dt>Last method</dt>
    <dd>{{ lastMethod }}</dd>
  </dl>
</template>
