<script setup lang="ts">
import { OneGrid } from "@onegrid/vue";
import { cspColumns, cspNonce, cspRows, cspTheme } from "./data";
</script>

<template>
  <OneGrid
    :columns="cspColumns"
    :data="cspRows"
    row-key="id"
    :theme="cspTheme"
    :security="{ csp: { nonce: cspNonce } }"
    :accessibility="{ label: 'Vue CSP locked grid' }"
  />
  <OneGrid
    :columns="cspColumns"
    :data="cspRows.slice(0, 1)"
    row-key="id"
    :theme="cspTheme"
    :security="{ csp: { disableStyleInjection: true } }"
    :accessibility="{ label: 'Vue CSP disabled style grid' }"
  />
</template>
