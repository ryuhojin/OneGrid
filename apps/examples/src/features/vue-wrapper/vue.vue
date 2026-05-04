<script setup lang="ts">
import { ref } from "vue";
import { OneGrid } from "@onegrid/vue";
import type { GridPendingEdit } from "@onegrid/core";
import type { OneGridExpose } from "@onegrid/vue";
import {
  vueWrapperColumns,
  vueWrapperOptions,
  vueWrapperRows
} from "./data.js";
import type { VueWrapperRow } from "./data.js";

const grid = ref<OneGridExpose>();
const rows = ref<readonly VueWrapperRow[]>(vueWrapperRows);
const ready = ref(false);
const selectedCount = ref(0);
const pendingEdits = ref<readonly GridPendingEdit[]>([]);

function selectFirstTwo(): void {
  grid.value?.selectRows(["WV-0001", "WV-0002"]);
}

function addControlledRow(): void {
  if (rows.value.some((row) => row.id === "WV-0004")) {
    return;
  }

  rows.value = Object.freeze([
    ...rows.value,
    {
      id: "WV-0004",
      department: "Public Funds",
      program: "Grant review",
      memo: "Reactive props update",
      owner: "Seo",
      amount: 980,
      status: "Ready"
    }
  ]);
}

function refreshPendingEdits(): void {
  pendingEdits.value = grid.value?.getPendingEdits() ?? [];
}
</script>

<template>
  <h1>OneGrid Vue Wrapper</h1>
  <div class="example-actions" aria-label="Vue wrapper actions">
    <button class="example-action-button" type="button" @click="selectFirstTwo">
      Select first two
    </button>
    <button class="example-action-button" type="button" @click="addControlledRow">
      Add reactive row
    </button>
    <button class="example-action-button" type="button" @click="grid?.commitPendingEdits()">
      Commit edits
    </button>
    <button class="example-action-button" type="button" @click="grid?.cancelPendingEdits()">
      Cancel edits
    </button>
  </div>
  <OneGrid
    ref="grid"
    :columns="vueWrapperColumns"
    :data="rows"
    row-key="id"
    row-model="client"
    v-bind="vueWrapperOptions"
    :accessibility="{ label: 'Vue wrapper grid' }"
    @ready="ready = true"
    @selection-changed="selectedCount = $event.rowKeys.length"
    @cell-edit-staged="refreshPendingEdits"
    @cell-edit-committed="refreshPendingEdits"
    @cell-edit-cancelled="refreshPendingEdits"
  >
    <template #header-workflow>
      <span class="vue-wrapper-header">Workflow slots</span>
    </template>
    <template #header-status>
      <span class="vue-wrapper-header">Stage</span>
    </template>
    <template #cell-amount="{ value }">
      <strong>{{ Number(value).toLocaleString("en-US") }}</strong>
    </template>
    <template #cell-status="{ value }">
      <span :class="`vue-wrapper-status vue-wrapper-status--${String(value).toLowerCase()}`">
        {{ value }}
      </span>
    </template>
  </OneGrid>
  <dl class="example-inspector" aria-label="Vue wrapper summary">
    <dt>Ready event</dt>
    <dd>{{ ready ? "received" : "pending" }}</dd>
    <dt>Selected rows</dt>
    <dd>{{ selectedCount }}</dd>
    <dt>Rows</dt>
    <dd>{{ rows.length }}</dd>
    <dt>Pending edits</dt>
    <dd>{{ pendingEdits.length }}</dd>
  </dl>
</template>
