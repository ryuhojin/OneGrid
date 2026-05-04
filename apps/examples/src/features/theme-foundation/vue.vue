<template>
  <div>
    <div class="example-actions theme-example-actions">
      <button
        v-for="choice in themeChoices"
        :key="choice.id"
        class="example-action-button theme-example-button"
        type="button"
        :aria-pressed="active === choice.id"
        @click="active = choice.id"
      >
        {{ choice.label }}
      </button>
    </div>
    <OneGrid v-bind="themeGridOptions" :theme="theme" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { OneGrid } from "@onegrid/vue";
import { createTheme, themeChoices, themeGridOptions } from "./data.js";
import type { ThemeChoice } from "./data.js";

const active = ref<ThemeChoice>("clean");
const theme = computed(() => createTheme(active.value));
</script>
