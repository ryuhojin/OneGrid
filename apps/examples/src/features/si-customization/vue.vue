<template>
  <div>
    <div class="example-actions si-theme-actions">
      <button
        v-for="preset in siPresets"
        :key="preset.id"
        class="example-action-button si-theme-button"
        type="button"
        :aria-pressed="presetId === preset.id"
        @click="presetId = preset.id"
      >
        <span :class="`si-theme-swatch si-theme-swatch--${preset.id}`" aria-hidden="true" />
        {{ preset.label }}
      </button>
    </div>
    <div class="example-actions si-theme-actions">
      <button
        v-for="item in densities"
        :key="item"
        class="example-action-button si-theme-button"
        type="button"
        :aria-pressed="density === item"
        @click="density = item"
      >
        {{ item }}
      </button>
    </div>
    <OneGrid v-bind="siGridOptions" :theme="theme" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { OneGrid } from "@onegrid/vue";
import { createTenantTheme, siGridOptions, siPresets } from "./data.js";
import type { SiPresetId } from "./data.js";
import type { ThemeDensity } from "@onegrid/themes";

const densities: readonly ThemeDensity[] = ["comfortable", "standard", "compact"];
const presetId = ref<SiPresetId>("public-red");
const density = ref<ThemeDensity>("standard");
const theme = computed(() => createTenantTheme(presetId.value, density.value));
</script>
