<script setup lang="ts">
import { watch } from 'vue';
import { usePageLoaderStore } from '../stores/pageLoader';

const pageLoader = usePageLoaderStore();

watch(
  () => pageLoader.isPageLoading,
  (isPageLoading) => {
    document.documentElement.classList.toggle('page-loading', isPageLoading);
  },
  { immediate: true },
);
</script>

<template>
  <div
    v-if="pageLoader.isPageLoading"
    class="page-loader-overlay"
    role="status"
    aria-live="polite"
    aria-busy="true"
  >
    <div class="page-loader-content">
      <img
        src="/icons/icon-192.png"
        alt=""
        width="56"
        height="56"
        class="page-loader-logo"
      />
      <div class="page-loader-spinner" aria-hidden="true" />
      <p class="page-loader-text">Cargando…</p>
    </div>
  </div>
</template>
