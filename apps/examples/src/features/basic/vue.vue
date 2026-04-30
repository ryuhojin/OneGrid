<script setup lang="ts">
import { OneGrid } from "@onegrid/vue";
import { basicColumns, basicRows } from "./data";
</script>

<template>
  <OneGrid :columns="basicColumns" :data="basicRows" row-model="client" />
</template>
