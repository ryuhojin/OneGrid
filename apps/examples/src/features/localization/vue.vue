<template>
  <div>
    <div class="example-actions">
      <button class="example-action-button" type="button" @click="locale = 'en-US'">
        English
      </button>
      <button class="example-action-button" type="button" @click="locale = 'ko-KR'">
        한국어
      </button>
    </div>
    <OneGrid
      :columns="localizationColumns"
      :data="localizationRows"
      row-key="id"
      :locale="locale"
      :accessibility="{ label: 'Vue localization grid' }"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { OneGrid } from "@onegrid/vue";
import { localizationColumns, localizationRows } from "./data.js";

const locale = ref("ko-KR");
</script>
